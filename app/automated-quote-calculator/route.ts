import { NextResponse } from 'next/server';

// Enterprise-grade TypeScript Interface for Universal Quote Payload
interface QuoteRequestBody {
    squareFeet?: number | string;
    unitSize?: number | string; // Universal fallback for non-roofing niches
    materialType?: string;
    tierType?: string; // Universal tier fallback (e.g., standard, premium, luxury)
    damageSeverity?: string;
    complexityFactor?: string;
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: QuoteRequestBody;
        try {
            body = await request.json();
        } catch {
            body = {};
        }

        const { 
            squareFeet, 
            unitSize, 
            materialType, 
            tierType, 
            damageSeverity, 
            complexityFactor, 
            niche 
        } = body;

        // ১. ইউনিভার্সাল সাইজ বা স্কয়ার ফিট ভ্যালিডেশন চেক
        const targetSize = Number(squareFeet || unitSize);
        if (!targetSize || isNaN(targetSize) || targetSize <= 0) {
            return NextResponse.json(
                { success: false, error: 'Valid squareFeet or unitSize is required for quote estimation.' }, 
                { status: 400 }
            );
        }

        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'roofing / general';
        const cleanMaterial = materialType && typeof materialType === 'string' ? materialType.trim().toLowerCase() : (tierType || 'standard');
        const cleanSeverity = damageSeverity && typeof damageSeverity === 'string' ? damageSeverity.trim() : (complexityFactor || 'Normal');

        // ২. ইউনিভার্সাল ও ফ্লেক্সিবল এন্টারপ্রাইজ প্রাইসিং অ্যালগরিদম
        let baseRate = 4.5;
        if (cleanMaterial === 'metal' || cleanMaterial === 'premium' || cleanMaterial === 'commercial') {
            baseRate = 8.5;
        } else if (cleanMaterial === 'solar' || cleanMaterial === 'luxury') {
            baseRate = 12.0;
        }

        const multiplier = (cleanSeverity === 'High' || cleanSeverity === 'Complex') ? 1.3 : 1.0;
        const estimatedCostUSD = Math.round(targetSize * baseRate * multiplier);

        // ৩. ইউনিক কোটেশন রেফারেন্স আইডি জেনারেট করা
        const quoteRefId = `EST-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        console.log(`[Ultimate Universal Quote Engine] Estimate generated for size: ${targetSize} in niche: ${cleanNiche} [Ref: ${quoteRefId}]`);

        // ৪. পারফেক্ট JSON রেসপন্স রিটার্ন করা
        return NextResponse.json({
            success: true,
            message: 'Universal enterprise estimate generated successfully.',
            data: {
                quoteRefId,
                niche: cleanNiche,
                inputSize: targetSize,
                materialOrTier: cleanMaterial,
                severityOrComplexity: cleanSeverity,
                estimatedCostUSD,
                currency: 'USD',
                validityDays: 30,
                generatedAt: new Date().toISOString()
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('[Ultimate Universal Quote Engine Critical Error]:', error?.message || error);
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to generate quote estimation due to server error.' 
            }, 
            { status: 500 }
        );
    }
}