import { NextResponse } from 'next/server';

// Enterprise-grade TypeScript Interface for Universal Pre-Screening Payload
interface ConsultationPayload {
    clientName?: string;
    procedureInterest?: string;
    goalsDescription?: string;
    phone?: string;
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: ConsultationPayload;
        try {
            body = await request.json();
        } catch {
            body = {};
        }

        const { clientName, procedureInterest, goalsDescription, phone, niche } = body;

        // ১. কঠোর ইনপুট ভ্যালিডেশন চেক
        if (
            !clientName || typeof clientName !== 'string' || clientName.trim() === '' ||
            !phone || typeof phone !== 'string' || phone.trim() === '' ||
            !procedureInterest || typeof procedureInterest !== 'string' || procedureInterest.trim() === ''
        ) {
            return NextResponse.json({ 
                success: false, 
                error: 'Missing or invalid required pre-screening parameters (clientName, phone, procedureInterest).' 
            }, { status: 400 });
        }

        const cleanName = clientName.trim();
        const cleanPhone = phone.trim();
        const cleanInterest = procedureInterest.trim();
        const cleanGoals = goalsDescription && typeof goalsDescription === 'string' ? goalsDescription.trim() : 'Not provided';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'general business';

        // ২. ডাইনামিক প্রিফিক্স ও ডাটা জেনারেশন (নিশ অনুযায়ী পরিবর্তনশীল)
        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();
        const screeningId = `${nichePrefix}-SCR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        console.log(`[Ultimate Universal Screening Engine] Pre-screen generated for ${cleanName} (${cleanPhone}) in niche: ${cleanNiche}`);

        return NextResponse.json({
            success: true,
            statusCode: 200,
            message: `Universal ${cleanNiche} consultation pre-screen generated successfully.`,
            data: {
                screeningId,
                clientName: cleanName,
                phone: cleanPhone,
                procedureInterest: cleanInterest,
                goalsDescription: cleanGoals,
                niche: cleanNiche,
                suitabilityScore: 'High Potential Lead',
                recommendedNextStep: 'Schedule Direct Consultation or Expert Call',
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('[Ultimate Universal Screening Engine Critical Error]:', error?.message || error);
        return NextResponse.json({ 
            success: false, 
            error: error?.message || 'Failed to process consultation pre-screen.' 
        }, { status: 500 });
    }
}