import { NextResponse } from 'next/server';
import { followUpDatabase } from '../../db';

// Enterprise-grade TypeScript Interface for Universal Follow-Up Payload
interface FollowUpRequestBody {
    fullName?: string;
    phone?: string;
    email?: string;
    sequenceStep?: string;
    step?: string; // Universal fallback
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: FollowUpRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { fullName, phone, email, sequenceStep, step, niche } = body;

        // ১. কঠোর ইনপুট ভ্যালিডেশন চেক
        if (!fullName || typeof fullName !== 'string' || fullName.trim() === '' || (!phone && !email)) {
            return NextResponse.json(
                { success: false, error: 'Full name and at least one contact method (phone or email) are required.' },
                { status: 400 }
            );
        }

        const cleanName = fullName.trim();
        const cleanPhone = phone && typeof phone === 'string' ? phone.trim() : 'N/A';
        const cleanEmail = email && typeof email === 'string' ? email.trim() : 'N/A';
        const targetStep = sequenceStep || step || 'Step 1 (24h Nurture Reminder)';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';

        // ২. ইউনিক ফলো-আপ রেকর্ড তৈরি করা
        const followUpTask = {
            id: `fol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            step: targetStep.trim(),
            niche: cleanNiche,
            status: 'Scheduled/Dispatched',
            timestamp: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(followUpDatabase)) {
            followUpDatabase.push(followUpTask);
        }

        console.log(`[Ultimate Universal Follow-Up Engine] Sequence triggered for ${cleanName} -> Step: ${targetStep} in niche: ${cleanNiche}`);

        return NextResponse.json(
            {
                success: true,
                message: 'Universal automated follow-up sequence successfully initiated!',
                task: followUpTask
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Follow-Up Engine Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to trigger follow-up sequence. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}