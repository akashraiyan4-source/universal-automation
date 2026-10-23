import { z } from 'zod';

/**
 * Universal Multi-Niche Business Profile Engine
 *
 * Supports Luxury Dental, Cosmetic Surgery / Medical Aesthetics (Aura Beverly Hills),
 * Luxury Real Estate, Architectural Roofing, and Bespoke Solar.
 * Includes Zod schema validation (`businessContextSchema`), fuzzy niche resolution,
 * and dynamic payload merging so no landing page ever fails profile lookup.
 */

export interface ServiceSpec {
  name: string;
  summary: string;
  price?: string;
  keywords?: string[];
}

export interface BusinessProfile {
  niche: string;
  brandName: string;
  industry: string;
  expertName: string;
  expertTitle?: string;
  tagline?: string;
  location?: string;
  hours?: string;
  phone?: string;
  tone: string;
  pricingGuidelines: string;
  bookingOptions: string;
  highlights: string[];
  services: ServiceSpec[];
  notes?: string;
}

const serviceItemSchema = z.union([
  z.string(),
  z
    .object({
      name: z.string().optional(),
      title: z.string().optional(),
      summary: z.string().optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .passthrough(),
]);

/**
 * Permissive Zod schema for incoming `businessContext` / `profile` payloads from any landing page.
 */
export const businessContextSchema = z
  .object({
    niche: z.string().optional(),
    brandName: z.string().optional(),
    businessName: z.string().optional(),
    name: z.string().optional(),
    industry: z.string().optional(),
    expertName: z.string().optional(),
    doctorName: z.string().optional(),
    leadExpert: z.string().optional(),
    expertTitle: z.string().optional(),
    tagline: z.string().optional(),
    positioning: z.string().optional(),
    location: z.string().optional(),
    address: z.string().optional(),
    hours: z.string().optional(),
    workingHours: z.string().optional(),
    phone: z.string().optional(),
    tone: z.string().optional(),
    pricingGuidelines: z.string().optional(),
    pricingPolicy: z.string().optional(),
    bookingOptions: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    services: z.array(serviceItemSchema).optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export type BusinessContextInput = z.infer<typeof businessContextSchema>;

/**
 * Safely truncates and normalizes plain text inputs.
 */
export function cleanText(input: unknown, maxLength = 300): string {
  if (typeof input !== 'string') return '';
  const cleaned = input
    .replace(/<\/?[a-zA-Z_][\w-]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Built-in flagship profiles for all 5 core niches.
 */
export const DEFAULT_PROFILES: Record<string, BusinessProfile> = {
  dental: {
    niche: 'dental',
    brandName: 'SmileWay Studio',
    industry: 'Beverly Hills Cosmetic & Restorative Dentistry',
    expertName: 'Dr. Julian Vance',
    expertTitle: 'DDS',
    tagline: 'Bespoke porcelain artistry and structural smile architecture in Beverly Hills.',
    location: '9400 Wilshire Blvd, Beverly Hills, CA 90212',
    hours: 'Monday to Friday 8:00 AM to 6:00 PM, Saturday by priority appointment',
    phone: '(310) 555-0192',
    tone: 'Warm, prestigious, reassuring, and clinically authoritative',
    pricingGuidelines:
      'Every smile plan is fully custom, so exact fees are confirmed after the 3D digital smile scan during a private consultation. We offer transparent 0% APR monthly installments and concierge insurance advocacy.',
    bookingOptions:
      'Private one-on-one consultations, priority Saturday allocations, and virtual pre-assessments for international clients.',
    highlights: [
      'Rated 4.9 by 380+ verified Beverly Hills patients',
      'AACD accredited, ADA member, Top Doctor 2026, Invisalign Diamond provider',
      'Hand-layered ultra-thin porcelain veneers crafted with master ceramists',
      'Private recovery suites and sedation comfort protocols',
    ],
    services: [
      {
        name: 'Bespoke Porcelain Veneers',
        summary:
          'Ultra-thin, hand-feathered porcelain restorations engineered for natural translucency without aggressive tooth reduction.',
        keywords: ['veneer', 'veneers', 'porcelain', 'smile makeover', 'hollywood smile', 'cosmetic'],
      },
      {
        name: '3D Guided Dental Implants',
        summary:
          'Biocompatible titanium and zirconia implants placed with sub-millimeter 3D CBCT digital guidance for permanent structural harmony.',
        keywords: ['implant', 'implants', 'missing tooth', 'crown', 'bridge', 'full arch', 'all-on-4'],
      },
      {
        name: 'Invisalign Diamond Orthodontics',
        summary:
          'Accelerated, discreet clear aligner therapy digitally mapped by a Diamond-tier provider.',
        keywords: ['invisalign', 'aligners', 'straighten', 'braces', 'orthodontics', 'bite'],
      },
      {
        name: 'Laser Enamel Rejuvenation & Whitening',
        summary:
          'Zero-sensitivity clinical whitening protocol that lifts multiple shades in a single private suite visit.',
        keywords: ['whitening', 'bleaching', 'brightening', 'stain', 'clean', 'cleaning', 'laser'],
      },
      {
        name: 'Priority Emergency & Sedation Care',
        summary:
          'Same-day discreet trauma stabilization, painless surgical extraction, and twilight sedation dentistry.',
        keywords: ['emergency', 'pain', 'extraction', 'root canal', 'sedation', 'broken', 'urgent'],
      },
    ],
    notes: 'Every patient receives a digital 3D smile simulation before any clinical work begins.',
  },

  cosmetics: {
    niche: 'cosmetics',
    brandName: 'Aura Beverly Hills',
    industry: 'Ultra-Luxury Facial Plastic Surgery & Medical Aesthetics',
    expertName: 'Dr. Sarah Alvi',
    expertTitle: 'MD, FACS',
    tagline:
      'Master-level surgical artistry, bespoke anatomical mapping, and undetectable facial rejuvenation.',
    location: '436 N Bedford Dr, Penthouse Suite, Beverly Hills, CA 90210',
    hours: 'Monday to Friday 9:00 AM to 6:00 PM, Saturday by private VIP arrangement',
    phone: '(310) 555-0840',
    tone: 'Ultra-discreet, refined, serene, and artistically authoritative',
    pricingGuidelines:
      'Every bespoke rejuvenation plan is custom-designed following a detailed 3D anatomical evaluation, so exact investment figures are confirmed during a private consultation. We offer flexible executive financing options and comprehensive concierge coordination.',
    bookingOptions:
      'Discreet private suite consultations, subterranean valet arrival, and virtual executive evaluations for out-of-state and international clients.',
    highlights: [
      'Double board-certified facial plastic and reconstructive surgeon',
      'Ultra-private subterranean arrival and accredited luxury surgical suites',
      'Bespoke 3D anatomical vector mapping for natural, undetectable results',
      '24/7 post-operative private nursing and hyperbaric recovery concierge',
    ],
    services: [
      {
        name: 'Deep Plane Facial Rejuvenation (Facelift)',
        summary:
          'Advanced structural deep-plane repositioning that restores youthful ligament tension and jawline contour with zero surface tension or windblown appearance.',
        keywords: [
          'facelift',
          'face lift',
          'deep plane',
          'neck lift',
          'sagging',
          'jawline',
          'jowls',
          'rejuvenation',
          'aging',
          'different',
          'procedures',
        ],
      },
      {
        name: 'Preservation Ultrasonic Rhinoplasty',
        summary:
          'Piezo-ultrasonic structural nasal refinement that preserves dorsal integrity, refines breathing, and minimizes bruising and downtime.',
        keywords: ['rhinoplasty', 'nose job', 'nose', 'nasal', 'septoplasty', 'revision', 'breathing'],
      },
      {
        name: 'Micro-Droplet Blepharoplasty & Brow Contouring',
        summary:
          'Precision upper and lower eyelid revitalization paired with micro-fat grafting to erase hollowness and restore rested periorbital luminosity.',
        keywords: [
          'blepharoplasty',
          'eyelid',
          'eye',
          'eyes',
          'under eye',
          'bags',
          'brow',
          'brow lift',
          'hollow',
        ],
      },
      {
        name: 'Non-Surgical Structural Liquid Lift & Biostimulators',
        summary:
          'Precision dermal fillers, sculptural biostimulators, and medical-grade laser resurfacing tailored to restore youthful volume without surgery.',
        keywords: [
          'filler',
          'fillers',
          'botox',
          'non-surgical',
          'nonsurgical',
          'injectables',
          'lips',
          'skin',
          'laser',
          'volume',
        ],
      },
      {
        name: 'Accelerated VIP Recovery & Hyperbaric Protocol',
        summary:
          'Dedicated post-operative concierge care featuring lymphatic therapy, LED cellular regeneration, and private nursing so most clients return to social engagements within two to three weeks.',
        keywords: [
          'recovery',
          'downtime',
          'healing',
          'aftercare',
          'bruising',
          'swelling',
          'pain',
          'process',
          'timeline',
        ],
      },
    ],
    notes:
      'Total patient privacy is guaranteed with NDA protection, private elevator access, and customized recovery timelines aligned with major social or media events.',
  },

  'real-estate': {
    niche: 'real-estate',
    brandName: 'Vanguard Estates Beverly Hills',
    industry: 'Ultra-Prime Luxury Real Estate & Off-Market Advisory',
    expertName: 'Marcus Sterling',
    expertTitle: 'Managing Partner, DRE# 01984210',
    tagline: 'Private access to off-market architectural estates across the Platinum Triangle.',
    location: '301 N Canon Dr, Beverly Hills, CA 90210',
    hours: 'Seven days a week by private appointment',
    phone: '(310) 555-0911',
    tone: 'Sophisticated, analytical, discreet, and market-commanding',
    pricingGuidelines:
      'Comprehensive property valuations, off-market acquisition briefs, and comparative yield analyses are prepared confidentially following a private portfolio review.',
    bookingOptions:
      'Private dossier briefings, helicopter or chauffeured estate tours, and confidential seller valuation consultations.',
    highlights: [
      '$2.4B+ in closed architectural and trophy estate transactions',
      'Direct access to pocket listings in Beverly Hills, Bel-Air, and Holmby Hills',
      'In-house wealth structuring, 1031 exchange, and family office advisory',
    ],
    services: [
      {
        name: 'Off-Market Pocket Listing Access',
        summary:
          'Curated acquisition of unadvertised trophy estates and architectural compounds before public market exposure.',
        keywords: ['buy', 'buying', 'off-market', 'pocket listing', 'estate', 'home', 'mansion', 'property'],
      },
      {
        name: 'Confidential Estate Valuation & Disposition',
        summary:
          'Data-driven property valuation and discreet global marketing to qualified ultra-high-net-worth buyers.',
        keywords: ['sell', 'selling', 'valuation', 'worth', 'price', 'appraisal', 'market value', 'list'],
      },
      {
        name: 'Investment ROI & Portfolio Structuring',
        summary:
          'Comprehensive cap-rate modeling, mortgage structuring, and luxury development feasibility analysis.',
        keywords: ['investment', 'roi', 'mortgage', 'calculator', 'yield', 'tax', 'portfolio'],
      },
    ],
  },

  roofing: {
    niche: 'roofing',
    brandName: 'Apex Architectural Roofing & Restoration',
    industry: 'Luxury Estate Roofing & Storm Restoration Engineering',
    expertName: 'Harrison Cole',
    expertTitle: 'Principal Structural Director',
    tagline:
      'Master-grade slate, copper, and storm-resilient roofing systems engineered for generational durability.',
    location: '9100 Wilshire Blvd, Suite 400, Beverly Hills, CA 90212',
    hours: 'Monday to Saturday 7:00 AM to 7:00 PM, 24/7 Emergency Storm Response',
    phone: '(310) 555-0344',
    tone: 'Authoritative, engineering-focused, dependable, and executive',
    pricingGuidelines:
      'Exact project investments are confirmed following a drone thermal inspection and structural load assessment. We provide full insurance claim advocacy and flexible financing.',
    bookingOptions:
      'Complimentary drone structural inspection, storm damage audit, and private architectural material consultation.',
    highlights: [
      'Lifetime structural workmanship warranty on slate, clay tile, and standing-seam metal',
      'Drone thermal imaging and historical storm impact verification',
      'White-glove insurance claim engineering and zero-disruption site management',
    ],
    services: [
      {
        name: 'Architectural Slate, Tile & Copper Systems',
        summary:
          'Custom-fabricated European slate, Spanish clay, and standing-seam metal roofs built for Class-4 impact and fire resistance.',
        keywords: ['replace', 'replacement', 'new roof', 'slate', 'tile', 'metal', 'copper', 'architectural'],
      },
      {
        name: 'Precision Storm Damage & Insurance Advocacy',
        summary:
          'Forensic hail and wind inspection paired with meteorological storm-history documentation to maximize insurance coverage.',
        keywords: ['storm', 'hail', 'wind', 'damage', 'insurance', 'claim', 'leak', 'repair', 'emergency'],
      },
      {
        name: 'Drone Thermal & Structural Audit',
        summary:
          'Non-invasive infrared moisture scanning to detect hidden underlayment vulnerabilities before interior damage occurs.',
        keywords: ['inspection', 'drone', 'audit', 'estimate', 'cost', 'quote', 'check'],
      },
    ],
  },

  solar: {
    niche: 'solar',
    brandName: 'Helios Bespoke Solar & Microgrid',
    industry: 'Architectural Solar Integration & Whole-Estate Battery Storage',
    expertName: 'Elena Rostova',
    expertTitle: 'Chief Energy Architect',
    tagline:
      'Zero-visibility architectural solar arrays and autonomous Tesla microgrids for luxury estates.',
    location: '9665 Wilshire Blvd, Beverly Hills, CA 90212',
    hours: 'Monday to Saturday 8:00 AM to 6:00 PM',
    phone: '(310) 555-0778',
    tone: 'Innovative, precision-engineered, consultative, and high-status',
    pricingGuidelines:
      'Every microgrid proposal is custom-modeled using lidar roof shading and 12-month utility telemetry, factoring in the 30% Federal ITC tax credit and concierge financing.',
    bookingOptions:
      'Custom satellite energy modeling session and on-site microgrid engineering assessment.',
    highlights: [
      'Flush-mounted all-black architectural panels and integrated solar roof tiles',
      'Autonomous whole-home backup via multi-unit Tesla Powerwall 3 microgrids',
      'Full 25-year production, hardware, and structural penetration guarantee',
    ],
    services: [
      {
        name: 'Architectural Solar Array & Integrated Tile',
        summary:
          'Aesthetically invisible high-efficiency monocrystalline arrays custom-mapped to preserve estate curb appeal.',
        keywords: ['solar', 'panels', 'array', 'roof', 'install', 'installation', 'aesthetic', 'tile'],
      },
      {
        name: 'Whole-Estate Battery Microgrid (Powerwall 3)',
        summary:
          'Seamless off-grid islanding that powers HVAC, pool systems, and EV chargers during utility blackouts.',
        keywords: ['battery', 'storage', 'powerwall', 'backup', 'outage', 'blackout', 'microgrid', 'ev'],
      },
      {
        name: 'Utility ROI & Federal Tax Credit Modeling',
        summary:
          'Precision financial modeling detailing utility bill elimination, NEM 3.0 optimization, and 30% federal tax credit capture.',
        keywords: ['cost', 'price', 'roi', 'savings', 'bill', 'tax', 'credit', 'financing', 'quote', 'proposal'],
      },
    ],
  },
};

/**
 * Maps any incoming niche alias or keyword to one of the canonical profiles.
 */
const NICHE_ALIASES: Record<string, keyof typeof DEFAULT_PROFILES> = {
  // Dental aliases
  dental: 'dental',
  dentist: 'dental',
  dentistry: 'dental',
  orthodontics: 'dental',
  smile: 'dental',
  smileway: 'dental',

  // Cosmetics / Medical Aesthetics aliases
  cosmetics: 'cosmetics',
  cosmetic: 'cosmetics',
  'cosmetic-surgery': 'cosmetics',
  'cosmetics-surgery': 'cosmetics',
  'plastic-surgery': 'cosmetics',
  aesthetics: 'cosmetics',
  'medical-aesthetics': 'cosmetics',
  medspa: 'cosmetics',
  aura: 'cosmetics',
  'aura-beverly-hills': 'cosmetics',
  facelift: 'cosmetics',
  beauty: 'cosmetics',

  // Real Estate aliases
  'real-estate': 'real-estate',
  realestate: 'real-estate',
  realtor: 'real-estate',
  property: 'real-estate',
  estates: 'real-estate',

  // Roofing aliases
  roofing: 'roofing',
  roof: 'roofing',
  roofer: 'roofing',
  restoration: 'roofing',

  // Solar aliases
  solar: 'solar',
  'solar-panel': 'solar',
  'solar-panels': 'solar',
  energy: 'solar',
  microgrid: 'solar',
};

/**
 * Resolves a canonical niche key from any raw string, URL, or brand hint.
 */
export function resolveNicheKey(rawNiche?: string, brandHint?: string): keyof typeof DEFAULT_PROFILES {
  const combined = `${rawNiche ?? ''} ${brandHint ?? ''}`.toLowerCase().trim();
  if (!combined) return 'dental';

  const normalizedSlug = (rawNiche ?? '')
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-');

  if (normalizedSlug && NICHE_ALIASES[normalizedSlug]) {
    return NICHE_ALIASES[normalizedSlug];
  }

  if (/cosmetic|aesthetic|aura|alvi|facelift|rhinoplast|blepharoplast|plastic|medspa|filler|botox/.test(combined)) {
    return 'cosmetics';
  }
  if (/dental|dentist|smile|vance|veneer|implant|invisalign|tooth|teeth/.test(combined)) {
    return 'dental';
  }
  if (/real\s*estate|realtor|property|vanguard|mortgage|listing|villa|mansion/.test(combined)) {
    return 'real-estate';
  }
  if (/roof|storm|hail|shingle|slate|gutter|apex/.test(combined)) {
    return 'roofing';
  }
  if (/solar|powerwall|photovoltaic|microgrid|helios|kilowatt/.test(combined)) {
    return 'solar';
  }

  return 'dental';
}

/**
 * Resolves and merges a complete BusinessProfile from any request payload,
 * niche string, or partial profile override.
 */
export function resolveProfile(
  input?: string | Partial<BusinessProfile> | BusinessContextInput | Record<string, unknown> | null,
  fallbackNiche?: string
): BusinessProfile {
  if (!input || typeof input === 'string') {
    const key = resolveNicheKey(typeof input === 'string' ? input : fallbackNiche);
    return DEFAULT_PROFILES[key];
  }

  const rawObj = input as Record<string, unknown>;
  const rawNiche =
    (typeof rawObj.niche === 'string' && rawObj.niche) ||
    (typeof rawObj.industry === 'string' && rawObj.industry) ||
    fallbackNiche ||
    '';
  const rawBrand =
    (typeof rawObj.brandName === 'string' && rawObj.brandName) ||
    (typeof rawObj.businessName === 'string' && rawObj.businessName) ||
    (typeof rawObj.name === 'string' && rawObj.name) ||
    '';

  const baseKey = resolveNicheKey(rawNiche, rawBrand);
  const base = DEFAULT_PROFILES[baseKey];

  const customServices = Array.isArray(rawObj.services)
    ? rawObj.services
        .map((s): ServiceSpec | null => {
          if (typeof s === 'string') {
            return { name: cleanText(s, 80), summary: cleanText(s, 220) };
          }
          if (s && typeof s === 'object') {
            const item = s as Record<string, unknown>;
            const name = cleanText(item.name ?? item.title, 80);
            const summary = cleanText(item.summary ?? item.description ?? name, 240);
            const price = item.price ? cleanText(item.price, 60) : undefined;
            const keywords = Array.isArray(item.keywords)
              ? item.keywords.map((k) => cleanText(k, 40)).filter(Boolean)
              : undefined;
            if (!name) return null;
            return { name, summary, price, keywords };
          }
          return null;
        })
        .filter((s): s is ServiceSpec => Boolean(s))
    : [];

  const customHighlights = Array.isArray(rawObj.highlights)
    ? rawObj.highlights.map((h) => cleanText(h, 160)).filter(Boolean)
    : [];

  return {
    niche: cleanText(rawObj.niche, 40) || base.niche,
    brandName: cleanText(rawObj.brandName ?? rawObj.businessName ?? rawObj.name, 80) || base.brandName,
    industry: cleanText(rawObj.industry, 100) || base.industry,
    expertName:
      cleanText(rawObj.expertName ?? rawObj.doctorName ?? rawObj.leadExpert, 80) || base.expertName,
    expertTitle: cleanText(rawObj.expertTitle, 40) || base.expertTitle,
    tagline: cleanText(rawObj.tagline ?? rawObj.positioning, 180) || base.tagline,
    location: cleanText(rawObj.location ?? rawObj.address, 140) || base.location,
    hours: cleanText(rawObj.hours ?? rawObj.workingHours, 140) || base.hours,
    phone: cleanText(rawObj.phone, 40) || base.phone,
    tone: cleanText(rawObj.tone, 120) || base.tone,
    pricingGuidelines:
      cleanText(rawObj.pricingGuidelines ?? rawObj.pricingPolicy, 350) || base.pricingGuidelines,
    bookingOptions: cleanText(rawObj.bookingOptions, 250) || base.bookingOptions,
    highlights: customHighlights.length ? customHighlights : base.highlights,
    services: customServices.length ? customServices : base.services,
    notes: cleanText(rawObj.notes, 300) || base.notes,
  };
}

// Aliases so any existing imports in route.ts or chat services continue working seamlessly
export const getBusinessProfile = resolveProfile;
export const getProfile = resolveProfile;
export const buildBusinessProfile = resolveProfile;

/**
 * Matches a user message or topic context against the profile's signature services.
 */
export function matchService(profile: BusinessProfile, query: string): ServiceSpec | undefined {
  if (!query || !profile.services.length) return undefined;
  const q = query.toLowerCase();

  let bestMatch: ServiceSpec | undefined;
  let bestScore = 0;

  for (const service of profile.services) {
    let score = 0;
    const nameTokens = service.name.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    for (const token of nameTokens) {
      if (q.includes(token)) score += 3;
    }

    if (service.keywords) {
      for (const kw of service.keywords) {
        if (q.includes(kw.toLowerCase())) score += 4;
      }
    }

    const summaryTokens = service.summary.toLowerCase().split(/\W+/).filter((t) => t.length > 4);
    for (const token of summaryTokens) {
      if (q.includes(token)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = service;
    }
  }

  return bestScore >= 2 ? bestMatch : undefined;
}