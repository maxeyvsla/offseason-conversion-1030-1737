import { NextResponse } from 'next/server';
import { AcuityClient } from '@/lib/acuity';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateCode = searchParams.get('certificate');

    if (!certificateCode) {
      return NextResponse.json({
        error: 'missing_certificate',
        errorMessage: 'Certificate code is required'
      }, { status: 400 });
    }

    const acuity = new AcuityClient();
    const result = await acuity.validateCertificate(certificateCode);

    if (!result.isValid) {
      return NextResponse.json({
        error: result.error,
        errorMessage: result.errorMessage
      }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Certificate validation error:', error);
    return NextResponse.json({
      error: 'internal_server_error',
      errorMessage: 'An unexpected error occurred'
    }, { status: 500 });
  }
}