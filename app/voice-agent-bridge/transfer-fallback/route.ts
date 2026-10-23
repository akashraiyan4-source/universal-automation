import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { withApi } from '@/src/lib/api';
import { sanitizeString } from '@/src/lib/sanitize';
import { guardTwilioWebhook } from '@/src/lib/twilio-auth';
import { logger } from '@/src/middlewares/logger';

const VoiceResponse = twilio.twiml.VoiceResponse;

async function POSTHandler(request: Request) {
    const rejected = await guardTwilioWebhook(request);
    if (rejected) return rejected;

    try {
        const urlObj = new URL(request.url);
        const queryBrand = sanitizeString(urlObj.searchParams.get('brandName') ?? '', 80) || 'our support team';
        const queryNiche = sanitizeString(urlObj.searchParams.get('niche') ?? '', 40) || 'service';

        const twiml = new VoiceResponse();
        twiml.say({
            voice: 'Polly.Stephen-Neural' as any,
            language: 'en-US'
        }, `The on-call specialist for ${queryBrand} is currently attending another client. We have logged your ${queryNiche} request and will call you back immediately. Goodbye.`);
        twiml.hangup();

        logger.info('voice.transfer_fallback', { brand: queryBrand, niche: queryNiche });
        return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });

    } catch (error: any) {
        logger.error('voice.transfer_fallback.failed', error);
        const twiml = new VoiceResponse();
        twiml.say({ voice: 'Polly.Stephen-Neural' as any, language: 'en-US' }, 'We are experiencing a temporary technical difficulty. We will follow up with you shortly. Goodbye.');
        twiml.hangup();
        return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }
}

export const POST = withApi(POSTHandler);

export { OPTIONS, HEAD } from '@/src/lib/preflight';
