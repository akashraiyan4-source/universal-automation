import { NextResponse } from 'next/server';
import { recallDatabase } from '@/app/api/db';

// Enterprise-grade TypeScript Interface for Universal Recall Payload
interface RecallRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    name?: string;
    phone?: string;
    recallIntervalMonths?: number | string;
    serviceType?: string;
    niche?: string;
    [key: string]: any; // Allow any dynamic fields for universal flexibility
}

export async function POST(request: Request) {
    try {
        let body: RecallRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        // ১. ইউনিভার্সাল নাম বা ক্লায়েন্ট আইডেন্টিফায়ার ভ্যালিডেশন চেক
        const resolvedName = body.fullName || body.clientName || body.name;
        if (!resolvedName || typeof resolvedName !== 'string' || resolvedName.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Client name or full name is required for scheduling a recall.' },
                { status: 400 }
            );
        }

        const cleanNiche = body.niche && typeof body.niche === 'string' ? body.niche.trim().toLowerCase() : 'enterprise / general';
        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();

        // ২. ডাইনামিক রিকল শিডিউল রেকর্ড তৈরি করা
        const record = {
            id: `recall_${nichePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...body,
            niche: cleanNiche,
            recallStatus: 'Scheduled & Active',
            scheduledAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(recallDatabase)) {
            recallDatabase.push(record);
        }

        console.log(`[Ultimate Universal Recall Engine] Schedule created successfully for "${resolvedName.trim()}" in niche: ${cleanNiche} [ID: ${record.id}]`);

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal recall schedule successfully created and logged!',
                data: record
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Recall Engine Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to schedule recall. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}