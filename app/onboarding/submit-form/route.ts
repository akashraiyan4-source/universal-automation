import { NextResponse } from 'next/server';
import { onboardingDatabase } from '@/app/api/db';

// Enterprise-grade TypeScript Interface for Universal Onboarding Payload
interface OnboardingRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    name?: string;
    email?: string;
    phone?: string;
    niche?: string;
    [key: string]: any; // Allow any dynamic fields for universal flexibility
}

export async function POST(request: Request) {
    try {
        let body: OnboardingRequestBody;
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
                { success: false, error: 'Client name or full name is required for onboarding.' },
                { status: 400 }
            );
        }

        const cleanNiche = body.niche && typeof body.niche === 'string' ? body.niche.trim().toLowerCase() : 'enterprise / general';
        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();

        // ২. ডাইনামিক অনবোর্ডিং রেকর্ড তৈরি করা
        const record = {
            id: `onboard_${nichePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...body,
            niche: cleanNiche,
            onboardingStatus: 'Completed & Verified',
            submittedAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(onboardingDatabase)) {
            onboardingDatabase.push(record);
        }

        console.log(`[Ultimate Universal Onboarding API] New submission recorded for "${resolvedName.trim()}" in niche: ${cleanNiche} [ID: ${record.id}]`);

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal onboarding data successfully submitted and processed!',
                data: record
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Onboarding API Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to process onboarding. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}