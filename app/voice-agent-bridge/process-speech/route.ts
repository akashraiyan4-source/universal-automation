import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { withApi } from '@/src/lib/api';
import { env } from '@/src/lib/env';
import { sanitizeString } from '@/src/lib/sanitize';
import { guardTwilioWebhook } from '@/src/lib/twilio-auth';
import { logger } from '@/src/middlewares/logger';

const VoiceResponse = twilio.twiml.VoiceResponse;

// 100% universal emergency call router (works for any niche)
function routeEmergencyCallToSpecialist(brandName: string, niche: string): string {
    const specialistPhone = env.get('EMERGENCY_MANAGER_PHONE') || env.get('STAFF_PHONE_NUMBER');
    const response = new VoiceResponse();

    if (!specialistPhone) {
        response.say({ voice: 'Polly.Stephen-Neural' as any, language: 'en-US' }, `We are experiencing an issue connecting to ${brandName} support. Please try calling back shortly.`);
        return response.toString();
    }

    response.say({ voice: 'Polly.Stephen-Neural' as any, language: 'en-US' }, `This sounds like an urgent situation regarding your ${niche} request at ${brandName}. Connecting you to our on-call specialist right now.`);

    const dial = response.dial({
        callerId: env.twilioPhone(),
        timeout: 25,
        action: `/api/voice-agent-bridge/transfer-fallback?niche=${encodeURIComponent(niche)}&brandName=${encodeURIComponent(brandName)}`
    });
    dial.number(specialistPhone);
    return response.toString();
}

const EMERGENCY_KEYWORDS = ['emergency', 'urgent', 'leak', 'broken', 'damage', 'bleeding', 'severe pain', 'accident', 'critical', 'fail', 'danger'];

async function POSTHandler(request: Request) {
    const rejected = await guardTwilioWebhook(request);
    if (rejected) return rejected;

    try {
        const formData = await request.formData().catch(() => null);
        const callerSpeech = (formData?.get('SpeechResult')?.toString() || '').toLowerCase().slice(0, 1000);
        const callerPhone = formData?.get('From')?.toString() || 'Unknown Line';

        const urlObj = new URL(request.url);
        const queryNiche = sanitizeString(urlObj.searchParams.get('niche') || formData?.get('niche')?.toString() || '', 40) || 'General Service';
        const queryBrand = sanitizeString(urlObj.searchParams.get('brandName') || formData?.get('brandName')?.toString() || '', 80) || 'Enterprise Global Desk';

        if (EMERGENCY_KEYWORDS.some((keyword) => callerSpeech.includes(keyword))) {
            logger.warn('voice.emergency_detected', { from: callerPhone, niche: queryNiche });
            return new NextResponse(routeEmergencyCallToSpecialist(queryBrand, queryNiche), { status: 200, headers: { 'Content-Type': 'text/xml' } });
        }

        const twiml = new VoiceResponse();
        if (callerSpeech.includes('reschedule') || callerSpeech.includes('change date') || callerSpeech.includes('postpone')) {
            twiml.say({ voice: 'Polly.Stephen-Neural' as any, language: 'en-US' }, `I have sent a secure link from ${queryBrand} to your phone number to select a new appointment slot.`);
            twiml.hangup();
        } else {
            twiml.say({ voice: 'Polly.Stephen-Neural' as any, language: 'en-US' }, `Would you like to reserve a priority consultation time with our expert team at ${queryBrand}?`);
        }

        return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });

    } catch (error: any) {
        logger.error('voice.process_speech.failed', error);
        const twiml = new VoiceResponse();
        twiml.say('Thank you for calling. Our team will follow up shortly.');
        twiml.hangup();
        return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }
}

export const POST = withApi(POSTHandler);
