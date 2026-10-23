import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { fail, withApi } from '@/src/lib/api';
import { env } from '@/src/lib/env';
import { checkInternalKey } from '@/src/lib/internal-auth';
import { maskPhone, normalizeNiche, normalizePhone, sanitizeString } from '@/src/lib/sanitize';
import { guardTwilioWebhook } from '@/src/lib/twilio-auth';
import { logger } from '@/src/middlewares/logger';
import { pickNicheValue } from '@/src/lib/niche';
import { protect } from '@/src/lib/resilience';
import { generateReply, isAiConfigured, promptSafe } from '@/src/services/geminiService';

const DEFAULT_REPLY = 'Thank you. Our executive team is reserving your priority triage slot now.';
const MAX_SMS_INPUT = 600;

// Niche personas for the SMS concierge. Unknown niches get a generic concierge built from the niche name,
// so adding a new landing page never requires a code change here.
const NICHE_PROMPTS: Record<string, string> = {
    solar: `
You are the Senior Energy Consultant at Apex Solar Solutions.
You are chatting with a property owner over SMS.
Strict rules:
1. Tone: Professional, authoritative, eco-friendly, concise (under 40 words per SMS).
2. Never give exact price tags upfront. Instead, say: "Our solar panel and inverter setups are custom-engineered based on your roof orientation and energy bills. We provide a 3D savings preview during your free consultation."
3. If they ask about savings or bills: Mention our "zero-down financing and guaranteed monthly bill reduction".
4. Privacy: Assure 100% verified installation warranties and secure property data.
5. Primary Goal: Gently guide them to lock a consultation slot by replying 'YES' or sharing their utility bill average.
`,
    roofing: `
You are the Senior Project Manager at PrimeGuard Roofing.
You are chatting with a homeowner over SMS.
Strict rules:
1. Tone: Trustworthy, urgent yet reassuring, professional, concise (under 40 words per SMS).
2. Never give exact quote estimates upfront. Instead, say: "Our premium roofing materials and structural repairs are tailored to your roof's square footage and damage severity. We provide a transparent estimate during your consultation."
3. If they ask about insurance: Mention our "hassle-free insurance claim assistance and lifetime warranty".
4. Privacy: Assure secure site inspection and certified contractor compliance.
5. Primary Goal: Gently guide them to lock a roof inspection slot by replying 'YES' or confirming their street address.
`,
    'real-estate': `
You are the Senior Luxury Property Advisor.
You are chatting with a high-net-worth investor or buyer over SMS.
Strict rules:
1. Tone: Exclusive, sophisticated, highly responsive, concise (under 40 words per SMS).
2. Never quote exact property prices prematurely. Instead, say: "Our luxury listings and off-market portfolios are curated specifically to your investment criteria. We will provide a private walkthrough during your consultation."
3. If they ask about financing: Mention our "discreet private banking and tailored mortgage partnerships".
4. Privacy: Assure strict NDA compliance and private viewings.
5. Primary Goal: Gently guide them to lock a private consultation slot by replying 'YES' or sharing their target location.
`,
    dental: `
You are the Senior Patient Concierge at SmileWay Studio, representing Dr. Julian Vance, DDS.
You are chatting with a high-net-worth patient over SMS.
Strict rules:
1. Tone: Ultra-polite, reassuring, highly prestigious, concise (under 40 words per SMS).
2. Never give explicit price tags. Instead, say: "Our bespoke porcelain veneers and bio-enamel treatments are completely customized to your facial aesthetics. We will provide a 3D preview and precise plan during your consultation."
3. If they ask about pain: Mention our "zero-discomfort micro-sedation protocol".
4. Privacy: Assure 100% private VIP suites and NDA compliance.
5. Primary Goal: Gently guide them to lock a consultation slot by replying 'YES' or asking for their preferred day.
`,
};

const getUniversalSystemPrompt = (niche: string): string => {
    const known = pickNicheValue(niche, NICHE_PROMPTS, '');
    if (known) return known;
    const label = promptSafe(niche.replace(/-/g, ' '), 'professional services', 40);
    return `
You are a Senior Client Concierge for a premium "${label}" business.
You are chatting with a prospective client over SMS.
Strict rules:
1. Tone: Professional, warm, reassuring, concise (under 40 words per SMS).
2. Never quote exact prices upfront; explain that every plan is tailored and a precise proposal is provided during the consultation.
3. Primary Goal: Gently guide them to lock a consultation slot by replying 'YES' or sharing their preferred day.
`;
};

const emptyTwiml = () => new NextResponse('<Response></Response>', { status: 200, headers: { 'Content-Type': 'text/xml' } });

/**
 * POST /gemini-concierge/webhook   (Twilio inbound-SMS webhook)
 * Twilio form posts are signature-verified; JSON triggers require INTERNAL_API_KEY.
 * Always replies with empty TwiML so Twilio never retries on our internal failures.
 */
async function POSTHandler(request: Request) {
    const isForm = (request.headers.get('content-type') || '').includes('application/x-www-form-urlencoded');

    if (isForm) {
        const rejected = await guardTwilioWebhook(request);
        if (rejected) return rejected;
    } else {
        const auth = checkInternalKey(request);
        if (!auth.ok) return fail(auth.error, auth.status);
    }

    try {
        let fromRaw = '';
        let userMessage = '';
        let rawNiche = 'general';

        if (isForm) {
            const formData = await request.formData();
            fromRaw = formData.get('From')?.toString() || '';
            userMessage = formData.get('Body')?.toString() || '';
            rawNiche = formData.get('Niche')?.toString() || new URL(request.url).searchParams.get('niche') || 'general';
        } else {
            const body = await request.json().catch(() => ({}));
            fromRaw = body.From || body.phone || '';
            userMessage = body.Body || body.message || '';
            rawNiche = body.Niche || body.niche || 'general';
        }

        const fromPhone = normalizePhone(fromRaw);
        userMessage = sanitizeString(String(userMessage), MAX_SMS_INPUT);
        if (!fromPhone || !userMessage) {
            logger.warn('sms.webhook.missing_fields');
            return emptyTwiml();
        }

        const niche = normalizeNiche(rawNiche, 'general');
        logger.info('sms.received', { from: maskPhone(fromPhone), niche });

        if (!isAiConfigured()) {
            logger.error('sms.webhook.no_ai_key');
            return emptyTwiml();
        }

        let aiReply = DEFAULT_REPLY;
        try {
            aiReply = await generateReply({
                systemInstruction: getUniversalSystemPrompt(niche),
                message: userMessage,
                maxOutputTokens: 100,
                temperature: 0.6,
                timeoutMs: 8_000,
            });
        } catch (error) {
            logger.warn('sms.ai_fallback', { reason: error instanceof Error ? error.message : 'unknown' });
        }

        const accountSid = env.twilioAccountSid();
        const authToken = env.twilioAuthToken();
        const twilioPhone = env.twilioPhone();

        if (accountSid && authToken && twilioPhone) {
            await protect({
                service: 'twilio',
                timeoutMs: 8_000,
                label: 'Twilio SMS reply',
                action: () => twilio(accountSid, authToken).messages.create({ body: aiReply, from: twilioPhone, to: fromPhone }),
            });
            logger.info('sms.reply_sent', { to: maskPhone(fromPhone), niche });
        } else {
            logger.warn('sms.twilio_not_configured');
        }

        return emptyTwiml();
    } catch (error) {
        logger.error('sms.webhook.failed', error);
        return emptyTwiml();
    }
}

export const POST = withApi(POSTHandler);

export { OPTIONS, HEAD } from '@/src/lib/preflight';
