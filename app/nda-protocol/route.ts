import { NextResponse } from 'next/server';

// Enterprise-grade TypeScript Interface for Universal NDA Protocol Payload
interface NdaRequestBody {
    clientName?: string;
    name?: string; // Universal fallback
    email?: string;
    procedureType?: string;
    serviceType?: string; // Universal fallback for non-medical niches
    niche?: string;
}

export async function POST(req: Request) {
    try {
        let body: NdaRequestBody;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, message: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { clientName, name, email, procedureType, serviceType, niche } = body;

        // ১. ইনপুট ভ্যালিডেশন চেক
        const resolvedName = clientName || name;
        if (!resolvedName || typeof resolvedName !== 'string' || resolvedName.trim() === '' || 
            !email || typeof email !== 'string' || email.trim() === '') {
            return NextResponse.json(
                { success: false, message: 'Client name and email are required for secure NDA protocol.' },
                { status: 400 }
            );
        }

        const cleanName = resolvedName.trim();
        const cleanEmail = email.trim().toLowerCase();
        const targetService = procedureType || serviceType || 'Confidential Consultation & Project Scope';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';

        // ২. ডাইনামিক নিশ-বেসড সিকিউর এনডিএ লিংক এবং ট্র্যাকিং আইডি জেনারেট করা
        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();
        const ndaToken = `NDA-${nichePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const mockNdaLink = `https://secure-sign.mhadigitools.store/nda/${ndaToken}`;

        console.log(`[Ultimate Universal NDA Protocol] Strict confidentiality agreement initiated for ${cleanName} (${cleanEmail}) regarding "${targetService}" in niche: ${cleanNiche} [Token: ${ndaToken}]`);

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json({
            success: true,
            message: `Strict NDA and confidentiality protocol successfully initiated for ${cleanName}.`,
            data: {
                ndaToken,
                clientName: cleanName,
                email: cleanEmail,
                niche: cleanNiche,
                serviceOrProcedure: targetService.trim(),
                ndaLink: mockNdaLink,
                status: "NDA_SENT",
                initiatedAt: new Date().toISOString()
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('[Ultimate Universal NDA Protocol Critical Error]:', error?.message || error);
        return NextResponse.json(
            { 
                success: false, 
                message: error?.message || 'Internal Server Error during secure NDA protocol generation.' 
            }, 
            { status: 500 }
        );
    }
}