import { NextResponse } from 'next/server';
import { appointmentsDatabase } from '../../db';

// Enterprise-grade TypeScript Interface for Reschedule Payload
interface RescheduleRequestBody {
    appointmentId?: string;
    phone?: string;
    newDate?: string;
    reason?: string;
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: RescheduleRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload structure provided.' },
                { status: 400 }
            );
        }

        const { appointmentId, phone, newDate, reason, niche } = body;

        // ১. কঠোর ইনপুট ও আইডেন্টিফায়ার ভ্যালিডেশন চেক
        if (
            (!appointmentId || typeof appointmentId !== 'string' || appointmentId.trim() === '') &&
            (!phone || typeof phone !== 'string' || phone.trim() === '')
        ) {
            return NextResponse.json(
                { success: false, error: 'Valid appointmentId or phone is required for rescheduling.' },
                { status: 400 }
            );
        }

        if (!newDate || typeof newDate !== 'string' || newDate.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'New appointment date (newDate) is required.' },
                { status: 400 }
            );
        }

        const cleanId = appointmentId ? appointmentId.trim() : '';
        const cleanPhone = phone ? phone.trim() : '';
        const cleanNewDate = newDate.trim();
        const cleanReason = reason && typeof reason === 'string' ? reason.trim() : 'Client requested rescheduling';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'general business';

        // ২. ডাটাবেজ থেকে অ্যাপয়েন্টমেন্ট খুঁজে বের করা
        const appointment = appointmentsDatabase.find((apt: any) => 
            (cleanId && apt.id === cleanId) || (cleanPhone && apt.phone === cleanPhone)
        );

        if (!appointment) {
            return NextResponse.json(
                { success: false, error: 'Active appointment not found matching the provided details.' },
                { status: 404 }
            );
        }

        // ৩. রিশিডিউল হিস্ট্রি ও স্টেট আপডেট করা
        const previousDate = appointment.appointmentDate;
        appointment.appointmentDate = cleanNewDate;
        appointment.status = 'RESCHEDULED';
        appointment.rescheduleReason = cleanReason;
        appointment.previousDate = previousDate;
        appointment.niche = cleanNiche;
        appointment.updatedAt = new Date().toISOString();

        console.log(`[Ultimate Universal Reschedule Engine] Appointment ${appointment.id} successfully rescheduled from ${previousDate} to ${cleanNewDate} for niche: ${cleanNiche}`);

        return NextResponse.json(
            { 
                success: true, 
                message: 'Appointment rescheduled successfully!', 
                appointment 
            }, 
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Ultimate Universal Reschedule Engine Critical Error]:', error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Internal server error during appointment rescheduling.' 
            }, 
            { status: 500 }
        );
    }
}