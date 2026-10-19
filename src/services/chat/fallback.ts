import type { ChatTurn } from '../geminiService';
import { type BusinessProfile, matchService } from './profile';
import type { TopicContext } from './prompt';

/**
 * Context-aware fallback used whenever the AI provider is unconfigured, times out, is rate limited or fails.
 *
 * It never returns a generic "Hello" – every reply is composed from the business profile and the visitor's
 * topic/question, so the conversation stays useful (and different on each turn) even with the model offline.
 */

export type FallbackReason = 'unconfigured' | 'timeout' | 'rate_limited' | 'empty' | 'error';

interface FallbackInput {
  profile: BusinessProfile;
  topic?: TopicContext;
  message?: string;
  history?: ChatTurn[];
}

type Intent = 'pricing' | 'location' | 'hours' | 'booking' | 'contact' | 'comfort' | 'warranty';

const INTENT_PATTERNS: Array<[Intent, RegExp]> = [
  ['pricing', /\b(price|prices|pricing|cost|costs|how much|fee|fees|quote|afford|expensive|cheap|payment|finance|financing|installment|insurance)\b/i],
  ['hours', /\b(hours|open|opening|closing|close|when are you|what time|weekend|saturday|sunday)\b/i],
  ['location', /\b(where|location|address|directions|parking|map|located|near|find you)\b/i],
  ['warranty', /\b(warranty|guarantee|guaranteed|covered|coverage)\b/i],
  ['comfort', /\b(pain|painful|hurt|sedation|anxious|anxiety|nervous|scared|afraid|fear|comfortable)\b/i],
  ['booking', /\b(book|booking|appointment|schedule|reserve|slot|available|availability|consult|consultation|visit|come in)\b/i],
  ['contact', /\b(phone|call|contact|email|number|reach|talk to)\b/i],
];

/** Every intent the message touches, in priority order ("where are you and what are your hours?" -> location + hours). */
function detectIntents(message: string): Intent[] {
  return INTENT_PATTERNS.filter(([, pattern]) => pattern.test(message)).map(([intent]) => intent);
}

function nextStep(profile: BusinessProfile, variant: number): string {
  const options = [
    `Would you like me to reserve a priority consultation with ${profile.expertName}, or walk you through how it works first?`,
    `I can help you pick a time with ${profile.expertName} - shall we find a slot that suits you?`,
    `The easiest next step is a personal consultation with ${profile.expertName}. Would you like to book one?`,
  ];
  return options[variant % options.length];
}

function phoneLine(profile: BusinessProfile): string {
  return profile.phone ? ` You can also call us at ${profile.phone}.` : '';
}

function serviceByName(profile: BusinessProfile, fragment: string) {
  return profile.services.find((service) => service.name.toLowerCase().includes(fragment));
}

function answerForIntent(intent: Intent, profile: BusinessProfile): string | undefined {
  switch (intent) {
    case 'pricing': {
      const financing = serviceByName(profile, 'financ');
      return `${profile.pricingGuidelines}${financing ? ` ${financing.summary}` : ''}`;
    }
    case 'location':
      return profile.location ? `${profile.brandName} is located at ${profile.location}.` : undefined;
    case 'hours':
      return profile.hours ? `Our working hours: ${profile.hours}.` : undefined;
    case 'warranty':
      return serviceByName(profile, 'warrant')?.summary;
    case 'comfort':
      return serviceByName(profile, 'sedation')?.summary ?? serviceByName(profile, 'comfort')?.summary;
    case 'booking':
      return profile.bookingOptions;
    case 'contact':
      return profile.phone ? `The fastest way to reach us is by phone at ${profile.phone}, or through the booking form on this page.` : undefined;
  }
}

export function buildFallbackReply({ profile, topic, message, history = [] }: FallbackInput): string {
  const variant = history.filter((turn) => turn.role === 'assistant').length;
  const cta = nextStep(profile, variant);
  const cleanMessage = message?.trim();

  // 1. Visitor typed something: answer the question from the business knowledge.
  if (cleanMessage) {
    const answered = detectIntents(cleanMessage)
      .map((intent) => ({ intent, answer: answerForIntent(intent, profile) }))
      .filter((item): item is { intent: Intent; answer: string } => Boolean(item.answer))
      .slice(0, 2);
    if (answered.length > 0) {
      const onlyContact = answered.every(({ intent }) => intent === 'booking' || intent === 'contact');
      const tail = onlyContact ? phoneLine(profile).trim() : cta;
      return `${answered.map(({ answer }) => answer).join(' ')} ${tail}`.trim();
    }

    const service = matchService(profile, cleanMessage) ?? matchService(profile, topic?.topic);
    if (service) return `Great question about ${service.name}. ${service.summary} ${cta}`;

    const overview = profile.highlights.slice(0, 2).join('. ');
    return (
      `Thank you for your question. ${profile.expertName} and the ${profile.brandName} team can give you a precise, personal answer.` +
      `${overview ? ` ${overview}.` : ''} ${cta}`
    );
  }

  // 2. Card click with no typed message: a specific, topic-led welcome.
  if (topic) {
    const service = matchService(profile, `${topic.topic} ${topic.description ?? ''}`);
    if (service) return `Welcome to ${profile.brandName}! You picked ${service.name} - excellent choice. ${service.summary} ${cta}`;
    return `Welcome to ${profile.brandName}! Thank you for your interest in ${topic.topic}. ${profile.expertName} and the team can show you exactly how it applies to you. ${cta}`;
  }

  // 3. Nothing to go on (route validation normally prevents this): a business-specific overview.
  return `${profile.brandName} offers ${profile.industry}${profile.tagline ? ` - ${profile.tagline}` : ''}. ${cta}`;
}
