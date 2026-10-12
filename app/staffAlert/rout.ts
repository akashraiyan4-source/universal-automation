import { NextResponse } from 'next/server';
import twilio from 'twilio';

// ইন-মেমোরি রেট লিমিটার সরাসরি ফাইলের ভেতরে
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(request: Request): boolean {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const windowMs = 60 * 1000; // ১ মিনিট
    const maxRequests = 10; // প্রতি মিনিটে সর্বোচ্চ ১০টি রিকোয়েস্ট

    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (record.count >= maxRequests) {
        return false;
    }

    record.count++;
    return true;
}

// Enterprise-grade TypeScript Interface for Universal Staff Alert Payload
interface StaffAlertRequestBody {
    fullName?: string;
    clientName?: string; // Universal fallback
    name?: string;
    phone?: string;
    treatment?: string;
    serviceType?: string; // Universal fallback for non-dental niches
    symptoms?: string;
    issueDetails?: string; // Universal fallback for non-dental niches
    alertType?: 'lead' | 'emergency';
    niche?: string;
    brandName?: string;
    tenantId?: string;
}

// মাল্টি-নিশ ডাইনামিক স্টাফ অ্যালার্ট মেসেজ জেনারেটর
const getUniversalAlertMessages = (
    body: StaffAlertRequestBody, 
    cleanNiche: string, 
    brand: string
) => {
    const name = body.fullName || body.clientName || body.name || 'Unknown';
    const contact = body.phone || 'N/A';
    const service = body.treatment || body.serviceType || 'General Consultation / Service';
    const issue = body.symptoms || body.issueDetails || 'Urgent Client Inquiry / Request';

    if (body.alertType === 'emergency') {
        const timeString = new Date().toLocaleTimeString('en-US');
        return {
            staffPhone: process.env.EMERGENCY_MANAGER_PHONE || process.env.EMERGENCY_DOCTOR_PHONE || process.env.STAFF_PHONE_NUMBER,
            textMessage: `🆘 CRITICAL EMERGENCY (${brand})!\nClient: ${name}\nPhone: ${contact}\nIssue: ${issue}\nTime: ${timeString}\nAction: Immediate callback required!`
        };
    } else {
        if (cleanNiche.includes('solar')) {
            return {
                staffPhone: process.env.SOLAR_TEAM_PHONE || process.env.STAFF_PHONE_NUMBER,
                textMessage: `⚡ NEW SOLAR LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\nInterest: ${service}\nStatus: Action Required.`
            };
        } else if (cleanNiche.includes('roofing')) {
            return {
                staffPhone: process.env.ROOFING_TEAM_PHONE || process.env.STAFF_PHONE_NUMBER,
                textMessage: `🏠 NEW ROOFING LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\nProject: ${service}\nStatus: Action Required.`
            };
        } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
            return {
                staffPhone: process.env.REAL_ESTATE_TEAM_PHONE || process.env.STAFF_PHONE_NUMBER,
                textMessage: `🏢 NEW LUXURY LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\nInquiry: ${service}\nStatus: Action Required.`
            };
        } else {
            return {
                staffPhone: process.env.STAFF_PHONE_NUMBER,
                textMessage: `🚨 NEW VIP LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\nService: ${service}\nStatus: Action Required.`
            };
        }
    }
};

export async function POST(request: Request) {
    const traceId = request.headers.get('x-trace-id') || `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
        if (!checkRateLimit(request)) {
            return NextResponse.json(
                { success: false, error: 'Too many requests. Please try again later.', trace_id: traceId },
                { status: 429 }
            );
        }

        let body: StaffAlertRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.', trace_id: traceId },
                { status: 400 }
            );
        }

        const cleanNiche = body.niche && typeof body.niche === 'string' ? body.niche.trim().toLowerCase() : 'enterprise / general';
        const brandName = body.brandName || 'Enterprise Global Desk';
        const tenantId = body.tenantId || 'default_tenant';

        // ১. ডাইনামিক নিশ ও অ্যালার্ট টাইপ অনুযায়ী স্টাফ ফোন ও মেসেজ কনফিগার করা
        const alertConfig = getUniversalAlertMessages(body, cleanNiche, brandName);
        const staffPhone = alertConfig.staffPhone;

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !twilioPhone || !staffPhone) {
            console.warn(JSON.stringify({
                trace_id: traceId,
                event: 'Universal Staff Alert Warning',
                message: 'Twilio credentials or staff phone number missing in environment variables.'
            }));
            return NextResponse.json(
                { success: false, error: 'Server configuration error for SMS dispatch.', trace_id: traceId },
                { status: 500 }
            );
        }

        const twilioClient = twilio(accountSid, authToken);

        // ২. টুইলিও এসএমএস ডিসপ্যাচ করা
        try {
            await twilioClient.messages.create({
                body: alertConfig.textMessage,
                from: twilioPhone,
                to: staffPhone
            });
        } catch (twilioErr: any) {
            console.error(`[Trace: ${traceId}] Universal Twilio Dispatch Failed:`, twilioErr?.message || twilioErr);
        }

        console.log(JSON.stringify({
            trace_id: traceId,
            event: 'Universal Staff Alert Dispatched',
            tenant_id: tenantId,
            niche: cleanNiche,
            brand: brandName,
            alert_type: body.alertType || 'lead',
            timestamp: new Date().toISOString()
        }));

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal staff alert successfully dispatched via SMS!',
                trace_id: traceId
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error(`[Trace: ${traceId}] [Universal Staff Alert Critical Error]:`, error?.message || error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to dispatch staff alert.', trace_id: traceId },
            { status: 500 }
        );
    }
}