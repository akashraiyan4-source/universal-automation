declare global {
    var globalAppointments: any[] | undefined;
    var globalAiDatabase: any[] | undefined;
    var globalAnalyticsDatabase: any[] | undefined;
    var globalBroadcastDatabase: any[] | undefined;
    var globalCostEstimatorDatabase: any[] | undefined;
    var globalFollowUpDatabase: any[] | undefined;
    var globalGeminiConciergeDatabase: any[] | undefined;
    var globalInsuranceDatabase: any[] | undefined;
    var globalLeadScoringDatabase: any[] | undefined;
    var globalLeadsDatabase: any[] | undefined;
    var globalLoyaltyDatabase: any[] | undefined;
    var globalMissedCallDatabase: any[] | undefined;
    var globalNoShowDatabase: any[] | undefined;
    var globalOnboardingDatabase: any[] | undefined;
    var globalPostTreatmentDatabase: any[] | undefined;
    var globalPrepReminderDatabase: any[] | undefined;
    var globalRecallEngineDatabase: any[] | undefined;
    var globalReferralDatabase: any[] | undefined;
    var globalReviewsDatabase: any[] | undefined;
    var globalReviewRequestsDatabase: any[] | undefined;
    var globalSmartFaqDatabase: any[] | undefined;
    var globalSmileSimulatorDatabase: any[] | undefined;
    var globalUtilsDatabase: any[] | undefined;
    var globalVectorKnowledgeDatabase: any[] | undefined;
    var globalVoiceAgentBridgeDatabase: any[] | undefined;
    var globalWhatsappDatabase: any[] | undefined;
    // নতুন ৩টি ফিচারের জন্য গ্লোবাল ভেরিয়েবল ডিক্লেয়ারেশন
    var globalInvoiceDatabase: any[] | undefined;
    var globalMultilanguageDatabase: any[] | undefined;
    var globalSentimentDatabase: any[] | undefined;
}

export const appointmentsDatabase = global.globalAppointments || [];
if (!global.globalAppointments) { global.globalAppointments = appointmentsDatabase; }

export const aiDatabase = global.globalAiDatabase || [];
if (!global.globalAiDatabase) { global.globalAiDatabase = aiDatabase; }

export const analyticsDatabase = global.globalAnalyticsDatabase || [];
if (!global.globalAnalyticsDatabase) { global.globalAnalyticsDatabase = analyticsDatabase; }

export const broadcastDatabase = global.globalBroadcastDatabase || [];
if (!global.globalBroadcastDatabase) { global.globalBroadcastDatabase = broadcastDatabase; }

export const costEstimatorDatabase = global.globalCostEstimatorDatabase || [];
if (!global.globalCostEstimatorDatabase) { global.globalCostEstimatorDatabase = costEstimatorDatabase; }

// এক্সট্রা অ্যালাইয়াস যাতে কোনো রাউট ফাইলে নাম নিয়ে সমস্যা না হয়
export const estimatedDatabase = costEstimatorDatabase;

export const followUpDatabase = global.globalFollowUpDatabase || [];
if (!global.globalFollowUpDatabase) { global.globalFollowUpDatabase = followUpDatabase; }

export const geminiConciergeDatabase = global.globalGeminiConciergeDatabase || [];
if (!global.globalGeminiConciergeDatabase) { global.globalGeminiConciergeDatabase = geminiConciergeDatabase; }

export const insuranceDatabase = global.globalInsuranceDatabase || [];
if (!global.globalInsuranceDatabase) { global.globalInsuranceDatabase = insuranceDatabase; }

export const leadScoringDatabase = global.globalLeadScoringDatabase || [];
if (!global.globalLeadScoringDatabase) { global.globalLeadScoringDatabase = leadScoringDatabase; }

// এক্সট্রা অ্যালাইয়াস
export const scoredLeadsDatabase = leadScoringDatabase;

export const leadsDatabase = global.globalLeadsDatabase || [];
if (!global.globalLeadsDatabase) { global.globalLeadsDatabase = leadsDatabase; }

export const loyaltyDatabase = global.globalLoyaltyDatabase || [];
if (!global.globalLoyaltyDatabase) { global.globalLoyaltyDatabase = loyaltyDatabase; }

