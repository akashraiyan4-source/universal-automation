import { NextResponse } from 'next/server';
export function handleApiError(error: unknown) {
  console.error('🔥 Enterprise Error Caught:', error);
  const errorMessage = error instanceof Error ? error.message : 'An unexpected internal server error occurred.';
  return NextResponse.json(
    { success: false, error: errorMessage, timestamp: new Date().toISOString() },
    { status: 500 }
  );
}
