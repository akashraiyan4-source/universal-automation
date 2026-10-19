import { z } from 'zod';

/**
 * Business knowledge for the AI concierge.
 *
 * Layers (later wins, arrays are replaced rather than merged):
 *   1. generic skeleton derived from `niche`
 *   2. built-in profile for niches we ship a landing page for (currently: dental)
 *   3. server-side override: env `<NICHE>_BUSINESS_CONTEXT` (JSON), e.g. SOLAR_BUSINESS_CONTEXT, REAL_ESTATE_BUSINESS_CONTEXT
 *   4. per-request `businessContext` sent by the landing page (can be disabled with AI_ALLOW_CLIENT_BUSINESS_CONTEXT=false)
 *   5. legacy per-request `brandName` / `expertName`
 *
 * => a new landing page (solar, roofing, medspa, real estate …) needs no backend code: only a `niche` and either
 *    an env JSON or a `businessContext` object in the payload.
 */

const text = (max: number) => z.string().trim().max(max);

const serviceSchema = z.object({
  name: text(100).min(1),
  summary: text(500).optional(),
  price: text(100).optional(),
  keywords: z.array(text(40)).max(12).optional(),
});

export const businessContextObjectSchema = z.object({
  brandName: text(80).optional(),
  businessName: text(80).optional(),
  expertName: text(80).optional(),
  expertTitle: text(80).optional(),
  industry: text(80).optional(),
  tagline: text(200).optional(),
  location: text(200).optional(),
  address: text(200).optional(),
  phone: text(40).optional(),
  hours: text(240).optional(),
  workingHours: text(240).optional(),
  pricingGuidelines: text(700).optional(),
  pricing: text(700).optional(),
  bookingOptions: text(500).optional(),
  tone: text(200).optional(),
  notes: text(1500).optional(),
  highlights: z.array(text(260)).max(12).optional(),
  services: z.array(serviceSchema).max(16).optional(),
});

/** Accepts either a structured object or a free-text description of the business. */
export const businessContextSchema = z.union([
  text(1500).transform((notes) => ({ notes })),
  businessContextObjectSchema,
]);

export type BusinessContextInput = z.infer<typeof businessContextObjectSchema>;

export interface ServiceInfo {
  name: string;
  summary: string;
  price?: string;
  keywords: string[];
}

export interface BusinessProfile {
  niche: string;
  brandName: string;
  expertName: string;
  expertTitle: string;
  industry: string;
  tagline?: string;
  location?: string;
  phone?: string;
  hours?: string;
  pricingGuidelines: string;
  bookingOptions: string;
  tone: string;
  notes?: string;
  highlights: string[];
  services: ServiceInfo[];
}

