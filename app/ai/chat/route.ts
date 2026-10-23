import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson, withApi } from '@/src/lib/api';
import { env } from '@/src/lib/env';
import { logger } from '@/src/middlewares/logger';
import { runChat } from '@/src/services/chat/chatService';
import { businessContextSchema, type BusinessContextInput, resolveProfile } from '@/src/services/chat/profile';
import type { TopicContext } from '@/src/services/chat/prompt';
import { nicheField } from '@/src/validators/commonValidator';

const MAX_MESSAGE_LENGTH = 500;
const MAX_TOPIC_LENGTH = 120;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} exceeds the maximum allowed length of ${max} characters.`)
    .optional()
    .transform((value) => value || undefined);

/** `cardContext` may be a plain string ("Zero-Prep Micro Veneers") or `{ topic | title | name, description }`. */
const cardContextSchema = z.union([
  optionalText(MAX_TOPIC_LENGTH, 'cardContext'),
  z.object({
    topic: optionalText(MAX_TOPIC_LENGTH, 'cardContext.topic'),
    title: optionalText(MAX_TOPIC_LENGTH, 'cardContext.title'),
    name: optionalText(MAX_TOPIC_LENGTH, 'cardContext.name'),
    label: optionalText(MAX_TOPIC_LENGTH, 'cardContext.label'),
    description: optionalText(300, 'cardContext.description'),
  }),
]);

const schema = z
  .object({
    message: optionalText(MAX_MESSAGE_LENGTH, 'Message'),
    cardContext: cardContextSchema.optional(),
    selectedTopic: optionalText(MAX_TOPIC_LENGTH, 'selectedTopic'),
    topic: optionalText(MAX_TOPIC_LENGTH, 'topic'),
    businessContext: businessContextSchema.optional(),
    niche: nicheField,
    brandName: optionalText(80, 'brandName'),
    expertName: optionalText(80, 'expertName'),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant', 'model']).transform((role) => (role === 'user' ? ('user' as const) : ('assistant' as const))),
          content: z.string().trim().max(MAX_MESSAGE_LENGTH * 2, 'History message is too long.'),
        })
      )
      .max(40, 'History can contain at most 40 messages.')
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.message && !resolveTopic(value)) {
      ctx.addIssue({
        code: 'custom',
        path: ['message'],
        message: 'Provide a `message`, or a `cardContext` / `selectedTopic` when the visitor clicks a card.',
      });
    }
  });

type ChatPayload = z.infer<typeof schema>;

function resolveTopic(input: Pick<ChatPayload, 'cardContext' | 'selectedTopic' | 'topic'>): TopicContext | undefined {
  const card = input.cardContext;
  const fromCard = typeof card === 'string' ? card : card?.topic ?? card?.title ?? card?.name ?? card?.label;
  const topic = input.selectedTopic ?? fromCard ?? input.topic;
  if (!topic) return undefined;
  return { topic, description: typeof card === 'object' && card ? card.description : undefined };
}

/**
 * POST /ai/chat   (alias: POST /api/ai-chat)
 *
 * Universal, niche-agnostic AI concierge.
 *  - `message`           visitor text (optional when a card was clicked)
 *  - `cardContext` / `selectedTopic`  the card the visitor clicked; with no `message` the AI opens the conversation about it
 *  - `businessContext`   optional business facts (object or free text); defaults to the built-in profile for the `niche`
 *  - `niche`, `brandName`, `expertName`, `history`  as before
 *
 * Always answers 200 `{ success: true, reply, leadCaptured: false, data: {...} }` for a valid request: if the AI
 * provider is down, slow or rate limited a context-aware fallback reply is returned instead of an error.
 */
export const POST = withApi(async (request) => {
  const input = await parseJson(request, schema);
  const topic = resolveTopic(input);

  const clientContext = env.allowClientBusinessContext() ? (input.businessContext as BusinessContextInput | undefined) : undefined;
  const profile = resolveProfile({
    niche: input.niche,
    envContext: env.businessContextJson(input.niche),
    clientContext,
    brandName: input.brandName,
    expertName: input.expertName,
  });

  const result = await runChat({ profile, message: input.message, topic, history: input.history ?? [] });

  if (result.source === 'fallback') {
    logger.info('ai.chat.fallback_reply', { niche: profile.niche, reason: result.degradedReason, opener: !input.message });
  }

  // Stable top-level contract (`reply`, `leadCaptured`) for every landing page, plus the standard `data` envelope.
  return NextResponse.json({
    success: true,
    reply: result.reply,
    leadCaptured: false,
    data: {
      reply: result.reply,
      leadCaptured: false,
      source: result.source,
      ...(topic ? { topic: topic.topic } : {}),
    },
  });
});

/**
 * Handle CORS preflight (OPTIONS) requests from universal landing pages.
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
}