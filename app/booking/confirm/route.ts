import { NextResponse } from 'next/server';
import { appointmentsDatabase } from '../../db';

// Enterprise-grade TypeScript Interface for Confirmation Payload
interface ConfirmRequestBody {
    appointmentId?: string;
    phone?: string;
}

export async function POST(request: Request) {
    try {
        let body: ConfirmRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { appointmentId, phone } = body;

        // ১. আইডেন্টিফায়ার ভ্যালিডেশন চেক
        if (
            (!appointmentId || typeof appointmentId !== 'string' || appointmentId.trim() === '') &&
            (!phone || typeof phone !== 'string' || phone.trim() === '')
        ) {
            return NextResponse.json(
                { success: false, error: 'Valid appointmentId or phone is required to confirm.' },
                { status: 400 }
            );
        }

        const cleanId = appointmentId ? appointmentId.trim() : '';
        const cleanPhone = phone ? phone.trim() : '';

        // ২. ডাটাবেজ থেকে অ্যাপয়েন্টমেন্ট খুঁজে বের করা
        const appointment = appointmentsDatabase.find((apt: any) => 
            (cleanId && apt.id === cleanId) || (cleanPhone && apt.phone === cleanPhone)
        );

        if (!appointment) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found matching the provided details.' },
                { status: 404 }
            );
        }

        // ৩. স্ট্যাটাস আপডেট ও কনফার্ম করা
        appointment.status = 'CONFIRMED';
        appointment.updatedAt = new Date().toISOString();

        console.log(`[Universal Confirmation Engine] Appointment successfully confirmed for ID: ${appointment.id}`);

        return NextResponse.json(
            { 
                success: true, 
                message: 'Appointment successfully confirmed!', 
                appointment 
            }, 
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Universal Confirmation Engine Critical Error]:', error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Server error during appointment confirmation.' 
            }, 
            { status: 500 }
        );
    }
}