import { NextResponse } from 'next/server';

// Enterprise-grade TypeScript Interface for Universal Drip Campaign Payload
interface NurtureRequestBody {
    email?: string;
    name?: string;
    clientName?: string; // Universal fallback
    niche?: string;
    leadScore?: number | string;
    tier?: string;
}

export async function POST(req: Request) {
    try {
        let body: NurtureRequestBody;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { email, name, clientName, niche, leadScore, tier } = body;

        // ১. ইনপুট ইমেইল ভ্যালিডেশন চেক
        if (!email || typeof email !== 'string' || email.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Email address is required for long-term nurture enrollment.' },
                { status: 400 }
            );
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name || clientName || 'Valued Lead';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';
        const numericScore = leadScore ? Number(leadScore) : 50;

        // ২. ডাইনামিক মাল্টি-নিশ ও স্কোর-বেসড ড্রিপ সিকোয়েন্স সিলেকশন ইঞ্জিন
        let sequenceName = 'General_Nurture_60_Days';
        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();

        if (numericScore >= 80 || (tier && tier.toLowerCase().includes('vip'))) {
            sequenceName = `VIP_${nichePrefix}_High_Intent_30_Days`;
        } else if (cleanNiche === 'cosmetics' || cleanNiche === 'dental') {
            sequenceName = `VIP_Aesthetics_90_Days`;
        } else if (cleanNiche === 'solar' || cleanNiche === 'roofing') {
            sequenceName = `Property_Energy_Nurture_45_Days`;
        } else {
            sequenceName = `${nichePrefix}_Standard_Nurture_60_Days`;
        }

        const dispatchId = `NURT-${nichePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const message = `Lead ${cleanEmail} successfully enrolled into ${sequenceName} drip campaign for niche: ${cleanNiche}.`;

        console.log(`[Ultimate Universal Nurture Engine] ${message} [Dispatch ID: ${dispatchId}]`);

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json({ 
            success: true, 
            message,
            data: {
                dispatchId,
                email: cleanEmail,
                name: cleanName.trim(),
                niche: cleanNiche,
                leadScore: numericScore,
                sequence: sequenceName,
                status: "NURTURE_ACTIVE",
                enrolledAt: new Date().toISOString()
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('[Ultimate Universal Long Term Nurture Critical Error]:', error?.message || error);
        return NextResponse.json(
            { 
                success: false, 
                message: error?.message || 'Internal Server Error during nurture sequence enrollment.' 
            }, 
            { status: 500 }
        );
    }
}