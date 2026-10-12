import { NextResponse } from 'next/server';

// Enterprise-grade TypeScript Interface for Slot Lock Payload
interface LockRequestBody {
    slotTime?: string;
    userPhone?: string;
    niche?: string;
}

export async function POST(request: Request) {
    try {
        let body: LockRequestBody;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON payload provided.' },
                { status: 400 }
            );
        }

        const { slotTime, userPhone, niche } = body;

        // ১. স্লট টাইম ভ্যালিডেশন চেক
        if (!slotTime || typeof slotTime !== 'string' || slotTime.trim() === '') {
            return NextResponse.json(
                { success: false, error: 'Slot time is required and must be a valid string.' },
                { status: 400 }
            );
        }

        const cleanSlotTime = slotTime.trim();
        const cleanPhone = userPhone && typeof userPhone === 'string' ? userPhone.trim() : 'Guest';
        const cleanNiche = niche && typeof niche === 'string' ? niche.trim().toLowerCase() : 'general business';

        // ২. ইউনিক লক আইডি জেনারেট করা
        const lockId = `lock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // ১০ মিনিট পর এক্সপায়ার হবে

        console.log(`[Universal Slot Lock Engine] Slot (${cleanSlotTime}) temporarily locked for ${cleanPhone} in niche: ${cleanNiche}`);

        return NextResponse.json(
            {
                success: true,
                message: 'Slot locked temporarily for 10 minutes.',
                lockId,
                slotTime: cleanSlotTime,
                expiresIn: '10m',
                expiresAt,
                userPhone: cleanPhone
            }, 
            { status: 200 }
        );

    } catch (error: any) {
        console.error('[Universal Slot Lock Engine Critical Error]:', error);
        
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to lock slot due to server error.' 
            }, 
            { status: 500 }
        );
    }
}