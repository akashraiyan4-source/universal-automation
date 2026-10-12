import { NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: Request) {
    try {
        // URL কুয়েরি বা ফর্ম ডাটা থেকে ডাইনামিক ব্র্যান্ড বা নিশ ডিটেক্ট করা
        const urlObj = new URL(request.url);
        const queryBrand = urlObj.searchParams.get('brandName') || 'our support team';
        const queryNiche = urlObj.searchParams.get('niche') || 'service';

        const twiml = new VoiceResponse();
        
        // ১00% ইউনিভার্সাল ডাইনামিক ফলব্যাক মেসেজ
        twiml.say({
            voice: 'Polly.Stephen-Neural' as any,
            language: 'en-US'
        }, `The on-call specialist for ${queryBrand} is currently attending another client. We have logged your ${queryNiche} request and will call you back immediately. Goodbye.`);
        
        twiml.hangup();

        console.log(`[Ultimate Universal Voice Transfer Fallback] Handled unanswered call for Brand: ${queryBrand} [Niche: ${queryNiche}]`);

        return new NextResponse(twiml.toString(), {
            status: 200,
            headers: { 'Content-Type': 'text/xml' }
        });

    } catch (error: any) {
        console.error('[Ultimate Universal Fallback Critical Error]:', error?.message || error);
        
        const twiml = new VoiceResponse();
        twiml.say({ voice: 'Polly.Stephen-Neural' as any, language: 'en-US' }, 'We are experiencing a temporary technical difficulty. We will follow up with you shortly. Goodbye.');
        twiml.hangup();

        return new NextResponse(twiml.toString(), {
            status: 200,
            headers: { 'Content-Type': 'text/xml' }
        });
    }
}