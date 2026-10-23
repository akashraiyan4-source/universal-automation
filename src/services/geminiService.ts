import { GoogleGenAI } from '@google/genai';
import { withTimeout } from '../lib/async';
import { CircuitOpenError, circuitBreakers } from '../lib/circuit-breaker';
import { env } from '../lib/env';

/**
 * Thin, lazy wrapper around the Gemini SDK.
 *  - No client is constructed at import time (a missing key can never crash a cold start).
 *  - Supports key rotation: every configured key is tried in turn.
 *  - Hard timeout per attempt AND an optional total budget, so a hung upstream can never pin the function.
 *  - Fast mode: "thinking" is disabled on Gemini 2.5 Flash for low-latency conversational replies.
 */

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface GenerateOptions {
  systemInstruction: string;
  history?: ChatTurn[];
  message: string;
  maxOutputTokens?: number;
  temperature?: number;
  /** Timeout for a single upstream attempt. */
  timeoutMs?: number;
  /** Stop trying further keys once this much time has been spent in total. */
  totalBudgetMs?: number;
  /** Skip model "thinking" for speed (only applied to models that support disabling it). */
  fast?: boolean;
}

const clients = new Map<string, GoogleGenAI>();

function clientFor(apiKey: string): GoogleGenAI {
  let client = clients.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({ apiKey });
    clients.set(apiKey, client);
  }
  return client;
}

export const isAiConfigured = (): boolean => env.geminiKeys().length > 0;

/** Gemini requires the first turn to be `user` and prefers strictly alternating roles. */
function buildContents(history: ChatTurn[], message: string) {
  const turns: { role: 'user' | 'model'; text: string }[] = [];
  for (const turn of [...history, { role: 'user' as const, content: message }]) {
    const role = turn.role === 'user' ? 'user' : 'model';
    if (turns.length === 0 && role !== 'user') continue; // drop leading greeting
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text += `\n${turn.content}`;
    else turns.push({ role, text: turn.content });
  }
  return turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }));
}

/** Only Gemini 2.5 Flash(-Lite) accepts `thinkingBudget: 0`; other models would reject the request. */
const supportsThinkingOff = (model: string): boolean => /^gemini-2\.5-flash/i.test(model);

/** Returns the model reply, or throws if every key/attempt failed. */
export async function generateReply(options: GenerateOptions): Promise<string> {
  const keys = env.geminiKeys();
  if (keys.length === 0) throw new Error('AI provider is not configured');

  const startedAt = Date.now();
  const model = env.geminiModel();
  const perAttemptMs = options.timeoutMs ?? 12_000;

  let lastError: unknown;
  for (const key of keys) {
    const remaining = options.totalBudgetMs ? options.totalBudgetMs - (Date.now() - startedAt) : perAttemptMs;
    if (remaining < 800) break; // not enough time left for a meaningful attempt
    try {
      const response = await circuitBreakers.gemini.fire(() =>
        withTimeout(
          clientFor(key).models.generateContent({
            model,
            contents: buildContents(options.history ?? [], options.message),
            config: {
              systemInstruction: options.systemInstruction,
              maxOutputTokens: options.maxOutputTokens ?? 300,
              temperature: options.temperature ?? 0.7,
              ...(options.fast && supportsThinkingOff(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            },
          }),
          Math.min(perAttemptMs, remaining),
          'Gemini request'
        )
      );
      const text = response.text?.trim();
      if (text) return text;
      lastError = new Error('Empty AI response');
    } catch (error) {
      lastError = error;
      if (error instanceof CircuitOpenError) break; // fail fast – do not burn remaining keys
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All AI keys failed');
}

/** Strip characters that could be used to break out of a prompt template. */
export function promptSafe(value: string | undefined, fallback: string, max = 80): string {
  const cleaned = (value ?? '').replace(/["`\\\r\n{}<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return cleaned || fallback;
}
