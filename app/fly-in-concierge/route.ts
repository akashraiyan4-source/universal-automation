import { NextResponse } from 'next/server';

// Enterprise-grade TypeScript Interface for VIP Fly-In Logistics Payload
interface FlyInConciergePayload {
    name?: string;
    email?: string;
    arrivalDate?: string;
    airport?: string;
    requiresHotel?: boolean | string;
    niche?: string;
}

export async function POST(req: Request) {
    try {
        let body: FlyInConciergePayload;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { name, email, arrivalDate, airport, requiresHotel, niche } = body;

        // ১. কঠোর ইনপুট ভ্যালিডেশন চেক
        if (
            !name || typeof name !== 'string' || name.trim() === '' ||
            !arrivalDate || typeof arrivalDate !== 'string' || arrivalDate.trim() === '' ||
            !airport || typeof airport !== 'string' || airport.trim() === ''
        ) {
            return NextResponse.json(
                { success: false, error: 'Missing required VIP logistics parameters (name, arrivalDate, airport).' },
                { status: 400 }
            );
        }

        const cleanName = name.trim();
        const cleanEmail = email && typeof email === 'string' ? email.trim() : 'Not Provided';
        const cleanDate = arrivalDate.trim();
        const cleanAirport = airport.trim();
        const cleanHotelReq = requiresHotel !== undefined ? requiresHotel : false;
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'luxury business';

        // ২. ইউনিক ট্র্যাকিং বা রেফারেন্স আইডি জেনারেট করা
        const conciergeRefId = `VIP-LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        // ৩. লজিস্টিকস বা ট্রাভেল পার্টনারদের কাছে নোটিফিকেশন পাঠানোর অটোমেশন মেসেজ
        const workflowMessage = `VIP Concierge workflow initiated for ${cleanName} (${cleanEmail}) within the ${cleanNiche} sector. Arrival Hub: ${cleanAirport} on ${cleanDate}. Hotel Accommodation Required: ${cleanHotelReq ? 'Yes' : 'No'}`;

        console.log(`[Ultimate Universal Fly-In Engine] ${workflowMessage} [Ref: ${conciergeRefId}]`);

        // ৪. পারফেক্ট JSON রেসপন্স রিটার্ন করা
        return NextResponse.json({ 
            success: true, 
            message: workflowMessage, 
            status: "VIP_LOGISTICS_TRIGGERED",
            data: {
                conciergeRefId,
                name: cleanName,
                email: cleanEmail,
                arrivalDate: cleanDate,
                airport: cleanAirport,
                requiresHotel: cleanHotelReq,
                niche: cleanNiche,
                dispatchedAt: new Date().toISOString()
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('[Ultimate Universal Fly-In Engine Critical Error]:', error?.message || error);
        return NextResponse.json(
            { 
                success: false, 
                message: error?.message || 'Internal Server Error during VIP logistics processing.' 
            }, 
            { status: 500 }
        );
    }
}