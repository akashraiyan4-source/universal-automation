// ব্যাকএন্ডের মূল লাইভ ডোমেইন লিংক
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://smileway-backend.vercel.app').replace(/\/$/, '');

// ৫৪টি এপিআইয়ের সম্পূর্ণ এবং পৃথক তালিকা (অন্য নিশ যেমন সোলার প্রপোজাল, স্টর্ম হিস্ট্রি, প্রপার্টি ভ্যালুয়েশন এবং মর্টগেজ বাদে)
export const API_ENDPOINTS = {
  // ১. AI Chat & Concierge
  aiChat: `${BACKEND_URL}/api/ai-chat`,
  
  // ২. Universal Analytics Engine
  analytics: `${BACKEND_URL}/api/analytics`,
  
  // ৩. Ultimate Universal Quote Engine
  quoteCalculator: `${BACKEND_URL}/api/quote-calculator`,

  // ৪. Universal Booking Engine
  booking: `${BACKEND_URL}/api/booking`,

  // ৫. Universal Cancellation Engine
  appointmentCancel: `${BACKEND_URL}/api/appointment-cancel`,

  // ৬. Universal Appointment Check
  appointmentCheck: `${BACKEND_URL}/api/appointment-check`,

  // ৭. Universal Confirmation Engine
  appointmentConfirm: `${BACKEND_URL}/api/appointment-confirm`,

  // ৮. Universal Creation/Reservation Engine
  appointmentCreate: `${BACKEND_URL}/api/appointment-create`,

  // ৯. Universal Slot Lock Engine
  slotLock: `${BACKEND_URL}/api/slot-lock`,

  // ১০. Ultimate Universal Reschedule Engine
  appointmentReschedule: `${BACKEND_URL}/api/appointment-reschedule`,

  // ১১. Ultimate Universal Broadcast Engine
  broadcast: `${BACKEND_URL}/api/broadcast`,

  // ১২. Ultimate Universal Consultation Pre-Screening Engine
  consultation: `${BACKEND_URL}/api/consultation`,

  // ১৩. Ultimate Universal Cost Estimator
  costEstimator: `${BACKEND_URL}/api/cost-estimator`,

  // ১৪. Ultimate Universal Fly-In Concierge Engine
  flyInConcierge: `${BACKEND_URL}/api/fly-in-concierge`,

  // ১৫. Ultimate Universal Follow-Up Engine
  followUp: `${BACKEND_URL}/api/follow-up`,

  // ১৬. Ultimate Universal Calendar Sync Engine
  googleCalendarSync: `${BACKEND_URL}/api/google-calendar-sync`,

  // ১৭. Ultimate Universal Google Maps Geocoding Engine
  googleMapsGeocoding: `${BACKEND_URL}/api/google-maps-geocoding`,

  // ১৮. Ultimate Universal Insurance & Coverage Qualification Engine
  insurance: `${BACKEND_URL}/api/insurance`,

  // ১৯. Ultimate Universal Intake Engine
  intakeDb: `${BACKEND_URL}/api/intake-db`,

  // ২০. Ultimate Universal Lead Notification Webhook Engine
  leadNotificationWebhook: `${BACKEND_URL}/api/lead-notification-webhook`,

  // ২১. Ultimate Universal Lead Scoring Engine
  leadScoring: `${BACKEND_URL}/api/lead-scoring`,

  // ২২. Ultimate Universal Long-Term Nurture Engine
  longTermNurture: `${BACKEND_URL}/api/long-term-nurture`,

  // ২৩. Ultimate Universal Loyalty & Reward Engine
  loyalty: `${BACKEND_URL}/api/loyalty`,

  // ২৪. Ultimate Universal Missed-Call & AI Voice Call-Back Engine
  missedCallWebhook: `${BACKEND_URL}/api/missed-call-webhook`,

  // ২৫. Ultimate Universal Multi-Language Support Engine
  multilanguage: `${BACKEND_URL}/api/multilanguage`,

  // ২৬. Ultimate Universal NDA & Confidentiality Protocol Engine
  ndaProtocol: `${BACKEND_URL}/api/nda-protocol`,

  // ২৭. Ultimate Universal No-Show Recovery Engine
  noShowRecovery: `${BACKEND_URL}/api/no-show-recovery`,

  // ২৮. Ultimate Universal Onboarding & Data Collection Engine
  onboarding: `${BACKEND_URL}/api/onboarding`,

  // ২৯. Ultimate Universal Payment & Invoice Engine
  invoice: `${BACKEND_URL}/api/invoice`,

  // ৩০. Ultimate Universal Post-Treatment & Service Recovery Engine
  recovery: `${BACKEND_URL}/api/recovery`,

  // ৩১. Ultimate Universal Pre-Appointment Preparation & Guidelines Engine
  prepReminder: `${BACKEND_URL}/api/prep-reminder`,

  // ৩২. Ultimate Universal Client Recall & Re-Engagement Engine
  recall: `${BACKEND_URL}/api/recall`,

  // ৩৩. Ultimate Universal Client Referral & Reward Program Engine
  referral: `${BACKEND_URL}/api/referral`,

  // ৩৪. Ultimate Universal Google Maps Reputation & 5-Star Review Engine
  googleReviews: `${BACKEND_URL}/api/google-reviews`,

  // ৩৫. Ultimate Universal AI Sentiment Analysis & Reputation Shield Engine
  sentimentAnalyzer: `${BACKEND_URL}/api/sentiment-analyzer`,

  // ৩৬. Ultimate Universal Smart FAQ & Conversational Knowledge Bot Engine
  faqBot: `${BACKEND_URL}/api/faq-bot`,

  // ৩৭. Ultimate Universal Staff & Emergency SMS Alert Engine
  staffAlert: `${BACKEND_URL}/api/staff-alert`,

  // ৩৮. Ultimate Universal Advanced Vector RAG & Knowledge Retrieval Engine
  vectorRag: `${BACKEND_URL}/api/vector-rag`,

  // ৩৯. Ultimate Universal AI Visual Simulation & Before-After Engine
  visualSimulation: `${BACKEND_URL}/api/visual-simulation`,

  // ৪০. Ultimate Universal Twilio Voice AI Concierge & Bridge Engine
  voiceAgentIncoming: `${BACKEND_URL}/api/voice-agent-bridge/incoming-call`,

  // ৪১. Ultimate Universal Gemini Real-Time Voice Streaming & Session Engine
  voiceSession: `${BACKEND_URL}/api/voice-session`,

  // ৪২. Ultimate Universal AI Missed Call Auto-Callback & Voice Bridge Engine
  missedCallCallback: `${BACKEND_URL}/api/missed-call-callback`,

  // ৪৩. Ultimate Universal Twilio Speech Recognition & Emergency Call Routing Engine
  voiceProcessSpeech: `${BACKEND_URL}/api/voice-agent-bridge/process-speech`,

  // ৪৪. Ultimate Universal Twilio Voice Transfer Fallback & Graceful Hangup Engine
  voiceTransferFallback: `${BACKEND_URL}/api/voice-agent-bridge/transfer-fallback`,

  // ৪৫. Ultimate Universal Gemini Conversational AI Voice Chat Engine
  voiceChat: `${BACKEND_URL}/api/voice-chat`,

  // ৪৬. Ultimate Universal Advanced Conversational AI Voice & Chat Assistant Engine
  voiceChatAdvanced: `${BACKEND_URL}/api/voice-chat-advanced`,
};