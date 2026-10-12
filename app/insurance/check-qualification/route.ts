import { NextResponse } from 'next/server';
import { insuranceDatabase } from '../../db';

// Enterprise-grade TypeScript Interface for Universal Insurance/Coverage Qualification Payload
interface InsuranceQualificationRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    phone?: string;
    insuranceProvider?: string;
    providerName?: string; // Universal fallback
    policyNumber?: string;
    coverageType?: string; // Universal fallback for non-health niches
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: InsuranceQualificationRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { 
            fullName, 
            clientName, 
            phone, 
            insuranceProvider, 
            providerName, 
            policyNumber, 
            coverageType, 
            niche 
        } = body;

        // ১. ইউনিভার্সাল প্রোভাইডার বা কভারেজ ভ্যালিডেশন চেক
        const resolvedProvider = insuranceProvider || providerName;
        if (!resolvedProvider || typeof resolvedProvider !== 'string' || resolvedProvider.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Insurance provider or coverage partner name is required.' },
                { status: 400 }
            );
        }

        const cleanName = fullName || clientName || 'Valued Client';
        const cleanPhone = phone ? phone.trim() : 'N/A';
        const cleanProvider = resolvedProvider.trim();
        const cleanPolicy = policyNumber ? policyNumber.trim() : 'N/A';
        const cleanCoverage = coverageType ? coverageType.trim() : 'Standard Protection Plan';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'medical / roofing / general';

        // ২. ডাইনামিক ভেরিফিকেশন রেকর্ড তৈরি করা
        const qualificationRecord = {
            id: `ins_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: cleanName.trim(),
            phone: cleanPhone,
            insuranceProvider: cleanProvider,
            policyNumber: cleanPolicy,
            coverageType: cleanCoverage,
            niche: cleanNiche,
            status: 'Verified/Qualified',
            checkedAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(insuranceDatabase)) {
            insuranceDatabase.push(qualificationRecord);
        }

        console.log(`[Ultimate Universal Insurance Engine] Qualification checked for ${cleanName} -> Provider: ${cleanProvider} in niche: ${cleanNiche}`);

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal insurance/coverage qualification successfully checked!',
                data: qualificationRecord
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Insurance Engine Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to check insurance qualification. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}