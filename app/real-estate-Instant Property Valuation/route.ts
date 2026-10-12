import { NextResponse } from 'next/server';

interface ValuationPayload {
  propertyAddress: string;
  propertyCondition?: 'Excellent' | 'Good' | 'Fair' | 'Needs Renovation';
  bedrooms?: number;
  squareFeet?: number;
  ownerPhone: string;
}

export async function POST(request: Request) {
  try {
    const body: ValuationPayload = await request.json().catch(() => ({}));
    const { propertyAddress, propertyCondition = 'Good', bedrooms = 3, squareFeet = 2000, ownerPhone } = body;

    if (!propertyAddress || !ownerPhone) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing mandatory valuation fields (propertyAddress, ownerPhone).' 
      }, { status: 400 });
    }

    // Enterprise Real Estate Valuation Algorithm
    const baseValuation = squareFeet * 210;
    const conditionMultiplier = propertyCondition === 'Excellent' ? 1.15 : propertyCondition === 'Needs Renovation' ? 0.8 : 1.0;
    const estimatedMarketValue = Math.round(baseValuation * conditionMultiplier);
    const instantCashOffer = Math.round(estimatedMarketValue * 0.82);

    const valuationId = `PROP-VAL-${Date.now()}`;

    return NextResponse.json({
      success: true,
      statusCode: 200,
      message: 'Instant cash offer and property valuation calculated successfully.',
      data: {
        valuationId,
        propertyAddress,
        estimatedMarketValueUSD: estimatedMarketValue,
        instantCashOfferUSD: instantCashOffer,
        validityPeriod: '14 Days',
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Property Valuation Error]:', error?.message || error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process instant valuation.' 
    }, { status: 500 });
  }
}