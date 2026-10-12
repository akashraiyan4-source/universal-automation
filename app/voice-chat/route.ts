import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, niche, brandName } = body;

        if (!message) {
            return NextResponse.json({ success: false, error: 'Message is required.' }, { status: 400 });
        }

        const cleanNiche = niche || 'general service';
        const brand = brandName || 'Enterprise Desk';

        // জেমিনি এআই ব্রেনের মাধ্যমে কনভারসেশনাল উত্তর জেনারেট করা
        const systemPrompt = `You are a helpful, polite, and conversational voice and chat assistant for a "${cleanNiche}" business named "${brand}". Keep your response concise, human-like, and direct (suitable to be read out loud or displayed in a live chat). User said: "${message}"`;

        const aiModelResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
        });

        const replyText = aiModelResponse.text ? aiModelResponse.text.trim() : 'I am here to help you with your inquiry.';

        return NextResponse.json({
            success: true,
            reply: replyText
        }, { status: 200 });

    } catch (error: any) {
        console.error('[Voice Chat API Error]:', error?.message || error);
        return NextResponse.json({ success: false, error: 'Failed to process voice chat.' }, { status: 500 });
    }
}
