import { NextResponse } from 'next/server';
import { appointmentsDatabase } from '../../db';

// Enterprise-grade TypeScript Interface for Booking Payload
interface BookingRequestBody {
    fullName?: string;
    phone?: string;
    appointmentDate?: string;
    treatment?: string;
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: BookingRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { fullName, phone, appointmentDate, treatment, niche } = body;

        // ১. কঠোর ইনপুট ভ্যালিডেশন চেক
        if (
            !fullName || typeof fullName !== 'string' || fullName.trim() === '' ||
            !phone || typeof phone !== 'string' || phone.trim() === '' ||
            !appointmentDate || typeof appointmentDate !== 'string' || appointmentDate.trim() === ''
        ) {
            return NextResponse.json(
                { success: false, error: 'Missing or invalid required fields (fullName, phone, appointmentDate).' },
                { status: 400 }
            );
        }

        const cleanName = fullName.trim();
        const cleanPhone = phone.trim();
        const cleanTreatment = treatment ? treatment.trim() : 'General Consultation';
        const cleanNiche = niche ? niche.trim().toLowerCase() : 'general business';

        // ২. ইউনিক অ্যাপয়েন্টমেন্ট অবজেক্ট তৈরি (ইউনিভার্সাল প্রপার্টিসহ)
        const newAppointment = {
            id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: cleanName,
            phone: cleanPhone,
            appointmentDate: appointmentDate.trim(),
            treatment: cleanTreatment,
            niche: cleanNiche,
            status: 'CONFIRMED',
            createdAt: new Date().toISOString()
        };

        // ডাটাবেজে পুশ করা
        appointmentsDatabase.push(newAppointment);

        console.log(`[Universal Booking Engine] New appointment successfully booked for ${cleanName} (${cleanPhone}) in niche: ${cleanNiche}`);

        return NextResponse.json(
            { 
                success: true, 
                message: 'Appointment booked successfully.', 
                appointment: newAppointment 
            }, 
            { status: 201 }
        );

    } catch (error: any) {
        console.error('[Universal Booking Engine Critical Error]:', error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Server error during booking process.' 
            }, 
            { status: 500 }
        );
    }
}