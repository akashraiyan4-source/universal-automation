import { NextResponse } from 'next/server';
import { multilanguageLogs } from '@/app/api/db';

// Enterprise-grade TypeScript Interface for Universal Multi-Language Payload
interface MultilanguageRequestBody {
    userMessage?: string;
    preferredLanguage?: string;
    language?: string; // Universal fallback
    niche?: string;
}

// মাল্টি-নিশ ও মাল্টি-ল্যাঙ্গুয়েজ ডাইনামিক রেসপন্স জেনারেটর ইঞ্জিন
const getUniversalLocalizedResponse = (lang: string, niche: string): string => {
    const cleanNiche = niche.trim().toLowerCase();

    if (lang === 'bn' || lang === 'bengali') {
        if (cleanNiche.includes('solar')) {
            return 'আমাদের সোলার সলিউশনে যোগাযোগ করার জন্য আপনাকে ধন্যবাদ। আজ আপনার প্রপার্টিতে সোলার প্যানেল ইনস্টলেশন বা সেভিংস সম্পর্কে আমরা কীভাবে সাহায্য করতে পারি?';
        } else if (cleanNiche.includes('roofing')) {
            return 'আমাদের রুফিং সার্ভিসে যোগাযোগ করার জন্য ধন্যবাদ। আজ আপনার ছাদের মেরামত বা এস্টিমেট নিয়ে আমরা কীভাবে সাহায্য করতে পারি?';
        } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
            return 'আমাদের লাক্সারি প্রপার্টি ডেস্কে যোগাযোগ করার জন্য ধন্যবাদ। আপনার বিনিয়োগ বা প্রপার্টি খোঁজার কাজে আমরা কীভাবে সাহায্য করতে পারি?';
        } else {
            return 'আমাদের প্র্যাকটিসে যোগাযোগ করার জন্য আপনাকে ধন্যবাদ। আজ আপনার সেবায় আমরা কীভাবে সাহায্য করতে পারি?';
        }
    } else if (lang === 'es' || lang === 'spanish') {
        if (cleanNiche.includes('solar')) {
            return 'Gracias por contactarnos en Soluciones Solares. ¿Cómo podemos ayudarle hoy con su sistema de paneles solares y ahorros energéticos?';
        } else if (cleanNiche.includes('roofing')) {
            return 'Gracias por contactar a nuestro servicio de techado. ¿Cómo podemos ayudarle con reparaciones o estimaciones hoy?';
        } else {
            return 'Gracias por contactarnos. ¿Cómo podemos ayudarle con sus necesidades de servicio hoy?';
        }
    } else {
        // Default English Enterprise Responses per Niche
        if (cleanNiche.includes('solar')) {
            return 'Thank you for contacting our solar energy desk. How can we assist you with your property energy savings and setup today?';
        } else if (cleanNiche.includes('roofing')) {
            return 'Thank you for contacting our roofing team. How can we assist you with your roof inspection or repair estimate today?';
        } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
            return 'Thank you for contacting our luxury real estate desk. How can we assist you with your property investment goals today?';
        } else {
            return 'Thank you for contacting our practice. How can we assist you with your service needs today?';
        }
    }
};

export async function POST(request: Request) {
    try {
        let body: MultilanguageRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { userMessage, preferredLanguage, language, niche } = body;

        // ১. ইনপুট ভ্যালিডেশন চেক
        if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'User message is required for multi-language processing.' },
                { status: 400 }
            );
        }

        const cleanMessage = userMessage.trim();
        const resolvedLang = preferredLanguage || language || 'en';
        const lang = resolvedLang.toLowerCase().trim();
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';

        // ২. ডাইনামিক লোকালয়েজড রেসপন্স তৈরি করা
        const localizedResponse = getUniversalLocalizedResponse(lang, cleanNiche);

        const translationRecord = {
            id: `ml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            originalMessage: cleanMessage,
            detectedLanguage: lang,
            niche: cleanNiche,
            synthesizedResponse: localizedResponse,
            processedAt: new Date().toISOString()
        };

        // সেন্ট্রাল ডেটাবেজে লগ রাখার ব্যবস্থা (নিরাপদ ট্রাই-ক্যাচসহ)
        try {
            if (typeof multilanguageLogs !== 'undefined' && Array.isArray(multilanguageLogs)) {
                multilanguageLogs.push(translationRecord);
            }
        } catch (dbError) {
            console.warn('[Ultimate Multi-Language DB Warning]: Could not push to central log database, proceeding with response.');
        }

        console.log(`[Ultimate Universal Multi-Language Engine] Processed message for language: ${lang} in niche: ${cleanNiche}`);

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal multi-language support response successfully synthesized!',
                data: translationRecord
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Multi-Language Critical Error]:', error?.message || error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Failed to process multi-language request. Please try again later.' 
            }, 
            { status: 500 }
        );
    }
}