import { NextRequest, NextResponse } from 'next/server';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

// গোপন ডেটা (যেমন API Key, Password) লগে দেখানো থেকে বিরত রাখার ফাংশন
function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'api_key', 'apikey'];
  const sanitized: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(meta)) {
    if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
      sanitized[k] = '[REDACTED]';
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

// যেকোনো API Route-এর ভেতরে ব্যবহারের জন্য Enterprise Structured Logger
export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    this.log('INFO', message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    this.log('WARN', message, meta);
  },
  error(message: string, error?: unknown, meta?: Record<string, unknown>) {
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error;
    this.log('ERROR', message, { ...meta, error: errorDetails });
  },
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('DEBUG', message, meta);
    }
  },
  log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const safeMeta = sanitizeMeta(meta);
    const metaString = safeMeta ? ` | ${JSON.stringify(safeMeta)}` : '';
    const output = `[${timestamp}] [${level}] ${message}${metaString}`;

    if (level === 'ERROR') {
      console.error(output);
    } else if (level === 'WARN') {
      console.warn(output);
    } else {
      console.log(output);
    }
  },
};

// Middleware হিসেবে রিকোয়েস্ট ট্র্যাকিং, সিকিউরিটি এবং CORS হ্যান্ডলিং
export function requestLoggerMiddleware(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const method = request.method;
  const pathname = request.nextUrl?.pathname || request.url;
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown-ip';
  const requestId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  console.log(
    `[${timestamp}] [REQ:${requestId}] ${method} ${pathname} (IP: ${clientIp})`
  );

  // ব্রাউজারের Preflight (OPTIONS) রিকোয়েস্ট হ্যান্ডেল করা যাতে ল্যান্ডিং পেজে CORS এরর না আসে
  if (method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Request-ID',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const response = NextResponse.next();

  // Enterprise Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Request-ID', requestId);

  // CORS Headers (যাতে Dental ও Cosmetic ফ্রন্টএন্ড সরাসরি কানেক্ট করতে পারে)
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Request-ID');

  return response;
}