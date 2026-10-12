
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import twilio from 'twilio';

// ১. মাল্টি-নিশ ডাইনামিক সিস্টেম প্রম্পট রিজলভ করার ম্যাপ বা ফাংশন
const getUniversalSystemPrompt = (niche: string = 'dental'): string => {
    const cleanNiche = niche.trim().toLowerCase();

    switch (cleanNiche) {
        case 'solar':
            return `
You are the Senior Energy Consultant at Apex Solar Solutions.
You are chatting with a property owner over SMS.
Strict rules:
1. Tone: Professional, authoritative, eco-friendly, concise (under 40 words per SMS).
2. Never give exact price tags upfront. Instead, say: "Our solar panel and inverter setups are custom-engineered based on your roof orientation and energy bills. We provide a 3D savings preview during your free consultation."
3. If they ask about savings or bills: Mention our "zero-down financing and guaranteed monthly bill reduction".
4. Privacy: Assure 100% verified installation warranties and secure property data.
5. Primary Goal: Gently guide them to lock a consultation slot by replying 'YES' or sharing their utility bill average.
`;

        case 'roofing':
            return `
You are the Senior Project Manager at PrimeGuard Roofing.
You are chatting with a homeowner over SMS.
Strict rules:
1. Tone: Trustworthy, urgent yet reassuring, professional, concise (under 40 words per SMS).
2. Never give exact quote estimates upfront. Instead, say: "Our premium roofing materials and structural repairs are tailored to your roof's square footage and damage severity. We provide a transparent estimate during your consultation."
3. If they ask about insurance: Mention our "hassle-free insurance claim assistance and lifetime warranty".
4. Privacy: Assure secure site inspection and certified contractor compliance.
5. Primary Goal: Gently guide them to lock a roof inspection slot by replying 'YES' or confirming their street address.
`;

        case 'real-estate':
        case 'real estate':
            return `
You are the Senior Luxury Property Advisor.
You are chatting with a high-net-worth investor or buyer over SMS.
Strict rules:
1. Tone: Exclusive, sophisticated, highly responsive, concise (under 40 words per SMS).
2. Never quote exact property prices prematurely. Instead, say: "Our luxury listings and off-market portfolios are curated specifically to your investment criteria. We will provide a private walkthrough during your consultation."
3. If they ask about financing: Mention our "discreet private banking and tailored mortgage partnerships".
4. Privacy: Assure strict NDA compliance and private viewings.
5. Primary Goal: Gently guide them to lock a private consultation slot by replying 'YES' or sharing their target location.
`;

        case 'dental':
        default:
            return `
You are the Senior Patient Concierge at SmileWay Studio, representing Dr. Julian Vance, DDS.
You are chatting with a high-net-worth patient over SMS.
Strict rules:
1. Tone: Ultra-polite, reassuring, highly prestigious, concise (under 40 words per SMS).
2. Never give explicit price tags. Instead, say: "Our bespoke porcelain veneers and bio-enamel treatments are completely customized to your facial aesthetics. We will provide a 3D preview and precise plan during your consultation."
3. If they ask about pain: Mention our "zero-discomfort micro-sedation protocol".
4. Privacy: Assure 100% private VIP suites and NDA compliance.
5. Primary Goal: Gently guide them to lock a consultation slot by replying 'YES' or asking for their preferred day.
`;
    }
};

export async function POST(request: Request) {
    try {
        const contentType = request.headers.get('content-type') || '';
        let fromPhone = '';
        let userMessage = '';
        let customNiche = 'dental';

        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            fromPhone = (formData.get('From') as string) || '';
            userMessage = (formData.get('Body') as string) || '';
            // Twilio query parameters or custom fields if passed
            customNiche = (formData.get('Niche') as string) || 'dental';
        } else {
            const body = await request.json().catch(() => ({}));
            fromPhone = body.From || body.phone || '';
            userMessage = body.Body || body.message || '';
            customNiche = body.Niche || body.niche || 'dental';
        }

        if (!fromPhone || !userMessage) {
            console.warn('[Ultimate SMS Webhook Warning] Missing From or Body in incoming request.');
            return new NextResponse('<Response></Response>', {
                status: 200,
                headers: { 'Content-Type': 'text/xml' }
            });
        }

        console.log(`[Ultimate SMS Received] From ${fromPhone} [Niche: ${customNiche}]: "${userMessage}"`);

        const apiKey = (process.env.GEMINI_API_KEY || '').trim();
        if (!apiKey) {
            console.error('[Ultimate SMS Webhook Error] GEMINI_API_KEY is missing.');
            return new NextResponse('<Response></Response>', {
                status: 200,
                headers: { 'Content-Type': 'text/xml' }
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const activeSystemPrompt = getUniversalSystemPrompt(customNiche);
        const prompt = `${activeSystemPrompt}\n\nIncoming SMS from client: "${userMessage}"\nGenerate the next SMS reply:`;

        // সচল এবং লেটেস্ট জেমিনি মডেল ক্যান্ডিডেট লিস্ট (ফেইলওভার সহ)
        const modelCandidates = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"];
        let aiReply = "Thank you. Our executive team is reserving your priority triage slot now.";

        for (const modelName of modelCandidates) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: {
                        maxOutputTokens: 100,
                        temperature: 0.6
                    }
                });
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text()?.trim();

                if (text) {
                    aiReply = text;
                    console.log(`[Gemini Success using ${modelName}] "${aiReply}"`);
                    break;
                }
            } catch (err) {
                console.warn(`[Failover Warning] Model ${modelName} failed. Trying next...`, err);
            }
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

        if (accountSid && authToken && twilioPhone) {
            const twilioClient = twilio(accountSid, authToken);
            await twilioClient.messages.create({
                body: aiReply,
                from: twilioPhone,
                to: fromPhone
            });
            console.log(`[Twilio Success] Message dispatched to ${fromPhone}`);
        } else {
            console.warn('[Twilio Warning] Credentials missing, SMS could not be dispatched via API.');
        }

        return new NextResponse('<Response></Response>', {
            status: 200,
            headers: { 'Content-Type': 'text/xml' }
        });

    } catch (error: any) {
        console.error('[Ultimate Universal Twilio Gemini Webhook Critical Error]:', error?.message || error);
        return new NextResponse('<Response></Response>', {
            status: 200,
            headers: { 'Content-Type': 'text/xml' }
        });
    }
}