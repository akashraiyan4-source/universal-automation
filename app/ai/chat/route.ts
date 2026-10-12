import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AIRequestPayload {
    message?: string;
    niche?: string;
    brandName?: string;
    expertName?: string;
    history?: Array<{ role: string; content: string }>;
}

export async function POST(request: Request) {
    try {
        let body: AIRequestPayload;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload structure.' },
                { status: 400 }
            );
        }

        const rawMessage = body?.message || '';

        // ১. ইনপুট টাইপ ও স্যানিটেশন ভ্যালিডেশন
        if (typeof rawMessage !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Invalid message type format.' },
                { status: 400 }
            );
        }

        const message = rawMessage.trim();

        if (!message) {
            return NextResponse.json(
                { success: false, error: 'Message payload cannot be empty.' },
                { status: 400 }
            );
        }

        // ২. সিকিউরিটি লেন্থ চেক (সর্বোচ্চ ৫০০ ক্যারেক্টার)
        if (message.length > 500) {
            return NextResponse.json(
                { success: false, error: 'Message exceeds the maximum allowed length of 500 characters.' },
                { status: 400 }
            );
        }

        const niche = body?.niche?.trim() || 'multi-niche professional business';
        const brandName = body?.brandName?.trim() || 'Our Enterprise';
        const expertName = body?.expertName?.trim() || 'Senior Consultant';

        // ৩. একাধিক এপিআই কি রোটেশন ও ফলব্যাক অ্যারে
        const apiKeys = [
            process.env.GEMINI_API_KEY_1,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3,
            process.env.GEMINI_API_KEY
        ].filter(Boolean) as string[];

        if (apiKeys.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Critical: Gemini API keys are missing in environment configuration.' },
                { status: 500 }
            );
        }

        let aiResponseText = '';
        const systemInstruction = `You are an elite, highly professional human conversion specialist and receptionist at "${brandName}", operating in the "${niche}" sector. You work directly alongside ${expertName}.
User Message: "${message}"
Guidelines:
- Speak naturally and conversationally like a real human expert (1-2 concise sentences).
- Subtly guide the user toward booking a consultation or taking the next step.
- Never reveal that you are an AI, a language model, or a bot under any circumstances.`;

        // ৪. ফলব্যাক লুপ সহ জেমিনি এপিআই কল
        for (const key of apiKeys) {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const result = await model.generateContent(systemInstruction);
                const response = await result.response;
                aiResponseText = response.text()?.trim() || '';

                if (aiResponseText) {
                    break; // সফল রেসপন্স পেলে লুপ টার্মিনেট হবে
                }
            } catch (err) {
                // একটি কি ফেইল করলে পরবর্তীটিতে সুইচ করবে
                continue;
            }
        }

        if (!aiResponseText) {
            return NextResponse.json(
                { success: false, error: 'All available AI API keys failed to generate a response.' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                reply: aiResponseText
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Core AI API Critical Error]:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Internal server error in core AI processing pipeline.'
            },
            { status: 500 }
        );
    }
}