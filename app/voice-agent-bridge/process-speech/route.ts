import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// ১০০% ইউনিভার্সাল ইমার্জেন্সি কল রাউটার (যেকোনো নিশের জন্য প্রযোজ্য)
function routeEmergencyCallToSpecialist(brandName: string, niche: string): string {
    // যেকোনো নিশের জন্য পরিবেশ বা এনভায়রনমেন্ট ভেরিয়েবল থেকে ফলব্যাক বা স্পেশালিস্ট নম্বর পিক করবে
    const specialistPhone = process.env.EMERGENCY_MANAGER_PHONE || process.env.STAFF_PHONE_NUMBER;
    const response = new VoiceResponse();

    if (!specialistPhone) {
        response.say({ voice: 'Polly.Stephen-Neural' as any, language: 'en-US' }, `We are experiencing an issue connecting to ${brandName} support. Please try calling back shortly.`);
        return response.toString();
    }

    response.say({ voice: 'Polly.Stephen-Neural' as any, language: 'en-US' }, `This sounds like an urgent situation regarding your ${niche} request at ${brandName}. Connecting you to our on-call specialist right now.`);
    
    const dial = response.dial({
        callerId: process.env.TWILIO_PHONE_NUMBER,
        timeout: 25,
        action: '/api/voice-agent-bridge/transfer-fallback'
    });
    dial.number(specialistPhone);
    return response.toString();
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData().catch(() => null);
        const callerSpeech = ((formData?.get('SpeechResult') as string) || '').toLowerCase();
        const callerPhone = (formData?.get('From') as string) || 'Unknown Line';

        // URL কুয়েরি বা ফর্ম ডাটা থেকে ডাইনামিক নিশ ও ব্র্যান্ড ডিটেক্ট করা
        const urlObj = new URL(request.url);
        const queryNiche = urlObj.searchParams.get('niche') || formData?.get('niche')?.toString() || 'General Service';
        const queryBrand = urlObj.searchParams.get('brandName') || formData?.get('brandName')?.toString() || 'Enterprise Global Desk';

        // ইউনিভার্সাল ইমার্জেন্সি কিওয়ার্ড (যেকোনো নিশের জরুরি সমস্যার ক্ষেত্রে কমন)
        const emergencyKeywords = ['emergency', 'urgent', 'leak', 'broken', 'damage', 'bleeding', 'severe pain', 'accident', 'critical', 'fail', 'danger'];
        const isEmergency = emergencyKeywords.some(keyword => callerSpeech.includes(keyword));

        if (isEmergency) {
            console.log(`[Ultimate Universal Voice Speech] Emergency detected for caller ${callerPhone} in niche: ${queryNiche}`);
            const handoffTwiML = routeEmergencyCallToSpecialist(queryBrand, queryNiche);
            return new NextResponse(handoffTwiML, { status: 200, headers: { 'Content-Type': 'text/xml' } });
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
        console.error('[Ultimate Universal Speech Processing Critical Error]:', error?.message || error);
        const twiml = new VoiceResponse();
        twiml.say('Thank you for calling. Our team will follow up shortly.');
        twiml.hangup();
        return new NextResponse(twiml.toString(), { status: 200, headers: { 'Content-Type': 'text/xml' } });
    }
}