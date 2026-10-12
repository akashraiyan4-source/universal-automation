import { NextResponse } from 'next/server';
import { loyaltyDatabase } from '../../db';

// Enterprise-grade TypeScript Interface for Universal Loyalty Payload
interface LoyaltyRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    phone?: string;
    actionType?: string;
    serviceAction?: string; // Universal fallback for non-dental niches
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: LoyaltyRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { fullName, clientName, phone, actionType, serviceAction, niche } = body;

        // ১. কঠোর ইনপুট ভ্যালিডেশন চেক
        const resolvedName = fullName || clientName;
        if (!resolvedName || typeof resolvedName !== 'string' || resolvedName.trim() === '' || 
            !phone || typeof phone !== 'string' || phone.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Full name/clientName and phone are required for loyalty points.' },
                { status: 400 }
            );
        }

        const cleanName = resolvedName.trim();
        const cleanPhone = phone.trim();
        const targetAction = actionType || serviceAction || 'General Service Visit';
        const cleanKey = targetAction.trim().toLowerCase();
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';

        // ২. ইউনিভার্সাল মাল্টি-নিশ পয়েন্ট ম্যাপিং ইঞ্জিন
        const pointsMap: Record<string, number> = {
            // Dental / Medical Actions
            'checkup': 50,
            'treatment': 150,
            'review': 100,
            // Universal / Referral Actions
            'referral': 200,
            'client_referral': 200,
            'solar_installation': 300,
            'roof_repair_completed': 250,
            'property_consultation': 150
        };

        const pointsEarned = pointsMap[cleanKey] || 50;
        const tier = pointsEarned >= 150 ? 'VIP Platinum Tier' : 'VIP Gold Tier';

        // ৩. ডাইনামিক ইউনিক লয়ালটি রেকর্ড তৈরি করা
        const record = {
            id: `loy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: cleanName,
            phone: cleanPhone,
            niche: cleanNiche,
            actionType: targetAction.trim(),
            pointsEarned,
            tier,
            updatedAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(loyaltyDatabase)) {
            loyaltyDatabase.push(record);
        }

        console.log(`[Ultimate Universal Loyalty Engine] Points added for ${cleanName} -> Action: ${targetAction} [Earned: ${pointsEarned}] in niche: ${cleanNiche}`);

        // ৪. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal loyalty points added successfully!',
                data: record
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Loyalty Engine Critical Error]:', error?.message || error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to add loyalty points due to server error.' },
            { status: 500 }
        );
    }
}