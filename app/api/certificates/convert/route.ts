import { NextResponse } from 'next/server';
import { AcuityClient } from '@/lib/acuity';
import { WINTER_PRODUCT_IDS } from '@/lib/config/conversion-product-ids';

interface ConversionRequest {
  certificateCode: string;
  certificateId: string;
  email: string;
  conversionType: 'upgrade' | 'adjustment';
  currentBalance: number;
  adjustedBalance: number;
  otherRemainingBalance: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ConversionRequest;
    const acuity = new AcuityClient();

    // Calculate total sessions after conversion
    const finalBalance = body.conversionType === 'upgrade' 
      ? body.currentBalance + (body.otherRemainingBalance || 0)
      : body.adjustedBalance + (body.otherRemainingBalance || 0);

    // Get corresponding winter product ID (subtract 1 for zero-based array)
    const productId = WINTER_PRODUCT_IDS[finalBalance - 1];
    
    if (!productId) {
      return NextResponse.json({
        error: 'invalid_balance',
        errorMessage: `No product ID found for ${finalBalance} sessions`
      }, { status: 400 });
    }

    // Log delete certificate request
    console.log('\n🔄 Acuity Delete Certificate Request:', {
      url: `${process.env.ACUITY_API_BASE_URL}/certificates/redeem/${encodeURIComponent(body.certificateCode)}`,
      method: 'DELETE',
      headers: acuity.getHeaders()
    });

    // Delete existing certificate using ID from validation
    await acuity.deleteCertificate(body.certificateCode, body.certificateId);

    // Log create certificate request
    console.log('\n✨ Acuity Create Certificate Request:', {
      url: `${process.env.ACUITY_API_BASE_URL}/certificates`,
      method: 'POST',
      headers: acuity.getHeaders(),
      body: {
        certificate: body.certificateCode,
        productID: productId,
        email: body.email
      }
    });

    // Create new certificate
    const newCertificate = await acuity.createCertificate({
      code: body.certificateCode,
      productId,
      email: body.email
    });

    return NextResponse.json({
      success: true,
      certificate: {
        code: newCertificate.code,
        finalBalance: newCertificate.winterBalance
      }
    });

  } catch (error) {
    console.error('Certificate conversion error:', error);
    return NextResponse.json({
      error: 'conversion_failed',
      errorMessage: error instanceof Error ? error.message : 'Certificate conversion failed'
    }, { status: 500 });
  }
} 