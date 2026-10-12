import { NextRequest, NextResponse } from 'next/server';

export function requestLoggerMiddleware(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const method = request.method;
  const url = request.url;
  console.log(`[${timestamp}] ${method} request received at ${url}`);
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}