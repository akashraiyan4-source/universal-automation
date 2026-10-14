import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// কাস্টম স্ট্যাটাস কোডসহ এরর থ্রো করার জন্য Enterprise Error Class
export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function handleApiError(error: unknown, defaultStatus = 500) {
  const timestamp = new Date().toISOString();

  // ১. Zod Validation Error হলে 400 Bad Request রিটার্ন করবে
  if (error instanceof ZodError) {
    console.warn('⚠️ [Validation Error]:', error.flatten().fieldErrors);
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed. Please check your input.',
        details: error.flatten().fieldErrors,
        timestamp,
      },
      { status: 400 }
    );
  }

  // ২. কাস্টম ApiError হলে নির্ধারিত স্ট্যাটাস কোড রিটার্ন করবে
  if (error instanceof ApiError) {
    console.warn(`⚠️ [API Error ${error.statusCode}]: ${error.message}`);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        ...(error.details ? { details: error.details } : {}),
        timestamp,
      },
      { status: error.statusCode }
    );
  }

  // ৩. সাধারণ বা অপ্রত্যাশিত সার্ভার এরর (500 Internal Server Error)
  console.error('🔥 [Enterprise Error Caught]:', error);

  const isProd = process.env.NODE_ENV === 'production';
  const rawMessage =
    error instanceof Error
      ? error.message
      : 'An unexpected internal server error occurred.';

  // প্রোডাকশনে ডেটাবেস বা সিস্টেমের গোপন এরর লুকিয়ে কাস্টমারকে নিরাপদ মেসেজ দেখানো
  const safeMessage =
    isProd && defaultStatus === 500
      ? 'An unexpected server error occurred. Please try again later.'
      : rawMessage;

  return NextResponse.json(
    {
      success: false,
      error: safeMessage,
      timestamp,
    },
    { status: defaultStatus }
  );
}