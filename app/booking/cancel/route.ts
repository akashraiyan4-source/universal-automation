import { NextResponse } from 'next/server';
import { appointmentsDatabase } from '../../db';

// Enterprise-grade TypeScript Interface for Cancellation Payload
interface CancelRequestBody {
    phone?: string;
    appointmentId?: string;
    cancellationReason?: string;
}

export async function POST(request: Request) {
    try {
        let body: CancelRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { phone, appointmentId, cancellationReason } = body;

        // ১. আইডেন্টিফায়ার ভ্যালিডেশন চেক
        if (
            (!phone || typeof phone !== 'string' || phone.trim() === '') &&
            (!appointmentId || typeof appointmentId !== 'string' || appointmentId.trim() === '')
        ) {
            return NextResponse.json(
                { success: false, error: 'Valid phone or appointmentId is required for cancellation.' },
                { status: 400 }
            );
        }

        const cleanPhone = phone ? phone.trim() : '';
        const cleanId = appointmentId ? appointmentId.trim() : '';
        const cleanReason = cancellationReason && typeof cancellationReason === 'string' ? cancellationReason.trim() : 'Not specified';

        // ২. ডাটাবেজ থেকে অ্যাপয়েন্টমেন্ট খুঁজে বের করা
        const appointment = appointmentsDatabase.find((apt: any) => 
            (cleanId && apt.id === cleanId) || (cleanPhone && apt.phone === cleanPhone)
        );

        if (!appointment) {
            return NextResponse.json(
                { success: false, error: 'Active appointment not found matching the provided identifier.' },
                { status: 404 }
            );
        }

        // ৩. অ্যাপয়েন্টমেন্ট স্ট্যাটাস আপডেট করা
        appointment.status = 'CANCELLED';
        appointment.cancellationReason = cleanReason;
        appointment.cancelledAt = new Date().toISOString();

        console.log(`[Universal Cancellation Engine] Appointment successfully cancelled for ID: ${appointment.id}`);

        return NextResponse.json(
            { 
                success: true, 
                message: 'Appointment cancelled successfully.', 
                appointment 
            }, 
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Universal Cancellation Engine Critical Error]:', error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Server error during cancellation process.' 
            }, 
            { status: 500 }
        );
    }
}