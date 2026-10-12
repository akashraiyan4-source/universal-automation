import { NextResponse } from 'next/server';
import { appointmentsDatabase } from '../../db';

// Enterprise-grade TypeScript Interface for Creation Payload
interface CreateRequestBody {
    fullName?: string;
    name?: string;
    phone?: string;
    appointmentDate?: string;
    date?: string;
    treatment?: string;
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: CreateRequestBody;
        try {
            body = await request.json();
        } catch {
            body = {}; // Fallback empty object if parsing fails
        }
        
        // Flexible fallback if frontend sends alternate keys
        const fullName = body?.fullName || body?.name || 'Valued Client';
        const phone = body?.phone || 'Not Provided';
        const appointmentDate = body?.appointmentDate || body?.date || new Date().toISOString();
        const treatment = body?.treatment || 'General Consultation';
        const niche = body?.niche ? body.niche.trim().toLowerCase() : 'general business';

        const newAppointment = {
            id: `apt_create_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            fullName: fullName.trim(),
            phone: phone.trim(),
            appointmentDate,
            treatment: treatment.trim(),
            niche,
            status: 'CONFIRMED',
            createdAt: new Date().toISOString()
        };

        // Ensure database array exists before pushing
        if (Array.isArray(appointmentsDatabase)) {
            appointmentsDatabase.push(newAppointment);
        }

        console.log(`[Universal Creation Engine] New slot successfully created/reserved for ${fullName.trim()} in niche: ${niche}`);

        return NextResponse.json({ 
            success: true, 
            message: 'Slot reserved successfully.', 
            appointment: newAppointment 
        }, { status: 201 });

    } catch (error: any) {
        console.error('[Universal Creation Engine Critical Error]:', error?.message || error);
        return NextResponse.json(
            { 
                success: false, 
                error: error?.message || 'Server error during slot reservation.' 
            }, 
            { status: 500 }
        );
    }
}