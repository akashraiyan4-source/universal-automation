import { NextResponse } from 'next/server';
import { scoredLeadsDatabase } from '../../db';

// Enterprise-grade TypeScript Interface for Universal Lead Scoring Payload
interface ScoreLeadRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    phone?: string;
    treatment?: string;
    service?: string; // Universal fallback for non-dental niches
    budget?: string;
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: ScoreLeadRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { fullName, clientName, phone, treatment, service, budget, niche } = body;

        // ১. কঠোর ইনপুট ভ্যালিডেশন চেক
        const resolvedName = fullName || clientName;
        if (!resolvedName || typeof resolvedName !== 'string' || resolvedName.trim() === '' ||
            !phone || typeof phone !== 'string' || phone.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Full name/clientName and phone are required for lead scoring.' },
                { status: 400 }
            );
        }

        let score = 50; // বেস বা প্রাথমিক স্কোর
        let tier = 'Standard Lead';

        const cleanName = resolvedName.trim();
        const cleanPhone = phone.trim();
        const targetService = treatment || service || 'General Consultation';
        const cleanBudget = budget ? budget.trim() : 'Standard';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';

        // ২. ইউনিভার্সাল মাল্টি-নিশ হাই-ভ্যালু সার্ভিস বা ট্রিটমেন্ট লিস্ট
        const highValueServices = [
            // Dental
            'Porcelain Veneers', 'Dental Implants', 'Full Smile Makeover',
            // Solar
            'Commercial Solar', 'Full Residential Solar Array', 'Battery Backup Setup',
            // Roofing
            'Full Roof Replacement', 'Metal Roofing', 'Storm Damage Restoration',
            // Real Estate
            'Luxury Property Acquisition', 'Commercial Real Estate Portfolio'
        ];

        // ৩. ডাইনামিক স্কোর ক্যালকুলেশন ইঞ্জিন
        if (highValueServices.some(s => s.toLowerCase() === targetService.toLowerCase())) {
            score += 30;
        }

        if (cleanBudget.toLowerCase() === 'high' || cleanBudget.toLowerCase() === 'vip' || cleanBudget.toLowerCase() === 'enterprise') {
            score += 20;
        }

        if (score >= 80) {
            tier = '🔥 Tier 1: VIP High-Intent Lead';
        } else if (score >= 60) {
            tier = '⭐ Tier 2: Warm Lead';
        }

        const scoredLead = {
            id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: cleanName,
            phone: cleanPhone,
            serviceOrTreatment: targetService.trim(),
            budget: cleanBudget,
            niche: cleanNiche,
            score,
            tier,
            scoredAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(scoredLeadsDatabase)) {
            scoredLeadsDatabase.push(scoredLead);
        }

        console.log(`[Ultimate Universal Lead Scoring Engine] ${cleanName} scored ${score} in niche: ${cleanNiche} -> Classified as: ${tier}`);

        return NextResponse.json(
            {
                success: true,
                message: 'Universal lead successfully scored and segmented!',
                leadData: scoredLead
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Lead Scoring Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to score and segment lead. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}