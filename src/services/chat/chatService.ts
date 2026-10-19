import { env } from '../../lib/env';
import { kv, type KeyValueStore } from '../../lib/kv';
import { sha256Hex } from '../../lib/idempotency';
import { logger } from '../../middlewares/logger';
import type { ChatTurn } from '../geminiService';
import { buildFallbackReply, type FallbackReason } from './fallback';
import type { BusinessProfile } from './profile';
import { buildOpenerTurn, buildSystemInstruction, cleanReply, type TopicContext } from './prompt';
import { classifyAiError, type ChatProvider, defaultProvider } from './provider';

/**
 * Orchestrates one concierge reply:
 *   opener cache → AI provider (low temperature, hard time budget) → smart context-aware fallback.
 * It never throws: callers always get a usable `reply`.
 */

export type ReplySource = 'ai' | 'cache' | 'fallback';

export interface ChatRequest {
  profile: BusinessProfile;
  message?: string;
  topic?: TopicContext;
  history: ChatTurn[];
}

export interface ChatResult {
  reply: string;
  source: ReplySource;
  /** Set when the reply came from the fallback handler. For logs/monitoring only. */
  degradedReason?: FallbackReason;
}

export interface ChatDependencies {
  provider?: ChatProvider;
  cache?: KeyValueStore;
}

const MAX_HISTORY_TURNS = 10;
const MAX_OUTPUT_TOKENS = 260;

function trimHistory(history: ChatTurn[]): ChatTurn[] {
  return history
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, 1000) }))
    .filter((turn) => turn.content)
    .slice(-MAX_HISTORY_TURNS);
}

async function openerCacheKey(request: ChatRequest): Promise<string> {
  const fingerprint = JSON.stringify([request.profile, request.topic?.topic, request.topic?.description]);
  return `chat:opener:${await sha256Hex(fingerprint)}`;
}

export async function runChat(request: ChatRequest, deps: ChatDependencies = {}): Promise<ChatResult> {
  const provider = deps.provider ?? defaultProvider();
  const cache = deps.cache ?? kv;
  const history = trimHistory(request.history);
  const { profile, topic } = request;
  const message = request.message?.trim() || undefined;
  const isOpener = !message && Boolean(topic);

  const fallback = (reason: FallbackReason): ChatResult => ({
    reply: buildFallbackReply({ profile, topic, message, history }),
    source: 'fallback',
    degradedReason: reason,
  });

  // Opener replies for the same card/profile are identical for every visitor, so serve them instantly from cache.
  const cacheTtl = env.chatOpenerCacheSeconds();
  const cacheable = isOpener && history.length === 0 && cacheTtl > 0;
  const cacheKey = cacheable ? await openerCacheKey(request) : undefined;
  if (cacheKey) {
    const cached = await cache.get<string>(cacheKey).catch(() => null);
    if (cached) return { reply: cached, source: 'cache' };
  }

  if (!provider.isConfigured()) return fallback('unconfigured');

  try {
    const raw = await provider.generate({
      systemInstruction: buildSystemInstruction(profile, topic),
      history,
      message: message ?? buildOpenerTurn(profile, topic as TopicContext),
      temperature: env.chatTemperature(),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      budgetMs: env.chatBudgetMs(),
    });

    const reply = cleanReply(raw);
    if (!reply) return fallback('empty');

    // Guard against a looping model: never send the exact same bubble twice in a row.
    const lastAssistant = [...history].reverse().find((turn) => turn.role === 'assistant')?.content;
    if (lastAssistant && lastAssistant.trim().toLowerCase() === reply.toLowerCase()) return fallback('empty');

    if (cacheKey) await cache.set(cacheKey, reply, cacheTtl).catch(() => undefined);
    return { reply, source: 'ai' };
  } catch (error) {
    const reason = classifyAiError(error);
    logger.warn('ai.chat.degraded', { reason, provider: provider.name, niche: profile.niche, opener: isOpener, message: error instanceof Error ? error.message.slice(0, 200) : undefined });
    return fallback(reason);
  }
}
