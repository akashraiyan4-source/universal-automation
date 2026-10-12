import { NextResponse } from 'next/server';
import { costEstimatorDatabase } from '@/app/api/db';

// Enterprise-grade TypeScript Interface for Universal Cost Estimation Payload
interface CostEstimateRequestBody {
    fullName?: string;
    phone?: string;
    symptom?: string;
    treatmentType?: string;
    serviceType?: string; // Universal fallback for non-dental niches
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: CostEstimateRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { fullName, phone, symptom, treatmentType, serviceType, niche } = body;

        // ১. ইনপুট ভ্যালিডেশন চেক (যেকোনো একটি সার্ভিস বা ট্রিটমেন্ট থাকতেই হবে)
        const targetService = treatmentType || serviceType;
        if (!targetService || typeof targetService !== 'string' || targetService.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Treatment type or service type is required for cost estimation.' },
                { status: 400 }
            );
        }

        const cleanService = targetService.trim().toLowerCase();
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'dental / general';

        let estimatedCost = '$150 - $400';
        let description = 'Standard examination, consultation, and baseline care.';

        // ২. ইউনিভার্সাল সুইচ-কেস লজিক (মাল্টি-নিশ ডাইনামিক প্রাইসিং সাপোর্টসহ)
        switch (cleanService) {
            // Dental Niche Services
            case 'dental implants':
            case 'implants':
                estimatedCost = '$1,500 - $3,000 per unit';
                description = 'Permanent titanium root replacement with custom aesthetic crown.';
                break;
            case 'porcelain veneers':
            case 'veneers':
                estimatedCost = '$800 - $1,500 per tooth';
                description = 'Custom-crafted ultra-thin shells to perfect smile aesthetics.';
                break;
            case 'teeth whitening':
            case 'whitening':
                estimatedCost = '$300 - $600';
                description = 'In-office professional advanced laser whitening session.';
                break;

            // Solar / Roofing / General Niche Fallback Services
            case 'solar installation':
            case 'solar panels':
                estimatedCost = '$12,000 - $25,000 estimated';
                description = 'Complete high-efficiency photovoltaic system setup and inverter.';
                break;
            case 'roofing replacement':
            case 'roof repair':
                estimatedCost = '$5,000 - $12,000 estimated';
                description = 'Full structural assessment, premium material overlay, and labor.';
                break;

            default:
                estimatedCost = '$200 - $500';
                description = `Professional tailored consultation and assessment for ${cleanService}.`;
        }

        const estimateRecord = {
            id: `est_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: fullName ? fullName.trim() : 'Valued Client',
            phone: phone ? phone.trim() : 'Not Provided',
            symptom: symptom ? symptom.trim() : 'General Inquiry',
            treatmentType: targetService.trim(),
            niche: cleanNiche,
            estimatedCost,
            description,
            calculatedAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(costEstimatorDatabase)) {
            costEstimatorDatabase.push(estimateRecord);
        }

        console.log(`[Ultimate Universal Cost Estimator] Estimate calculated for ${targetService} -> ${estimatedCost} in niche: ${cleanNiche}`);

        return NextResponse.json(
            {
                success: true,
                message: 'Universal cost estimate successfully generated!',
                data: estimateRecord
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Cost Estimator Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to generate cost estimate. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}