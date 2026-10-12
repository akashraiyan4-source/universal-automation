import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { GoogleGenAI } from '@google/genai';

const VoiceResponse = twilio.twiml.VoiceResponse;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
    try {
        let body: any = {};
        try {
            body = await request.json();
        } catch {
            const formData = await request.formData().catch(() => null);
            if (formData) {
                body = {
                    customerPhone: formData.get('To') || formData.get('customerPhone'),
                    niche: formData.get('niche'),
                    brandName: formData.get('brandName')
                };
            }
        }

        const { customerPhone, niche, brandName } = body;

        if (!customerPhone) {
            return NextResponse.json({ success: false, error: 'Customer phone is required for AI callback.' }, { status: 400 });
        }

        const cleanNiche = niche ? niche.trim().toLowerCase() : 'service';
        const brand = brandName || 'Our Enterprise Desk';
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        // ১. জেমিনি এআই দিয়ে মিসড কলের জন্য কাস্টম হিউম্যান-লাইক কনভারসেশন স্কিপ্ট বা মেসেজ জেনারেট করা
        const prompt = `Create a short, warm, and natural conversational greeting (1-2 sentences) from an AI assistant for a missed call callback. The business is "${brand}" in the "${cleanNiche}" niche. Acknowledge that we missed their live call and ask how we can assist them right now. No markdown.`;
        
        let aiGreeting = `Hello, this is the AI assistant from ${brand}. We noticed we missed your call regarding our ${cleanNiche} services. How can I help you today?`;
        
        try {
            const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            if (res.text) aiGreeting = res.text.trim();
        } catch (e) {
            console.error('AI text generation error:', e);
        }

        // ২. টুইলিও দিয়ে কাস্টমারের নম্বরে রিয়েল-টাইম আউটবাউন্ড কল ট্রিগার করা
        // এই TwiML-এর ভেতরে ElevenLabs বা Polly Neural ভয়েস দিয়ে এআই কথা বলাবে
        const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com'}/api/voice-agent-bridge/process-speech?niche=${encodeURIComponent(cleanNiche)}&brandName=${encodeURIComponent(brand)}`;

        const outboundCall = await twilioClient.calls.create({
            to: customerPhone,
            from: process.env.TWILIO_PHONE_NUMBER!,
            // Twilio কল রিসিভ করার সাথে সাথে এই TwiML এক্সিকিউট করবে
            twiml: `<Response><Say voice="Polly.Stephen-Neural">${aiGreeting}</Say><Gather input="speech" action="${callbackUrl}" method="POST" timeout="5" speechTimeout="auto" language="en-US"><Say voice="Polly.Stephen-Neural">Please let me know, what would you like to discuss?</Say></Gather></Response>`
        });

        console.log(`[AI Missed Call Callback] Outbound call triggered to ${customerPhone} (SID: ${outboundCall.sid})`);

        return NextResponse.json({
            success: true,
            message: 'AI missed call callback initiated successfully with instant phone call and voice bridge!',
            data: {
                callSid: outboundCall.sid,
                customerPhone,
                status: outboundCall.status
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('[AI Missed Call Callback Critical Error]:', error?.message || error);
        return NextResponse.json({ success: false, error: error?.message || 'Failed to trigger callback.' }, { status: 500 });
    }
}