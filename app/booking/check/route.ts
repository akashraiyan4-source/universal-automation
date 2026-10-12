import { NextResponse } from 'next/server';
import { appointmentsDatabase } from '../../db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawPhone = searchParams.get('phone');

        // ১. ফোন নম্বর প্যারামিটার ভ্যালিডেশন চেক
        if (!rawPhone || typeof rawPhone !== 'string' || rawPhone.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Phone query parameter is required and must be a valid string.' },
                { status: 400 }
            );
        }

        const cleanPhone = rawPhone.trim();

        // ২. ডাটাবেজ থেকে অ্যাক্টিভ অ্যাপয়েন্টমেন্ট খুঁজে বের করা (বাতিল হওয়া বাদ দিয়ে)
        const activeAppointment = appointmentsDatabase.find(
            (apt: any) => apt.phone === cleanPhone && apt.status !== 'CANCELLED'
        );

        if (!activeAppointment) {
            return NextResponse.json(
                { success: false, message: 'No active appointment found for this phone number.' },
                { status: 404 }
            );
        }

        console.log(`[Universal Appointment Check] Active appointment found for phone: ${cleanPhone}`);

        return NextResponse.json(
            { 
                success: true, 
                appointment: activeAppointment 
            }, 
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Universal Appointment Check Critical Error]:', error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Server error during appointment verification.' 
            }, 
            { status: 500 }
        );
    }
}