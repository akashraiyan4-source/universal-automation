import { NextResponse } from 'next/server';
import { faqDatabase } from '@/app/api/db';

// Enterprise-grade TypeScript Interface for Universal FAQ Payload
interface FaqRequestBody {
    question?: string;
    userPhone?: string;
    phone?: string; // Universal fallback
    niche?: string;
    brandName?: string;
}

// মাল্টি-নিশ ডাইনামিক এফএকিউ অ্যানসার জেনারেটর ইঞ্জিন
const getUniversalFaqAnswer = (lowerQ: string, niche: string): string => {
    const cleanNiche = niche.trim().toLowerCase();

    // ১. লোকেশন বা ঠিকানা সম্পর্কিত প্রশ্ন
    if (lowerQ.includes('location') || lowerQ.includes('address') || lowerQ.includes('where')) {
        if (cleanNiche.includes('solar')) {
            return 'Our primary solar consultation office and showroom are located in a central accessible commercial hub with ample parking.';
        } else if (cleanNiche.includes('roofing')) {
            return 'Our roofing operations and dispatch center are centrally located to provide emergency services across the entire region.';
        } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
            return 'Our luxury real estate advisory lounge is situated in a prime commercial district. Private appointments are available upon request.';
        } else {
            return 'Our practice is located in a prime accessible area with convenient parking facilities.';
        }
    } 
    // ২. খরচ বা প্রাইসিং সম্পর্কিত প্রশ্ন
    else if (lowerQ.includes('cost') || lowerQ.includes('price') || lowerQ.includes('fee') || lowerQ.includes('estimate')) {
        if (cleanNiche.includes('solar')) {
            return 'Solar system costs depend on your energy consumption and roof size. We offer free custom 3D energy estimates and financing options starting at $0 down.';
        } else if (cleanNiche.includes('roofing')) {
            return 'Roof inspection and estimates are completely free. Repair costs vary depending on the scope and materials needed for your project.';
        } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
            return 'Property consultation is complimentary for qualified investors. Listing and commission fees are structured competitively based on property value.';
        } else {
            return 'Consultation fees start at an affordable range, and specific service costs depend on individual client assessments.';
        }
    } 
    // ৩. ওয়ারেন্টি, গ্যারান্টি বা নিরাপত্তা সম্পর্কিত প্রশ্ন
    else if (lowerQ.includes('warranty') || lowerQ.includes('guarantee') || lowerQ.includes('safe') || lowerQ.includes('pain')) {
        if (cleanNiche.includes('solar')) {
            return 'All our solar installations come with an industry-leading 25-year performance warranty and full maintenance coverage.';
        } else if (cleanNiche.includes('roofing')) {
            return 'We provide a solid workmanship warranty along with manufacturer guarantees on all premium roofing materials used.';
        } else {
            return 'Our services are performed by certified professionals using modern techniques to ensure a completely secure and seamless experience.';
        }
    } 
    // ৪. ডিফল্ট বা জেনারেল উত্তর
    else {
        if (cleanNiche.includes('solar')) {
            return 'We are open Monday through Saturday to assist with your solar savings, battery storage, and clean energy needs. Feel free to book a consultation!';
        } else if (cleanNiche.includes('roofing')) {
            return 'Our emergency roofing and inspection team is available all week. Feel free to request a quick estimate!';
        } else {
            return 'We are open Saturday through Thursday from 10:00 AM to 8:00 PM. Feel free to book a consultation with our expert team!';
        }
    }
};

export async function POST(request: Request) {
    try {
        let body: FaqRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { question, userPhone, phone, niche } = body;

        // ইনপুট ভ্যালিডেশন
        if (!question || typeof question !== 'string' || question.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Question is required for FAQ bot.' },
                { status: 400 }
            );
        }

        const cleanQuestion = question.trim();
        const resolvedPhone = userPhone || phone || 'Anonymous';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';
        const lowerQ = cleanQuestion.toLowerCase();

        // ডাইনামিক উত্তর জেনারেট করা
        const answer = getUniversalFaqAnswer(lowerQ, cleanNiche);

        const nichePrefix = cleanNiche.substring(0, 3).toUpperCase();
        const faqRecord = {
            id: `faq_${nichePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            userPhone: resolvedPhone.trim(),
            niche: cleanNiche,
            question: cleanQuestion,
            answer,
            askedAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(faqDatabase)) {
            faqDatabase.push(faqRecord);
        }

        console.log(`[Ultimate Universal Smart FAQ Bot] Question answered for niche: ${cleanNiche} -> "${cleanQuestion}"`);

        return NextResponse.json(
            {
                success: true,
                message: 'Universal FAQ query successfully processed!',
                data: faqRecord
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Smart FAQ Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to process FAQ query. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}