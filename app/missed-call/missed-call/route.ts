import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { fail, withApi } from '@/src/lib/api';
import { fetchWithTimeout } from '@/src/lib/async';
import { env } from '@/src/lib/env';
import { checkInternalKey } from '@/src/lib/internal-auth';
import { kv } from '@/src/lib/kv';
import { maskPhone, normalizeNiche, normalizePhone } from '@/src/lib/sanitize';
import { guardTwilioWebhook } from '@/src/lib/twilio-auth';
import { logger } from '@/src/middlewares/logger';

const TEXT_BACK_COOLDOWN_SECONDS = 5 * 60;

interface MissedCallContent {
    voiceText: string;
    smsText: string;
}

// Niche copy. Any niche without an entry uses the default; the Retell agent id is resolved from the
// environment by convention (RETELL_<NICHE>_AGENT_ID → RETELL_AGENT_ID), so new niches need no code change.
const NICHE_CONTENT: Record<string, MissedCallContent> = {
    solar: {
        voiceText: 'Thank you for calling Apex Solar Solutions. We missed your live call, but an instant energy saving text has been sent to your mobile. We will get back to you shortly.',
        smsText: 'Sorry we missed your call at Apex Solar Solutions! How can our energy consultants help you? Reply here or check your custom solar estimate online: https://mhadigitools.store',
    },
    roofing: {
        voiceText: 'Thank you for calling PrimeGuard Roofing. We missed your call, but an instant project update text has been dispatched to your mobile. We will connect shortly.',
        smsText: 'Sorry we missed your call at PrimeGuard Roofing! Need emergency repairs or an estimate? Reply here or visit: https://mhadigitools.store',
    },
    'real-estate': {
        voiceText: 'Thank you for calling our luxury property desk. We missed your live call, but a private concierge text has been sent to your mobile.',
        smsText: 'Sorry we missed your call at our Luxury Property Desk! How can we assist your investment journey? Reply here or explore listings: https://mhadigitools.store',
    },
    dental: {
        voiceText: 'Thank you for calling SmileWay Studio Beverly Hills. We missed your call, but a concierge text has been sent to your mobile. We will get back to you shortly.',
        smsText: "Sorry we missed your call at Dr. Vance's clinic! How can our patient concierge help you right now? Reply here or book online: https://mhadigitools.store",
    },
};

const getUniversalMissedCallContent = (niche: string) => {
    const content = NICHE_CONTENT[niche] ?? NICHE_CONTENT.dental;
    const envKey = `RETELL_${niche.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_AGENT_ID`;
    return { ...content, agentId: env.get(envKey) ?? env.get('RETELL_AGENT_ID') };
};

const twiml = (body: string) =>
    new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
    });

/**
 * POST /missed-call/missed-call   (alias: POST /api/missed-call-webhook)
 * Twilio webhook (form-encoded, signature-verified) or an authenticated JSON trigger (INTERNAL_API_KEY).
 * Always answers Twilio with valid TwiML – failures are logged, never surfaced as 5xx to the caller.
 */
async function POSTHandler(request: Request) {
    const isForm = (request.headers.get('content-type') || '').includes('application/x-www-form-urlencoded');

    if (isForm) {
        const rejected = await guardTwilioWebhook(request);
        if (rejected) return rejected;
    } else {
        const auth = checkInternalKey(request);
        if (!auth.ok) return fail(auth.error, auth.status);
    }

    try {
        let callerRaw = '';
        let calledRaw = '';
        let rawNiche = 'dental';

        if (isForm) {
            const formData = await request.formData();
            callerRaw = formData.get('From')?.toString() || '';
            calledRaw = formData.get('To')?.toString() || '';
            rawNiche = formData.get('Niche')?.toString() || new URL(request.url).searchParams.get('niche') || 'dental';
        } else {
            const body = await request.json().catch(() => ({}));
            callerRaw = body.From || body.callerPhone || '';
            calledRaw = body.To || body.calledNumber || '';
            rawNiche = body.Niche || body.niche || 'dental';
        }

        const niche = normalizeNiche(rawNiche, 'dental');
        const callerPhone = normalizePhone(callerRaw);
        const content = getUniversalMissedCallContent(niche);

        const accountSid = env.twilioAccountSid();
        const authToken = env.twilioAuthToken();
        const twilioPhone = normalizePhone(calledRaw) ?? env.twilioPhone();

        // Only text back valid numbers, and at most once per number per cooldown window (anti SMS-pumping).
        if (callerPhone) {
            const firstContact = await kv.setIfAbsent(`missedcall:${callerPhone}`, 1, TEXT_BACK_COOLDOWN_SECONDS);

            if (firstContact) {
                if (accountSid && authToken && twilioPhone) {
                    try {
                        await twilio(accountSid, authToken).messages.create({ body: content.smsText, from: twilioPhone, to: callerPhone });
                        logger.info('missedcall.sms_sent', { to: maskPhone(callerPhone), niche });
                    } catch (error) {
                        logger.error('missedcall.sms_failed', error);
                    }
                } else {
                    logger.info('missedcall.sms_simulated', { to: maskPhone(callerPhone), niche });
                }

                const retellKey = env.retellKey();
                if (retellKey && content.agentId && twilioPhone) {
                    try {
                        const response = await fetchWithTimeout('https://api.retellai.com/v2/create-phone-call', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${retellKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                from_number: twilioPhone,
                                to_number: callerPhone,
                                retell_agent_id: content.agentId,
                                metadata: { niche, source: 'Universal Missed-Call Engine' },
                            }),
                        });
                        logger.info('missedcall.ai_callback', { niche, status: response.status });
                    } catch (error) {
                        logger.error('missedcall.ai_callback_failed', error);
                    }
                }
            } else {
                logger.info('missedcall.deduplicated', { to: maskPhone(callerPhone), niche });
            }
        }

        return twiml(`<Say voice="alice">${content.voiceText}</Say><Hangup/>`);
    } catch (error) {
        logger.error('missedcall.failed', error);
        return twiml('<Say>An error occurred, but we have securely logged your call.</Say>');
    }
}

export const POST = withApi(POSTHandler);
