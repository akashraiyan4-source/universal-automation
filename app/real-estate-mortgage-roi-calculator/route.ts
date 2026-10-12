import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { propertyPrice, downPaymentPercent, interestRate, loanTermYears } = await request.json().catch(() => ({}));

    if (!propertyPrice) {
      return NextResponse.json({ success: false, error: 'Property price is required for mortgage calculation.' }, { status: 400 });
    }

    const downPayment = propertyPrice * ((downPaymentPercent || 20) / 100);
    const loanAmount = propertyPrice - downPayment;
    const monthlyInterestRate = (interestRate || 6.5) / 100 / 12;
    const numberOfPayments = (loanTermYears || 30) * 12;

    const monthlyPayment = 
      (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    return NextResponse.json({
      success: true,
      message: 'Universal mortgage calculation completed successfully.',
      data: {
        propertyPrice,
        downPayment,
        loanAmount,
        estimatedMonthlyPaymentUSD: Math.round(monthlyPayment)
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Mortgage Calculator Error]:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Failed to calculate mortgage.' }, { status: 500 });
  }
}