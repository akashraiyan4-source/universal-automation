import { NextResponse } from 'next/server';
import twilio from 'twilio';

// ১. মাল্টি-নিশ ডাইনামিক ভয়েস মেসেজ, এসএমএস ও এআই এজেন্ট আইডি জেনারেটর
const getUniversalMissedCallContent = (niche: string = 'dental') => {
    const cleanNiche = niche.trim().toLowerCase();

    switch (cleanNiche) {
        case 'solar':
            return {
                voiceText: "Thank you for calling Apex Solar Solutions. We missed your live call, but an instant energy saving text has been sent to your mobile. We will get back to you shortly.",
                smsText: "Sorry we missed your call at Apex Solar Solutions! How can our energy consultants help you? Reply here or check your custom solar estimate online: https://mhadigitools.store",
                // চাইলে নিশের জন্য আলাদা এজেন্ট আইডি দিতে পারেন, না দিলে ডিফল্টটি নিবে
                agentId: process.env.RETELL_SOLAR_AGENT_ID || process.env.RETELL_AGENT_ID
            };
        case 'roofing':
            return {
                voiceText: "Thank you for calling PrimeGuard Roofing. We missed your call, but an instant project update text has been dispatched to your mobile. We will connect shortly.",
                smsText: "Sorry we missed your call at PrimeGuard Roofing! Need emergency repairs or an estimate? Reply here or visit: https://mhadigitools.store",
                agentId: process.env.RETELL_ROOFING_AGENT_ID || process.env.RETELL_AGENT_ID
            };
        case 'real-estate':
        case 'real estate':
            return {
                voiceText: "Thank you for calling our luxury property desk. We missed your live call, but a private concierge text has been sent to your mobile.",
                smsText: "Sorry we missed your call at our Luxury Property Desk! How can we assist your investment journey? Reply here or explore listings: https://mhadigitools.store",
                agentId: process.env.RETELL_REAL_ESTATE_AGENT_ID || process.env.RETELL_AGENT_ID
            };
        case 'dental':
        default:
            return {
                voiceText: "Thank you for calling SmileWay Studio Beverly Hills. We missed your call, but a concierge text has been sent to your mobile. We will get back to you shortly.",
                smsText: "Sorry we missed your call at Dr. Vance's clinic! How can our patient concierge help you right now? Reply here or book online: https://mhadigitools.store",
                agentId: process.env.RETELL_DENTAL_AGENT_ID || process.env.RETELL_AGENT_ID
            };
    }
};

export async function POST(request: Request) {
    try {
        const contentType = request.headers.get('content-type') || '';
        let callerPhone = '';
        let calledNumber = '';
        let customNiche = 'dental';

        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            callerPhone = (formData.get('From') as string) || '';
            calledNumber = (formData.get('To') as string) || '';
            // Twilio query parameters বা কাস্টম ফিল্ড থেকে নিশ রিট্রিভ করা
            customNiche = (formData.get('Niche') as string) || 'dental';
        } else {
            const body = await request.json().catch(() => ({}));
            callerPhone = body.From || body.callerPhone || '';
            calledNumber = body.To || body.calledNumber || '';
            customNiche = body.Niche || body.niche || 'dental';
        }

        // ইউনিভার্সাল ডাইনামিক নিশ কন্টেন্ট ও এআই এজেন্ট রিট্রিভ করা
        const content = getUniversalMissedCallContent(customNiche);

        // Twilio TwiXML রেসপন্স (কল রিসিভ করে সুন্দর মেসেজ বলে কেটে দেওয়া)
        const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say voice="alice">${content.voiceText}</Say>
                <Hangup/>
            </Response>`;

        // ভেরিয়েবল ডিফাইন করা
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = calledNumber || process.env.TWILIO_PHONE_NUMBER;

        // ইনস্ট্যান্ট টেক্সট-ব্যাক এসএমএস ট্রিগার লজিক
        if (callerPhone) {
            if (accountSid && authToken && twilioPhone) {
                try {
                    const client = twilio(accountSid, authToken);
                    await client.messages.create({
                        body: content.smsText,
                        from: twilioPhone,
                        to: callerPhone
                    });
                    console.log(`[Universal Missed-Call Engine Success] Text-back dispatched to: ${callerPhone} [Niche: ${customNiche}]`);
                } catch (twilioErr: any) {
                    console.error('[Universal Missed-Call Twilio SMS Error]:', twilioErr?.message || twilioErr);
                }
            } else {
                console.log(`[Universal Missed-Call Engine Success - Simulated] Text-back logged for: ${callerPhone} [Niche: ${customNiche}]`);
            }

            // ইউনিভার্সাল এআই ভয়েস এজেন্ট কল-ব্যাক ট্রিগার (Retell AI)
            const retellApiKey = process.env.RETELL_API_KEY;
            const targetAgentId = content.agentId; // নিশের ওপর ভিত্তি করে ডাইনামিক বা ডিফল্ট এজেন্ট আইডি

            if (retellApiKey && targetAgentId && twilioPhone) {
                try {
                    const aiCallResponse = await fetch('https://api.retellai.com/v2/create-phone-call', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${retellApiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            from_number: twilioPhone,
                            to_number: callerPhone,
                            retell_agent_id: targetAgentId,
                            metadata: {
                                niche: customNiche,
                                calledNumber: calledNumber,
                                source: "Universal Missed-Call Engine"
                            }
                        })
                    });

                    const aiCallData = await aiCallResponse.json();
                    console.log(`[AI Voice Agent Call-Back Triggered] Niche: ${customNiche}, Agent: ${targetAgentId}`, aiCallData);
                } catch (aiErr: any) {
                    console.error('[AI Voice Agent Call-Back Error]:', aiErr?.message || aiErr);
                }
            } else {
                console.log('[AI Voice Agent Call-Back Skipped: Missing Retell API keys or Agent ID]');
            }
        }

        // TwiXML হেডার সহ সফল রেসপন্স রিটার্ন করা
        return new NextResponse(twimlResponse, {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
            },
        });

    } catch (error: any) {
        console.error('[Universal Missed-Call Engine Critical Error]:', error?.message || error);
        
        // ক্র্যাশ রোধ করতে ফলব্যাক TwiXML রেসপন্স পাঠানো
        const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say>An error occurred, but we have securely logged your call.</Say>
            </Response>`;

        return new NextResponse(errorTwiml, {
            status: 200,
            headers: {
                'Content-Type': 'text/xml',
            },
        });
    }
}