export const missedCallDatabase = global.globalMissedCallDatabase || [];
if (!global.globalMissedCallDatabase) { global.globalMissedCallDatabase = missedCallDatabase; }

export const noShowDatabase = global.globalNoShowDatabase || [];
if (!global.globalNoShowDatabase) { global.globalNoShowDatabase = noShowDatabase; }

export const onboardingDatabase = global.globalOnboardingDatabase || [];
if (!global.globalOnboardingDatabase) { global.globalOnboardingDatabase = onboardingDatabase; }

export const postTreatmentDatabase = global.globalPostTreatmentDatabase || [];
if (!global.globalPostTreatmentDatabase) { global.globalPostTreatmentDatabase = postTreatmentDatabase; }

// পোস্ট-ট্রিটমেন্ট রিকভারির জন্য এক্সট্রা অ্যালাইয়াস
export const recoveryDatabase = postTreatmentDatabase;

export const prepReminderDatabase = global.globalPrepReminderDatabase || [];
if (!global.globalPrepReminderDatabase) { global.globalPrepReminderDatabase = prepReminderDatabase; }

export const recallEngineDatabase = global.globalRecallEngineDatabase || [];
if (!global.globalRecallEngineDatabase) { global.globalRecallEngineDatabase = recallEngineDatabase; }

// রিকল ইঞ্জিন রাউটের জন্য এক্সট্রা অ্যালাইয়াস
export const recallDatabase = recallEngineDatabase;

export const referralDatabase = global.globalReferralDatabase || [];
if (!global.globalReferralDatabase) { global.globalReferralDatabase = referralDatabase; }

export const reviewsDatabase = global.globalReviewsDatabase || [];
if (!global.globalReviewsDatabase) { global.globalReviewsDatabase = reviewsDatabase; }

export const reviewRequestsDatabase = global.globalReviewRequestsDatabase || [];
if (!global.globalReviewRequestsDatabase) { global.globalReviewRequestsDatabase = reviewRequestsDatabase; }

export const smartFaqDatabase = global.globalSmartFaqDatabase || [];
if (!global.globalSmartFaqDatabase) { global.globalSmartFaqDatabase = smartFaqDatabase; }

// স্মার্ট এফএকিউ রা우টের জন্য এক্সট্রা অ্যালাইয়াস
export const faqDatabase = smartFaqDatabase;

export const smileSimulatorDatabase = global.globalSmileSimulatorDatabase || [];
if (!global.globalSmileSimulatorDatabase) { global.globalSmileSimulatorDatabase = smileSimulatorDatabase; }

export const utilsDatabase = global.globalUtilsDatabase || [];
if (!global.globalUtilsDatabase) { global.globalUtilsDatabase = utilsDatabase; }

export const vectorKnowledgeDatabase = global.globalVectorKnowledgeDatabase || [];
if (!global.globalVectorKnowledgeDatabase) { global.globalVectorKnowledgeDatabase = vectorKnowledgeDatabase; }

// ভেক্টর নলেজ রাউটের জন্য এক্সট্রা অ্যালাইয়াস
export const vectorDatabase = vectorKnowledgeDatabase;

export const voiceAgentBridgeDatabase = global.globalVoiceAgentBridgeDatabase || [];
if (!global.globalVoiceAgentBridgeDatabase) { global.globalVoiceAgentBridgeDatabase = voiceAgentBridgeDatabase; }

export const whatsappDatabase = global.globalWhatsappDatabase || [];
if (!global.globalWhatsappDatabase) { global.globalWhatsappDatabase = whatsappDatabase; }

// হোয়াটসঅ্যাপ ইন্টিগ্রেশন রাউটের জন্য এক্সট্রা অ্যালাইয়াস
export const whatsappLogs = whatsappDatabase;

// --- নতুন ৩টি ফিচারের ডেটাবেজ ও লগ অ্যারে ---
export const invoiceDatabase = global.globalInvoiceDatabase || [];
if (!global.globalInvoiceDatabase) { global.globalInvoiceDatabase = invoiceDatabase; }

export const multilanguageLogs = global.globalMultilanguageDatabase || [];
if (!global.globalMultilanguageDatabase) { global.globalMultilanguageDatabase = multilanguageLogs; }

export const sentimentLogs = global.globalSentimentDatabase || [];
if (!global.globalSentimentDatabase) { global.globalSentimentDatabase = sentimentLogs; }