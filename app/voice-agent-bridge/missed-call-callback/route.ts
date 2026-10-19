import { z } from 'zod';
import twilio from 'twilio';
import { fail, ok, parseJson, withApi } from '@/src/lib/api';
import { env } from '@/src/lib/env';
import { checkInternalKey } from '@/src/lib/internal-auth';
import { kv } from '@/src/lib/kv';
import { maskPhone, normalizePhone } from '@/src/lib/sanitize';
import { escapeXml } from '@/src/lib/twilio-auth';
import { ApiError } from '@/src/middlewares/errorHandler';
import { logger } from '@/src/middlewares/logger';
import { generateReply, isAiConfigured, promptSafe } from '@/src/services/geminiService';
import { nicheField } from '@/src/validators/commonValidator';

const CALLBACK_COOLDOWN_SECONDS = 10 * 60;

const schema = z.object({
    customerPhone: z.string().trim().max(30),
    niche: nicheField,
    brandName: z.string().trim().max(80).optional(),
});

/**
 * POST /voice-agent-bridge/missed-call-callback   (alias: POST /api/missed-call-callback)
 * Places an outbound AI call. This spends money, so it is protected by INTERNAL_API_KEY,
 * validates the destination as E.164, de-duplicates per number, and XML-escapes all TwiML text.
 */
async function POSTHandler(request: Request) {
    const auth = checkInternalKey(request);
    if (!auth.ok) return fail(auth.error, auth.status);

    const input = await parseJson(request, schema);
    const customerPhone = normalizePhone(input.customerPhone);
    if (!customerPhone) throw new ApiError('A valid customer phone number is required for AI callback.', 400);

    const accountSid = env.twilioAccountSid();
    const authToken = env.twilioAuthToken();
    const fromNumber = env.twilioPhone();
    if (!accountSid || !authToken || !fromNumber) {
        throw new ApiError('Voice calling is not configured.', 503);
    }

    // One callback per number per 10 minutes – blocks repeat-dial abuse and accidental double triggers.
    const claimed = await kv.setIfAbsent(`callback:${customerPhone}`, 1, CALLBACK_COOLDOWN_SECONDS);
    if (!claimed) {
        throw new ApiError('A callback to this number was already triggered recently.', 429, undefined, { 'Retry-After': String(CALLBACK_COOLDOWN_SECONDS) });
    }

    const niche = promptSafe(input.niche.replace(/-/g, ' '), 'service', 40);
    const brand = promptSafe(input.brandName, 'Our Enterprise Desk');

    let aiGreeting = `Hello, this is the AI assistant from ${brand}. We noticed we missed your call regarding our ${niche} services. How can I help you today?`;
    if (isAiConfigured()) {
        try {
            aiGreeting = await generateReply({
                systemInstruction: `Create a short, warm, natural conversational greeting (1-2 sentences) from an AI assistant for a missed call callback for the business "${brand}" in the "${niche}" niche. Acknowledge that we missed their live call and ask how we can assist right now. Plain text only, no markdown.`,
                message: 'Write the greeting now.',
                maxOutputTokens: 120,
                timeoutMs: 6_000,
            });
        } catch (error) {
            logger.warn('voice.callback.ai_fallback', { reason: error instanceof Error ? error.message : 'unknown' });
        }
    }

    const baseUrl = (env.publicBaseUrl() ?? new URL(request.url).origin).replace(/\/$/, '');
    const speechUrl = `${baseUrl}/api/voice-agent-bridge/process-speech?niche=${encodeURIComponent(input.niche)}&brandName=${encodeURIComponent(brand)}`;
    const voice = 'Polly.Stephen-Neural';

    try {
        const call = await twilio(accountSid, authToken).calls.create({
            to: customerPhone,
            from: fromNumber,
            twiml: `<Response><Say voice="${voice}">${escapeXml(aiGreeting)}</Say><Gather input="speech" action="${escapeXml(speechUrl)}" method="POST" timeout="5" speechTimeout="auto" language="en-US"><Say voice="${voice}">Please let me know, what would you like to discuss?</Say></Gather></Response>`,
        });
        logger.info('voice.callback.placed', { to: maskPhone(customerPhone), sid: call.sid });
        return ok(
            { callSid: call.sid, customerPhone, status: call.status },
            { message: 'AI missed call callback initiated successfully.' }
        );
    } catch (error) {
        await kv.delete(`callback:${customerPhone}`); // allow a retry after a provider failure
        logger.error('voice.callback.failed', error);
        throw new ApiError('Failed to trigger callback.', 502);
    }
}

export const POST = withApi(POSTHandler);
