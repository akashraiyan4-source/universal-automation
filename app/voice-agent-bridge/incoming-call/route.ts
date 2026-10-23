import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { withApi } from '@/src/lib/api';
import { normalizeNiche, sanitizeString } from '@/src/lib/sanitize';
import { guardTwilioWebhook } from '@/src/lib/twilio-auth';
import { logger } from '@/src/middlewares/logger';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Niche-driven voice configuration. Unknown niches fall back to the generic concierge – no code change needed.
const NICHE_ROLES: Record<string, string> = {
    solar: 'your solar energy AI concierge. How can I assist you with your clean energy or solar savings today?',
    roofing: 'your roofing inspection and project concierge. How can I help you with your roof assessment today?',
    'real-estate': 'your luxury real estate AI concierge. How can I assist you with your property tour or portfolio inquiry today?',
};

const getUniversalVoiceConfig = (nicheParam?: string | null, brandParam?: string | null) => {
    const niche = normalizeNiche(nicheParam, 'general');
    const brand = sanitizeString(brandParam ?? '', 80) || 'Enterprise Global Concierge';
    const roleKey = Object.keys(NICHE_ROLES).find((key) => niche.includes(key));
    const role = (roleKey ? NICHE_ROLES[roleKey] : undefined) ?? 'your AI concierge. How can I help you with your VIP service needs today?';

    return {
        niche,
        greeting: `Thank you for calling ${brand}. I am Alex, ${role}`,
        actionUrl: `/api/voice-agent-bridge/process-speech?niche=${encodeURIComponent(niche)}&brandName=${encodeURIComponent(brand)}`,
        selfUrl: `/api/voice-agent-bridge/incoming-call?niche=${encodeURIComponent(niche)}&brandName=${encodeURIComponent(brand)}`,
    };
};

async function POSTHandler(request: Request) {
    const rejected = await guardTwilioWebhook(request);
    if (rejected) return rejected;

    try {
        const formData = await request.formData().catch(() => null);
        const callerPhone = formData?.get('From')?.toString() || 'Unknown Caller';
        const callSid = formData?.get('CallSid')?.toString() || 'Unknown SID';

        const urlObj = new URL(request.url);
        const queryNiche = urlObj.searchParams.get('niche') || formData?.get('niche')?.toString();
        const queryBrand = urlObj.searchParams.get('brandName') || formData?.get('brandName')?.toString();

        const voiceConfig = getUniversalVoiceConfig(queryNiche, queryBrand);
        logger.info('voice.incoming', { from: callerPhone, callSid, niche: voiceConfig.niche });

        const twiml = new VoiceResponse();
        const gather = twiml.gather({
            input: ['speech'] as any,
            action: voiceConfig.actionUrl,
            method: 'POST',
            timeout: 4,
            speechTimeout: 'auto',
            language: 'en-US'
        });

        gather.say({ voice: 'Polly.Stephen-Neural' as any, language: 'en-US' }, voiceConfig.greeting);
        twiml.redirect({ method: 'POST' }, voiceConfig.selfUrl);

        return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });

    } catch (error: any) {
        logger.error('voice.incoming.failed', error);
        const twiml = new VoiceResponse();
        twiml.say('We are experiencing technical difficulties. Please call back shortly.');
        return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }
}

export const POST = withApi(POSTHandler);

export { OPTIONS, HEAD } from '@/src/lib/preflight';
