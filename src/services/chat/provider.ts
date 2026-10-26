import { type ChatTurn, generateReply, isAiConfigured } from '../geminiService';
import type { FallbackReason } from './fallback';

/**
 * Provider abstraction for the concierge. Gemini is the built-in implementation; add another provider
 * (OpenAI, Anthropic, …) by implementing `ChatProvider` and passing it to `runChat` – no route changes needed.
 */

export interface ProviderRequest {
  systemInstruction: string;
  history: ChatTurn[];
  message: string;
  temperature: number;
  maxOutputTokens: number;
  budgetMs: number;
}

export interface ChatProvider {
  name: string;
  isConfigured(): boolean;
  generate(request: ProviderRequest): Promise<string>;
}

export const geminiProvider: ChatProvider = {
  name: 'gemini',
  isConfigured: isAiConfigured,
  generate: (request) =>
    generateReply({
      systemInstruction: request.systemInstruction,
      history: request.history,
      message: request.message,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      // Give each key up to 4 seconds so multiple keys can be tried within the 8.5s total budget
      timeoutMs: Math.min(4_000, Math.floor(request.budgetMs / 2)),
      totalBudgetMs: request.budgetMs,
      fast: true,
    }),
};

export const defaultProvider = (): ChatProvider => geminiProvider;

/** Map any upstream failure to a coarse reason for logging/metrics (never shown to the visitor). */
export function classifyAiError(error: unknown): FallbackReason {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/timed? ?out|timeout|aborted|deadline/i.test(message)) return 'timeout';
  if (/\b429\b|quota|rate.?limit|resource_exhausted|too many requests/i.test(message)) return 'rate_limited';
  if (/empty ai response/i.test(message)) return 'empty';
  if (/not configured/i.test(message)) return 'unconfigured';
  return 'error';
}