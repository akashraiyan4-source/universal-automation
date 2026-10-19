import { z } from 'zod';
import twilio from 'twilio';
import { ok, parseJson, withApi } from '@/src/lib/api';
import { env } from '@/src/lib/env';
import { maskPhone } from '@/src/lib/sanitize';
import { ApiError } from '@/src/middlewares/errorHandler';
import { logger } from '@/src/middlewares/logger';
import { nicheField } from '@/src/validators/commonValidator';
import { twilioCircuitBreaker } from '@/app/utils/circuit-breaker';

const text = (max: number) => z.string().trim().max(max).optional();

const schema = z.object({
    fullName: text(100),
    clientName: text(100), // universal fallback
    name: text(100),
    phone: text(30),
    treatment: text(120),
    serviceType: text(120), // universal fallback for non-dental niches
    symptoms: text(500),
    issueDetails: text(500), // universal fallback for non-dental niches
    alertType: z.enum(['lead', 'emergency']).optional(),
    niche: nicheField,
    brandName: text(80),
    tenantId: text(64),
});

type StaffAlertBody = z.infer<typeof schema>;

const NICHE_HEADLINES: Record<string, { icon: string; label: string; field: string }> = {
    solar: { icon: '⚡', label: 'SOLAR', field: 'Interest' },
    roofing: { icon: '🏠', label: 'ROOFING', field: 'Project' },
    'real-estate': { icon: '🏢', label: 'LUXURY', field: 'Inquiry' },
};

/**
 * Staff phone resolution – zero code changes for new niches:
 *   emergency → EMERGENCY_MANAGER_PHONE | EMERGENCY_DOCTOR_PHONE | STAFF_PHONE_NUMBER
 *   lead      → <NICHE>_TEAM_PHONE (e.g. MEDSPA_TEAM_PHONE, REAL_ESTATE_TEAM_PHONE) | STAFF_PHONE_NUMBER
 */
function resolveStaffPhone(niche: string, emergency: boolean): string | undefined {
    if (emergency) {
        return env.get('EMERGENCY_MANAGER_PHONE') ?? env.get('EMERGENCY_DOCTOR_PHONE') ?? env.get('STAFF_PHONE_NUMBER');
    }
    const nicheKey = `${niche.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_TEAM_PHONE`;
    return env.get(nicheKey) ?? env.get('STAFF_PHONE_NUMBER');
}

function buildMessage(body: StaffAlertBody, niche: string, brand: string): string {
    const name = body.fullName || body.clientName || body.name || 'Unknown';
    const contact = body.phone || 'N/A';
    const service = body.treatment || body.serviceType || 'General Consultation / Service';
    const issue = body.symptoms || body.issueDetails || 'Urgent Client Inquiry / Request';

    if (body.alertType === 'emergency') {
        const time = new Date().toLocaleTimeString('en-US');
        return `🆘 CRITICAL EMERGENCY (${brand})!\nClient: ${name}\nPhone: ${contact}\nIssue: ${issue}\nTime: ${time}\nAction: Immediate callback required!`;
    }

    const headline = Object.entries(NICHE_HEADLINES).find(([key]) => niche.includes(key))?.[1];
    if (headline) {
        return `${headline.icon} NEW ${headline.label} LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\n${headline.field}: ${service}\nStatus: Action Required.`;
    }
    return `🚨 NEW VIP LEAD (${brand})!\nName: ${name}\nPhone: ${contact}\nService: ${service}\nStatus: Action Required.`;
}

/**
 * POST /staffAlert   (alias: POST /api/staff-alert)
 * Texts the on-call staff member for the given niche. Rate limiting is enforced globally by the proxy (strict tier).
 */
async function POSTHandler(request: Request) {
    const traceId = request.headers.get('x-trace-id') || request.headers.get('x-request-id') || crypto.randomUUID();
    const body = await parseJson(request, schema);

    const brand = body.brandName || 'Enterprise Global Desk';
    const niche = body.niche;
    const staffPhone = resolveStaffPhone(niche, body.alertType === 'emergency');

    const accountSid = env.twilioAccountSid();
    const authToken = env.twilioAuthToken();
    const twilioPhone = env.twilioPhone();

    if (!accountSid || !authToken || !twilioPhone || !staffPhone) {
        logger.warn('staffalert.not_configured', { trace_id: traceId, niche });
        throw new ApiError('Staff alerting is not configured.', 503);
    }

    try {
        const client = twilio(accountSid, authToken);
        await twilioCircuitBreaker.fire(() =>
            client.messages.create({ body: buildMessage(body, niche, brand).slice(0, 700), from: twilioPhone, to: staffPhone })
        );
    } catch (error) {
        logger.error('staffalert.dispatch_failed', error, { trace_id: traceId, niche });
        throw new ApiError('Failed to dispatch the staff alert. Please try again.', 502);
    }

    logger.info('staffalert.dispatched', {
        trace_id: traceId,
        tenant_id: body.tenantId || 'default_tenant',
        niche,
        brand,
        alert_type: body.alertType || 'lead',
        staff: maskPhone(staffPhone),
    });

    return ok({ trace_id: traceId }, { message: 'Staff alert successfully dispatched via SMS!', legacy: { trace_id: traceId } });
}

export const POST = withApi(POSTHandler);
