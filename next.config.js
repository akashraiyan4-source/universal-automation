/** @type {import('next').NextConfig} */

/**
 * Public API contract: every landing page calls `${BACKEND_URL}/api/<alias>`.
 * The implementation lives in feature folders (`app/booking/book`, `app/ai/chat`, …); these rewrites
 * connect the two so there is exactly one place to look when you add an endpoint.
 *
 * Adding a new niche needs NOTHING here – it is only a `niche` field in the request body.
 */
const API_ALIASES = {
  'ai-chat': '/ai/chat',
  analytics: '/analytics/dashboard-stats',
  'quote-calculator': '/automated-quote-calculator',
  booking: '/booking/book',
  'appointment-cancel': '/booking/cancel',
  'appointment-check': '/booking/check',
  'appointment-confirm': '/booking/confirm',
  'appointment-create': '/booking/create',
  'slot-lock': '/booking/lock-slot',
  'appointment-reschedule': '/booking/reschedule',
  broadcast: '/broadcast/send-campaign',
  'cost-estimator': '/cost-estimator/calculate-estimate',
  'follow-up': '/follow-up/trigger-sequence',
  insurance: '/insurance/check-qualification',
  'lead-scoring': '/lead-scoring/score-lead',
  loyalty: '/loyalty/add-points',
  'missed-call-webhook': '/missed-call/missed-call',
  multilanguage: '/multilanguage-support',
  'no-show-recovery': '/no-show-recovery/recover',
  onboarding: '/onboarding/submit-form',
  invoice: '/payment-invoice',
  recovery: '/post-treatment/track-recovery',
  'prep-reminder': '/prep-reminder/send-prep',
  recall: '/recall-engine/schedule',
  referral: '/referral/generate-referral',
  'google-reviews': '/reputation/send-review-request',
  'faq-bot': '/smart-faq/ask-faq',
  'staff-alert': '/staffAlert',
  'vector-rag': '/vector-knowledge/query-rag',
  'visual-simulation': '/visual-simulator/simulate-smile',
  'voice-session': '/voice-agent-bridge/initialize-voice-session',
  'missed-call-callback': '/voice-agent-bridge/missed-call-callback',
  'voice-chat-advanced': '/voice-chat',
  'sms-concierge': '/gemini-concierge/webhook',
  whatsapp: '/whatsapp-integration/send-whatsapp',
  // Niche-specific calculators
  'property-valuation': '/real-estate-property-valuation',
  'mortgage-calculator': '/real-estate-mortgage-roi-calculator',
  'storm-history': '/roofing-weather-storm-history',
  'solar-proposal': '/solar-panel-custom-proposal',
  'solar-proposal-advanced': '/solar-electricity-bill-roi',
  health: '/health',
};

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // do not advertise the framework
  compress: true,

  // Pin the project root (a stray package-lock.json higher up the tree otherwise confuses workspace detection).
  turbopack: { root: __dirname },

  async rewrites() {
    return [
      ...Object.entries(API_ALIASES).map(([alias, destination]) => ({
        source: `/api/${alias}`,
        destination,
      })),
      // Folder-style paths also work under /api (e.g. /api/voice-agent-bridge/incoming-call, /api/consultation).
      { source: '/api/:path*', destination: '/:path*' },
    ];
  },

  // Added global CORS headers to resolve cross-origin preflight blockages for universal landing pages
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;