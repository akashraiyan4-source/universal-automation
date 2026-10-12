// utils/rate-limit.ts
import { NextResponse } from 'next/server';

// একটি সিম্পল ইন-মেমোরি স্টোরেজ (প্রোডাকশনে পরে রেডিস দিয়ে করা যাবে)
const ipRequestMap = new Map<string, { count: number; lastReset: number }>();

const WINDOW_MS = 60 * 1000; // ১ মিনিট
const MAX_REQUESTS = 10;    // প্রতি মিনিটে সর্বোচ্চ ১০টি রিকোয়েস্ট

export function checkRateLimit(request: Request): boolean {
    // ক্লায়েন্টের আইপি বা ইউনিক আইডি বের করা
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    const now = Date.now();
    let record = ipRequestMap.get(clientIp);

    if (!record) {
        ipRequestMap.set(clientIp, { count: 1, lastReset: now });
        return true;
    }

    // টাইম উইন্ডো পার হয়ে গেলে রিসেট হবে
    if (now - record.lastReset > WINDOW_MS) {
        record.count = 1;
        record.lastReset = now;
        return true;
    }

    // লিমিট ক্রস করলে
    if (record.count >= MAX_REQUESTS) {
        return false; // লিমিট শেষ
    }

    record.count += 1;
    return true;
}