/** Remove characters that could break out of the prompt template and collapse whitespace. */
export function cleanText(value: string | undefined, max: number): string {
  return (value ?? '').replace(/["`\\{}<>]/g, ' ').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// ── Built-in profiles ────────────────────────────────────────────────────────

/**
 * Facts below are taken from the SmileWay Studio landing page. Hours are an editable default –
 * override with DENTAL_BUSINESS_CONTEXT or `businessContext.hours`.
 */
const DENTAL_PROFILE: Omit<BusinessProfile, 'niche'> = {
  brandName: 'SmileWay Studio',
  expertName: 'Dr. Julian Vance',
  expertTitle: 'Chief Cosmetic Dentist (DDS)',
  industry: 'luxury cosmetic & aesthetic dentistry',
  tagline: 'Architectural smile design and porcelain art in Beverly Hills',
  location: '9400 Wilshire Blvd, Beverly Hills, CA 90212',
  phone: '(555) 234-7890',
  hours: 'Monday to Friday 8:00 AM to 6:00 PM, Saturday by priority appointment',
  pricingGuidelines:
    'Every smile plan is fully custom, so exact fees are confirmed after the digital smile scan during a consultation. ' +
    'Never quote dollar amounts that are not listed in this knowledge. Mention 0% APR monthly installments and concierge insurance ' +
    'advocacy, and explain that a Priority Smile Triage consultation is the fastest way to get an exact figure.',
  bookingOptions:
    'Priority Smile Triage consultation with Dr. Julian Vance (a limited number of priority slots are released each week). ' +
    'Visitors can book with the form on this page, pick a date and time right here in the chat, or call (555) 234-7890.',
  tone: 'warm, refined, reassuring and concise, like a five-star concierge',
  highlights: [
    'Rated 4.9 by 380+ verified Beverly Hills patients',
    'AACD accredited, ADA member, Top Doctor 2026, Invisalign Diamond provider',
    'Zero waiting rooms, private VIP suites, dedicated rear valet access',
    'Every full-arch restoration and handcrafted porcelain set is backed by a 10-Year Structural Warranty',
  ],
  services: [
    {
      name: 'Zero-Prep Micro Veneers',
      summary:
        'Our bio-enamel micro-veneers are ultra-thin and need zero aggressive drilling or dentin reduction, so 100% of your natural tooth structure is preserved while the bond stays seamless and long-lasting.',
      keywords: ['zero-prep', 'zero prep', 'micro veneer', 'micro-thin', 'micro thin', 'no drilling', 'shaving', 'reversible', 'bio-enamel', 'bio enamel', 'case #481'],
    },
    {
      name: 'Handcrafted Porcelain Veneers',
      summary:
        'Each porcelain set is handcrafted on-site by our master ceramists for natural shade matching and a bespoke, camera-ready finish, with no outsourcing delays.',
      keywords: ['porcelain', 'veneer', 'handcrafted', 'ceramic', 'shade', 'case #710', 'ceramic artistry', 'veneers patient'],
    },
    {
      name: 'Micro-Enamel Bio-Seal',
      summary: 'A protective bio-enamel finish that reinforces the surface of your teeth for a smooth, natural-looking and long-lasting shine.',
      keywords: ['bio-seal', 'bio seal', 'micro-enamel', 'micro enamel', 'enamel'],
    },
    {
      name: 'Full Arch Smile Alignment',
      summary:
        'A complete full-arch redesign that balances your bite and smile symmetry, planned digitally first and finished in handcrafted ceramic, backed by our 10-Year Structural Warranty.',
      keywords: ['full arch', 'full-arch', 'alignment', 'symmetry', 'bite', 'case #512', 'case #825', 'harmony'],
    },
    {
      name: 'Priority Smile Triage',
      summary:
        'A direct, senior-level cosmetic triage with Dr. Vance: we assess your goals, map your bite and outline your best options. Priority triage slots are limited each week, so early booking is recommended.',
      keywords: ['priority', 'triage', 'same-day', 'same day', 'slot', 'consultation', 'dr. julian', 'dr julian', 'vance', 'doctor'],
    },
    {
      name: '10-Year Structural Warranty',
      summary:
        'Every full-arch restoration and handcrafted porcelain set is backed by our comprehensive 10-Year Structural Warranty, covering chipping, fracture and bite alignment adjustments.',
      keywords: ['warranty', 'guarantee', 'covered', 'coverage', 'chipping', 'fracture', 'structural'],
    },
    {
      name: '48-Hour Digital Smile Preview',
      summary:
        'We use high-resolution 3D facial scanning and bite mapping to design your smile digitally, so you can preview and approve your exact result before any treatment starts.',
      keywords: ['preview', '48', '3d', 'digital', 'scan', 'mockup', 'mock-up', 'step-by-step', 'step by step', 'workflow'],
    },
    {
      name: 'VIP Sedation & Comfort Protocol',
      summary:
        'Built for anxiety-free, high-profile visits: bespoke IV sedation, NuCalm relaxation and fully private suites with zero waiting rooms and discreet rear valet access.',
      keywords: ['sedation', 'comfort', 'pain', 'anxiety', 'anxious', 'nervous', 'scared', 'vip', 'private', 'privacy', 'clinic experience', 'nucalm', 'zero-pain', 'zero pain'],
    },
    {
      name: 'Bespoke Financing & Investment',
      summary: 'We offer transparent 0% APR monthly installments and concierge insurance advocacy, tailored to the scale of your smile investment.',
      keywords: ['financing', 'finance', 'payment', 'installment', 'apr', 'insurance', 'invest', 'afford', 'monthly'],
    },
    {
      name: 'In-House Master Atelier Lab',
      summary:
        'All porcelain art and micro-veneers are crafted on-site by our master ceramists, which guarantees absolute shade matching and avoids outsourcing delays.',
      keywords: ['atelier', 'lab', 'ceramist', 'on-site', 'in-house'],
    },
    {
      name: 'Accreditations & Memberships',
      summary: 'Dr. Vance is AACD accredited, an ADA member, a Top Doctor 2026 honoree and an Invisalign Diamond provider.',
      keywords: ['aacd', 'accredit', 'ada ', 'membership', 'member', 'credential', 'certified', 'diamond', 'invisalign', 'top doctor', 'recognition', 'award'],
    },
    {
      name: 'Implants',
      summary: 'Precision bio-implants with immediate-load options and a seamless gum blend, planned with the same 3D digital workflow.',
      keywords: ['implant', 'case #604', 'immediate load', 'gum'],
    },
  ],
};

function genericProfile(niche: string): Omit<BusinessProfile, 'niche'> {
  const industry = niche === 'general' ? 'professional services' : niche.replace(/-/g, ' ');
  return {
    brandName: 'our team',
    expertName: 'our senior specialist',
    expertTitle: 'Senior Specialist',
    industry,
    pricingGuidelines:
      'Do not quote prices unless they are listed in this knowledge. Explain that exact pricing depends on the details and is confirmed in a short consultation.',
    bookingOptions: 'Offer to schedule a consultation or have a specialist call the visitor back.',
    tone: 'professional, friendly and concise',
    highlights: [],
    services: [],
  };
}

const BUILT_IN: Record<string, Omit<BusinessProfile, 'niche'>> = {
  dental: DENTAL_PROFILE,
};

// ── Resolution ───────────────────────────────────────────────────────────────

function applyContext(base: Omit<BusinessProfile, 'niche'>, ctx: BusinessContextInput | undefined): Omit<BusinessProfile, 'niche'> {
  if (!ctx) return base;
  const next = { ...base };
  const set = <K extends keyof typeof next>(key: K, value: string | undefined, max: number) => {
    const cleaned = cleanText(value, max);
    if (cleaned) (next as Record<string, unknown>)[key] = cleaned;
  };

  set('brandName', ctx.brandName ?? ctx.businessName, 80);
  set('expertName', ctx.expertName, 80);
  set('expertTitle', ctx.expertTitle, 80);
  set('industry', ctx.industry, 80);
  set('tagline', ctx.tagline, 200);
  set('location', ctx.location ?? ctx.address, 200);
  set('phone', ctx.phone, 40);
  set('hours', ctx.hours ?? ctx.workingHours, 240);
  set('pricingGuidelines', ctx.pricingGuidelines ?? ctx.pricing, 700);
  set('bookingOptions', ctx.bookingOptions, 500);
  set('tone', ctx.tone, 200);
  set('notes', ctx.notes, 1500);

  if (ctx.highlights?.length) next.highlights = ctx.highlights.map((item) => cleanText(item, 260)).filter(Boolean);
  if (ctx.services?.length) {
    next.services = ctx.services
      .map((service) => ({
        name: cleanText(service.name, 100),
        summary: cleanText(service.summary, 500) || `${cleanText(service.name, 100)} is one of our core services.`,
        price: cleanText(service.price, 100) || undefined,
        keywords: (service.keywords ?? []).map((keyword) => cleanText(keyword, 40).toLowerCase()).filter(Boolean),
      }))
      .filter((service) => service.name);
  }
  return next;
}

/** Parse the optional `<NICHE>_BUSINESS_CONTEXT` env JSON (never throws; bad JSON is ignored). */
export function parseEnvContext(raw: string | undefined): BusinessContextInput | undefined {
  if (!raw) return undefined;
  try {
    const parsed = businessContextSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as BusinessContextInput) : undefined;
  } catch {
    return undefined;
  }
}

export interface ResolveProfileOptions {
  niche: string;
  /** Server-side JSON from env (already read by the caller so this module stays pure/testable). */
  envContext?: string;
  clientContext?: BusinessContextInput;
  brandName?: string;
  expertName?: string;
}

export function resolveProfile(options: ResolveProfileOptions): BusinessProfile {
  const niche = options.niche || 'general';
  let profile = BUILT_IN[niche] ?? genericProfile(niche);
  profile = applyContext(profile, parseEnvContext(options.envContext));
  profile = applyContext(profile, options.clientContext);
  profile = applyContext(profile, { brandName: options.brandName, expertName: options.expertName });
  return { niche, ...profile };
}

// ── Matching ─────────────────────────────────────────────────────────────────

/** Best-matching service for a topic or question, or undefined if nothing is relevant. */
export function matchService(profile: BusinessProfile, query: string | undefined): ServiceInfo | undefined {
  const haystack = ` ${(query ?? '').toLowerCase()} `;
  if (haystack.trim().length < 2) return undefined;

  let best: ServiceInfo | undefined;
  let bestScore = 0;
  for (const service of profile.services) {
    let score = haystack.includes(service.name.toLowerCase()) ? 4 : 0;
    for (const keyword of service.keywords) if (keyword && haystack.includes(keyword)) score += keyword.length > 6 ? 2 : 1;
    if (score > bestScore) {
      best = service;
      bestScore = score;
    }
  }
  return best;
}
