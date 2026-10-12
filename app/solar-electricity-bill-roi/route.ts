import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { monthlyBill, stateCode } = await request.json().catch(() => ({}));

    if (!monthlyBill) {
      return NextResponse.json({ success: false, error: 'Monthly electricity bill is required.' }, { status: 400 });
    }

    // Universal solar savings estimation model
    const annualBill = monthlyBill * 12;
    const estimatedSavings25Years = Math.round(annualBill * 0.75 * 25);
    const estimatedSystemSizeKW = Math.round((monthlyBill / 120) * 4);
    const paybackPeriodYears = 6.2;

    return NextResponse.json({
      success: true,
      message: 'Universal solar ROI simulation successful.',
      data: {
        monthlyBill,
        estimatedSystemSizeKW,
        paybackPeriodYears,
        projectedSavings25YearsUSD: estimatedSavings25Years,
        region: stateCode || 'US-Universal'
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Solar ROI Error]:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Failed to compute solar ROI.' }, { status: 500 });
  }
}