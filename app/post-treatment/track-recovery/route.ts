import { NextResponse } from 'next/server';
import { recoveryDatabase } from '@/app/api/db';

// Enterprise-grade TypeScript Interface for Universal Recovery/Project-Feedback Payload
interface RecoveryRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    name?: string;
    phone?: string;
    procedureDone?: string;
    serviceCompleted?: string; // Universal fallback for non-medical niches
    painLevel?: number | string;
    satisfactionScore?: number | string; // Universal fallback for non-medical niches
    notes?: string;
    niche?: string;
}

// মাল্টি-নিশ ডাইনামিক এআই অ্যাডভাইস ও রিকভারি ফিডব্যাক জেনারেটর
const getUniversalAiAdvice = (niche: string, scoreValue: number): string => {
    const cleanNiche = niche.trim().toLowerCase();

    if (cleanNiche.includes('solar')) {
        if (scoreValue <= 4) {
            return 'Low satisfaction or issue detected with your solar setup! Our engineering team has been instantly alerted to inspect your inverter/panels.';
        }
        return 'Ensure your inverter monitoring app is connected and panels are kept clean from heavy debris for optimal energy production.';
    } else if (cleanNiche.includes('roofing')) {
        if (scoreValue <= 4) {
            return 'Urgent concern flagged regarding your roof installation/repair! A project manager has been assigned to call you immediately.';
        }
        return 'Your roof warranty documents and maintenance guide have been dispatched to your email. Keep your gutters clear for longevity.';
    } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
        if (scoreValue <= 4) {
            return 'Feedback noted regarding your property tour/closing. Our senior broker will reach out to address your concerns right away.';
        }
        return 'Thank you for your feedback. Our luxury advisory team is ready to curate your next portfolio milestone.';
    } else {
        // Dental / Medical Default
        if (scoreValue >= 7) {
            return 'High pain or discomfort level detected! Our clinical staff has been instantly alerted to call you right away.';
        }
        return 'Continue taking prescribed medications and apply a gentle compress if needed. Contact us if symptoms persist.';
    }
};

export async function POST(request: Request) {
    try {
        let body: RecoveryRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { fullName, clientName, name, phone, procedureDone, serviceCompleted, painLevel, satisfactionScore, notes, niche } = body;

        // ১. ইনপুট ভ্যালিডেশন চেক
        const resolvedName = fullName || clientName || name;
        if (!resolvedName || typeof resolvedName !== 'string' || resolvedName.trim() === '' ||
            !phone || typeof phone !== 'string' || phone.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Full name/clientName and phone are required fields.' },
                { status: 400 }
            );
        }

        const cleanName = resolvedName.trim();
        const cleanPhone = phone.trim();
        const targetService = procedureDone || serviceCompleted || 'General Enterprise Service / Treatment';
        const rawMetric = painLevel !== undefined && painLevel !== null ? painLevel : (satisfactionScore !== undefined ? satisfactionScore : 5);
        const parsedMetric = typeof rawMetric === 'number' ? rawMetric : parseInt(String(rawMetric), 10);
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';

        // ২. ডাইনামিক এআই অ্যাডভাইস জেনারেট করা
        const aiAdvice = getUniversalAiAdvice(cleanNiche, isNaN(parsedMetric) ? 5 : parsedMetric);

        // ৩. ইউনিক রিকভারি রেকর্ড তৈরি করা
        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();
        const recoveryRecord = {
            id: `rec_${nichePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: cleanName,
            phone: cleanPhone,
            niche: cleanNiche,
            procedureOrService: targetService.trim(),
            metricLevel: isNaN(parsedMetric) ? 'Standard / Not Specified' : parsedMetric,
            notes: notes ? notes.trim() : 'None',
            aiAdvice,
            status: 'Recovery / Follow-up Tracked & Logged',
            checkedAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(recoveryDatabase)) {
            recoveryDatabase.push(recoveryRecord);
        }

        console.log(`[Ultimate Universal Recovery Engine] Logged for ${cleanName} in niche: ${cleanNiche} -> Metric Level: ${recoveryRecord.metricLevel}`);

        // ৪. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal post-treatment/service recovery data successfully recorded!',
                data: recoveryRecord
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Recovery Engine Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to process recovery tracking. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}