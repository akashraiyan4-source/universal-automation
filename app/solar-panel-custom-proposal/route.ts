import { NextResponse } from 'next/server';

interface SolarProposalPayload {
  clientName: string;
  monthlyBill: number;
  roofType?: string;
  includeBatteryStorage?: boolean;
  phone: string;
}

export async function POST(request: Request) {
  try {
    const body: SolarProposalPayload = await request.json().catch(() => ({}));
    const { clientName, monthlyBill, roofType = 'Asphalt Shingle', includeBatteryStorage = true, phone } = body;

    if (!monthlyBill || !phone || !clientName) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required solar proposal parameters (clientName, monthlyBill, phone).' 
      }, { status: 400 });
    }

    // Enterprise Solar System & Battery Sizing Engine
    const systemSizeKW = Math.round((monthlyBill / 110) * 4.2 * 10) / 10;
    const baseSystemCost = systemSizeKW * 2800;
    const batteryCost = includeBatteryStorage ? 11500 : 0;
    const grossCost = baseSystemCost + batteryCost;
    const federalTaxCredit = Math.round(grossCost * 0.30);
    const netCost = grossCost - federalTaxCredit;

    const proposalId = `SOLAR-PROP-${Date.now()}`;

    return NextResponse.json({
      success: true,
      statusCode: 200,
      message: 'Custom solar proposal and battery storage estimation generated successfully.',
      data: {
        proposalId,
        clientName,
        systemSizeKW,
        includeBatteryStorage,
        estimatedGrossCostUSD: Math.round(grossCost),
        federalTaxCredit30PercentUSD: federalTaxCredit,
        estimatedNetCostUSD: Math.round(netCost),
        timestamp: new Date().toISOString()
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Solar Proposal Error]:', error?.message || error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate custom solar proposal.' 
    }, { status: 500 });
  }
}