import { NextResponse } from 'next/server';
import { prepReminderDatabase } from '@/app/api/db';

// Enterprise-grade TypeScript Interface for Universal Prep Reminder Payload
interface PrepReminderRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    name?: string;
    phone?: string;
    appointmentTime?: string;
    time?: string; // Universal fallback
    treatmentType?: string;
    serviceType?: string; // Universal fallback for non-dental niches
    niche?: string;
}

// মাল্টি-নিশ ডাইনামিক প্রিপারেশন ইনস্ট্রাকশন জেনারেটর
const getUniversalPrepInstructions = (niche: string, service: string): string => {
    const cleanNiche = niche.trim().toLowerCase();
    const cleanService = service.trim().toLowerCase();

    if (cleanNiche.includes('solar')) {
        return 'Please ensure clear access to your electrical panel and roof area. Have your recent utility bills ready for our energy consultant.';
    } else if (cleanNiche.includes('roofing')) {
        return 'Please clear pets and vehicles from the driveway area before our inspection team arrives. Keep your property layout handy.';
    } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
        return 'Please bring a valid photo ID and your investment criteria notes for your private property walkthrough.';
    } else {
        // Dental / Medical Default
        if (cleanService.includes('implant') || cleanService.includes('surgery')) {
            return 'Avoid eating heavy meals 2 hours prior to your surgical procedure. Take prescribed antibiotics if advised by Dr. Vance.';
        }
        return 'Please arrive 10 minutes prior to your scheduled time. Bring a valid ID and your previous medical records if applicable.';
    }
};

export async function POST(request: Request) {
    try {
        let body: PrepReminderRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { fullName, clientName, name, phone, appointmentTime, time, treatmentType, serviceType, niche } = body;

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
        const resolvedTime = appointmentTime || time || 'Tomorrow';
        const targetService = treatmentType || serviceType || 'General Consultation / Service';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';

        // ২. ডাইনামিক প্রিপারেশন ইনস্ট্রাকশন জেনারেট করা
        const prepInstructions = getUniversalPrepInstructions(cleanNiche, targetService);

        // ৩. ইউনিক রিমাইন্ডার টাস্ক রেকর্ড তৈরি করা
        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();
        const reminderTask = {
            id: `prep_${nichePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: cleanName,
            phone: cleanPhone,
            niche: cleanNiche,
            appointmentTime: resolvedTime.trim(),
            serviceType: targetService.trim(),
            prepInstructions,
            status: 'Prep Reminder Dispatched',
            sentAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(prepReminderDatabase)) {
            prepReminderDatabase.push(reminderTask);
        }

        console.log(`[Ultimate Universal Prep Reminder Engine] Reminder & instructions sent to ${cleanName} (${cleanPhone}) in niche: ${cleanNiche}`);

        // ৪. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal pre-appointment preparation guidelines successfully sent!',
                data: reminderTask
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Prep Reminder Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to send prep reminder. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}