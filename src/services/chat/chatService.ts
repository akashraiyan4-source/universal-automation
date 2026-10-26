import { env } from '../../lib/env';
import { kv, type KeyValueStore } from '../../lib/kv';
import { sha256Hex } from '../../lib/idempotency';
import { logger } from '../../middlewares/logger';
import type { ChatTurn } from '../geminiService';
import { buildFallbackReply, type FallbackReason } from './fallback';
import type { BusinessProfile } from './profile';
import { buildOpenerTurn, buildSystemInstruction, cleanReply, type TopicContext } from './prompt';
import { classifyAiError, type ChatProvider, defaultProvider } from './provider';

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

    const lastAssistant = [...history].reverse().find((turn) => turn.role === 'assistant')?.content;
    if (lastAssistant && lastAssistant.trim().toLowerCase() === reply.toLowerCase()) return fallback('empty');

    if (cacheKey) await cache.set(cacheKey, reply, cacheTtl).catch(() => undefined);
    return { reply, source: 'ai' };
  } catch (error) {
    const reason = classifyAiError(error);
    const errText = error instanceof Error ? error.message.slice(0, 300) : String(error);
    // Prints the exact error right in the main log message so you never have to expand meta!
    logger.warn(`ai.chat.degraded | reason=${reason} | err=${errText}`, {
      reason,
      provider: provider.name,
      niche: profile.niche,
      opener: isOpener,
    });
    return fallback(reason);
  }
}