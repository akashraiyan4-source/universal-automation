import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// মাল্টি-নিশ ডাইনামিক ভয়েস গ্রিটিংস ও কনসিয়ার্জ কনফিগারেশন জেনারেটর
const getUniversalVoiceConfig = (nicheParam?: string, brandParam?: string) => {
    const cleanNiche = nicheParam ? nicheParam.trim().toLowerCase() : 'enterprise';
    const brand = brandParam || 'Enterprise Global Concierge';

    if (cleanNiche.includes('solar')) {
        return {
            greeting: `Thank you for calling ${brand}. I am Alex, your solar energy AI concierge. How can I assist you with your clean energy or solar savings today?`,
            actionUrl: '/api/voice-agent-bridge/process-speech?niche=solar'
        };
    } else if (cleanNiche.includes('roofing')) {
        return {
            greeting: `Thank you for calling ${brand}. I am Alex, your roofing inspection and project concierge. How can I help you with your roof assessment today?`,
            actionUrl: '/api/voice-agent-bridge/process-speech?niche=roofing'
        };
    } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
        return {
            greeting: `Thank you for calling ${brand}. I am Alex, your luxury real estate AI concierge. How can I assist you with your property tour or portfolio inquiry today?`,
            actionUrl: '/api/voice-agent-bridge/process-speech?niche=real-estate'
        };
    } else {
        return {
            greeting: `Thank you for calling ${brand}. I am Alex, your AI concierge. How can I help you with your VIP service needs today?`,
            actionUrl: '/api/voice-agent-bridge/process-speech?niche=general'
        };
    }
};

export async function POST(request: Request) {
    try {
        const formData = await request.formData().catch(() => null);
        const callerPhone = formData?.get('From') || 'Unknown Caller';
        const callSid = formData?.get('CallSid') || 'Unknown SID';
        
        // URL থেকে বা ফর্ম ডাটা থেকে নিশ ও ব্র্যান্ড ডিটেক্ট করা
        const urlObj = new URL(request.url);
        const queryNiche = urlObj.searchParams.get('niche') || formData?.get('niche')?.toString();
        const queryBrand = urlObj.searchParams.get('brandName') || formData?.get('brandName')?.toString();

        console.log(`[Ultimate Voice Agent Bridge] Live inbound call received from ${callerPhone} (SID: ${callSid}) [Niche: ${queryNiche || 'default'}]`);

        const voiceConfig = getUniversalVoiceConfig(queryNiche, queryBrand);
        const twiml = new VoiceResponse();

        const gather = twiml.gather({
            input: ['speech'] as any,
            action: voiceConfig.actionUrl,
            method: 'POST',
            timeout: 4,
            speechTimeout: 'auto',
            language: 'en-US'
        });

        gather.say({
            voice: 'Polly.Stephen-Neural' as any,
            language: 'en-US'
        }, voiceConfig.greeting);

        twiml.redirect({
            method: 'POST'
        }, `/api/voice-agent-bridge/incoming-call${queryNiche ? `?niche=${queryNiche}` : ''}`);

        return new NextResponse(twiml.toString(), {
            status: 200,
            headers: { 'Content-Type': 'text/xml' }
        });

    } catch (error: any) {
        console.error('[Ultimate Inbound Voice Critical Error]:', error?.message || error);
        const twiml = new VoiceResponse();
        twiml.say('We are experiencing technical difficulties. Please call back shortly.');
        
        return new NextResponse(twiml.toString(), {
            status: 200,
            headers: { 'Content-Type': 'text/xml' }
        });
    }
}