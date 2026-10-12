import { NextResponse } from 'next/server';
import twilio from 'twilio';

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
}

// মাল্টি-নিশ ডাইনামিক স্টাফ অ্যালার্ট মেসেজ ও ফোন জেনারেটর
const getUniversalAlertConfig = (body: StaffAlertRequestBody) => {
    const cleanNiche = body.niche && typeof body.niche === 'string' ? body.niche.trim().toLowerCase() : 'enterprise / general';
    const brand = body.brandName || 'Enterprise Global Desk';
    const name = body.fullName || body.clientName || body.name || 'Unknown';
    const contact = body.phone || 'N/A';
    const service = body.treatment || body.serviceType || 'General Consultation / Service';
    const issue = body.symptoms || body.issueDetails || 'Urgent Client Inquiry / Request';

    if (body.alertType === 'emergency') {
        const timeString = new Date().toLocaleTimeString('en-US');
        return {
            staffPhone: process.env.EMERGENCY_MANAGER_PHONE || process.env.EMERGENCY_DOCTOR_PHONE || process.env.STAFF_PHONE_NUMBER,
            message: `🆘 CRITICAL EMERGENCY (${brand})!\nClient: ${name}\nPhone: ${contact}\nIssue: ${issue}\nTime: ${timeString}\nAction: Immediate callback required!`
        };
    } else {
        if (cleanNiche.includes('solar')) {
            return {
                staffPhone: process.env.SOLAR_TEAM_PHONE || process.env.STAFF_PHONE_NUMBER,
                message: `⚡ NEW SOLAR LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\nInterest: ${service}\nStatus: Action Required.`
            };
        } else if (cleanNiche.includes('roofing')) {
            return {
                staffPhone: process.env.ROOFING_TEAM_PHONE || process.env.STAFF_PHONE_NUMBER,
                message: `🏠 NEW ROOFING LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\nProject: ${service}\nStatus: Action Required.`
            };
        } else if (cleanNiche.includes('real-estate') || cleanNiche.includes('real estate')) {
            return {
                staffPhone: process.env.REAL_ESTATE_TEAM_PHONE || process.env.STAFF_PHONE_NUMBER,
                message: `🏢 NEW LUXURY LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\nInquiry: ${service}\nStatus: Action Required.`
            };
        } else {
            return {
                staffPhone: process.env.STAFF_PHONE_NUMBER,
                message: `🚨 NEW VIP LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\nService: ${service}\nStatus: Action Required.`
            };
        }
    }
};

export async function POST(request: Request) {
    try {
        let body: StaffAlertRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { alertType, niche } = body;
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'enterprise / general';

        // ১. নিশ ও অ্যালার্ট টাইপ অনুযায়ী ডাইনামিক কনফিগারেশন নেওয়া
        const alertConfig = getUniversalAlertConfig(body);
        const staffPhone = alertConfig.staffPhone;

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !twilioPhone || !staffPhone) {
            console.warn('[Ultimate Staff Alert Warning] Twilio credentials or staff phone number missing in environment variables.');
            return NextResponse.json(
                { success: false, error: 'Server configuration error for SMS dispatch.' },
                { status: 500 }
            );
        }

        const twilioClient = twilio(accountSid, authToken);

        // ২. টুইলিও এসএমএস ডিসপ্যাচ করা
        try {
            await twilioClient.messages.create({
                body: alertConfig.message,
                from: twilioPhone,
                to: staffPhone
            });
        } catch (twilioErr: any) {
            console.error('[Universal Twilio Dispatch Error]:', twilioErr?.message || twilioErr);
        }

        console.log(`[Ultimate Universal Staff Alert API Success] Dispatched ${alertType || 'lead'} alert for niche: ${cleanNiche}`);

        // ৩. পারফেক্ট এন্টারপ্রাইজ রেসপন্স রিটার্ন করা
        return NextResponse.json(
            {
                success: true,
                message: 'Universal staff alert successfully dispatched via SMS!',
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Staff Alert API Critical Error]:', error?.message || error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to dispatch staff alert.' },
            { status: 500 }
        );
    }
}