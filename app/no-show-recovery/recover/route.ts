import { NextResponse } from 'next/server';
import { noShowDatabase } from '@/app/api/db';

// Enterprise-grade TypeScript Interface for Universal No-Show Recovery Payload
interface NoShowRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    phone?: string;
    missedAppointmentDate?: string;
    missedDate?: string; // Universal fallback
    serviceType?: string; // Universal fallback for non-dental niches
    niche?: string;
}

// মাল্টি-নিশ ডাইনামিক রিকভারি এসএমএস জেনারেটর
const getUniversalRecoveryMessage = (niche: string): string => {
    const cleanNiche = niche.trim().toLowerCase();

    if (cleanNiche.includes('solar')) {
        return 'SMS: We missed your solar consultation session! Reschedule your priority energy audit and 3D savings review here.';
    } else if (cleanNiche.includes('roofing')) {
        return 'SMS: We missed you for your roof inspection! Reschedule your priority assessment and quote estimate here.';
    } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
        return 'SMS: We missed your private property walkthrough! Reschedule your VIP investment tour here.';
    } else {
        return 'SMS: We missed your VIP visit! Reschedule your consultation and 3D preview here.';
    }
};

export async function POST(request: Request) {
    try {
        let body: NoShowRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { fullName, clientName, phone, missedAppointmentDate, missedDate, serviceType, niche } = body;

        // ১. ইনপুট ভ্যালিডেশন চেক
        const resolvedName = fullName || clientName;
        if (!resolvedName || typeof resolvedName !== 'string' || resolvedName.trim() === '' ||
            !phone || typeof phone !== 'string' || phone.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Full name/clientName and phone are required fields.' },
                { status: 400 }
            );
        }

        const cleanName = resolvedName.trim();
        const cleanPhone = phone.trim();
        const resolvedDate = missedAppointmentDate || missedDate || 'Recent';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';
        const targetService = serviceType || 'General Consultation';

        // ২. ডাইনামিক রিকভারি মেসেজ ও ট্র্যাকিং আইডি জেনারেট করা
        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();
        const recoveryActionText = getUniversalRecoveryMessage(cleanNiche);

        const recoveryTask = {
            id: `noshow_${nichePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: cleanName,
            phone: cleanPhone,
            niche: cleanNiche,
            serviceType: targetService.trim(),
            missedDate: resolvedDate.trim(),
            recoveryActionSent: recoveryActionText,
            status: 'Recovery Sequence Active',
            triggeredAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(noShowDatabase)) {
            noShowDatabase.push(recoveryTask);
        }

        console.log(`[Ultimate Universal No-Show Recovery] Recovery workflow initiated for ${cleanName} (${cleanPhone}) in niche: ${cleanNiche}`);

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal no-show recovery sequence successfully triggered!',
                data: recoveryTask
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal No-Show Recovery Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to process no-show recovery. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}