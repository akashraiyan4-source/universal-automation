import { NextResponse } from 'next/server';
import { referralDatabase } from '@/app/api/db';

// Enterprise-grade TypeScript Interface for Universal Referral Payload
interface ReferralRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    name?: string;
    phone?: string;
    niche?: string;
    brandName?: string;
    apiKey?: string;
}

export async function POST(request: Request) {
    try {
        let body: ReferralRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { fullName, clientName, name, phone, niche } = body;

        // ১. কঠোর ইনপুট ভ্যালিডেশন চেক
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
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';

        // ২. ইউনিক নিশ-বেসড রেফারেল কোড এবং সিকিউর লিংক জেনারেট করা
        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();
        const namePrefix = cleanName.substring(0, 3).toUpperCase();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        
        const referralCode = `VIP-${nichePrefix}-${namePrefix}-${randomNum}`;
        const referralLink = `https://mhadigitools.store/referral?code=${referralCode}&niche=${cleanNiche}`;

        const referralRecord = {
            id: `ref_${nichePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: cleanName,
            phone: cleanPhone,
            niche: cleanNiche,
            referralCode,
            referralLink,
            rewardsEarned: 'Pending First Successful Referral',
            generatedAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(referralDatabase)) {
            referralDatabase.push(referralRecord);
        }

        console.log(`[Ultimate Universal Referral Engine] Generated referral link for ${cleanName} in niche: ${cleanNiche} -> Code: ${referralCode}`);

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal referral link and code successfully generated!',
                data: referralRecord
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Referral Engine Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to generate referral details. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}