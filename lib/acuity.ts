import { PRODUCT_TIERS } from "./config/pricing-tiers";

export function getAcuityHeaders(): HeadersInit {
  if (!process.env.ACUITY_USER_ID || !process.env.ACUITY_API_KEY) {
    throw new Error('Acuity credentials not found in environment variables');
  }

  const credentials = Buffer.from(
    `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
  ).toString('base64');

  return {
    'Authorization': `Basic ${credentials}`,
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    'Host': 'acuityscheduling.com',
    'Connection': 'close'
  };
}

export const ACUITY_API_BASE_URL = process.env.ACUITY_API_BASE_URL || 'https://acuityscheduling.com/api/v1';

export type AcuityApiError = {
  error: string;
  message: string;
  status: number;
};

export function isAcuityApiError(error: unknown): error is AcuityApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'status' in error &&
    'error' in error
  );
}

interface AcuityErrorResponse {
  status: number;
  message: string;
  error: 'invalid_certificate' | 'certificate_uses' | string;
}

interface PricingTier {
  readonly productIds: readonly number[];
  readonly offseasonVSD: number;
  readonly winterVSD: number;
}

interface AcuitySuccessResponse {
  productID: number;
  remainingCounts: {
    [key: string]: number;
  };
  certificate: string;
  id: string;
}

interface CertificateValidationResult {
  isValid: boolean;
  certificate?: {
    code: string;
    id?: string;
    remainingBalance: number;
    productId?: number;
    costPerSession?: number;
    totalCost?: number;
    adjustedBalance?: number;
    otherRemainingBalance?: number;
  };
  errorMessage?: string;
  error?: string;
}

export class AcuityClient {
  private baseUrl: string = ACUITY_API_BASE_URL;
  private headers: HeadersInit;
  private appointmentTypeId: string = '32116738';

  constructor() {
    if (!process.env.ACUITY_USER_ID || !process.env.ACUITY_API_KEY) {
      throw new Error('Missing Acuity credentials');
    }

    this.baseUrl = 'https://acuityscheduling.com/api/v1';
    
    const credentials = Buffer.from(
      `${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`
    ).toString('base64');

    this.headers = {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  getHeaders(): HeadersInit {
    return { ...this.headers };
  }

  async validateCertificate(certificateCode: string): Promise<CertificateValidationResult> {
    try {
      const params = new URLSearchParams({
        certificate: certificateCode,
        appointmentTypeID: this.appointmentTypeId
      });

      const response = await fetch(`${this.baseUrl}/certificates/check?${params.toString()}`, { 
        headers: this.headers 
      });
      const data = await response.json();

      console.log('Raw Acuity Response:', data);

      if (!response.ok) {
        return this.handleAcuityError(data as AcuityErrorResponse);
      }

      const { productID, remainingCounts, id } = data as AcuitySuccessResponse;
      const remainingBalance = remainingCounts[this.appointmentTypeId] || 0;

      const otherRemainingBalance = Object.entries(remainingCounts).reduce((sum, [id, count]) => {
        if (id !== this.appointmentTypeId) {
          return sum + count;
        }
        return sum;
      }, 0);

      console.log('Extracted Product ID:', productID);

      // Find pricing tier using the correct case
      let tier = (Object.values(PRODUCT_TIERS) as PricingTier[]).find(
        t => t.productIds.includes(productID)
      );

      console.log('Product ID lookup:', {
        productID,
        foundTier: tier ? 'yes' : 'no',
        defaultingToTier1: !tier && remainingBalance > 0 ? 'yes' : 'no',
        availableTiers: Object.entries(PRODUCT_TIERS).map(([name, t]) => ({
          name,
          productIds: t.productIds
        }))
      });

      // Default to TIER_1 if there are remaining sessions but no tier match
      if (!tier && remainingBalance > 0) {
        console.log('No tier found for productID, defaulting to TIER_1');
        tier = PRODUCT_TIERS.TIER_1;
      } else if (!tier) {
        return {
          isValid: false,
          errorMessage: `No remaining sessions found for certificate`,
          error: 'no_remaining_sessions'
        };
      }

      // Calculate conversion options with the found or default tier
      const costPerSession = tier.winterVSD - tier.offseasonVSD;
      const totalCost = costPerSession * remainingBalance;
      const adjustedBalance = remainingBalance === 1 ? 0 : Math.round((tier.offseasonVSD * remainingBalance) / tier.winterVSD);

      return {
        isValid: true,
        certificate: {
          code: certificateCode,
          id,
          remainingBalance,
          productId: productID,
          costPerSession,
          totalCost,
          adjustedBalance,
          ...(otherRemainingBalance > 0 ? { otherRemainingBalance } : {})
        }
      };

    } catch (error) {
      console.error('Certificate validation error:', error);
      return {
        isValid: false,
        error: 'validation_failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private handleAcuityError(errorData: AcuityErrorResponse): CertificateValidationResult {
    return {
      isValid: false,
      error: errorData.error,
      errorMessage: errorData.message
    };
  }

  async deleteCertificate(certificateCode: string, certificateId: string): Promise<void> {
    console.log('\n🔍 Attempting to delete certificate:', { code: certificateCode, id: certificateId });
    
    const response = await fetch(
      `${this.baseUrl}/certificates/${certificateId}`,
      {
        method: 'DELETE',
        headers: this.headers
      }
    );

    console.log('📡 Delete Response Status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Delete Error Response:', errorData);
      throw new Error(`Failed to delete certificate: ${errorData}`);
    }
  }

  async createCertificate(params: {
    code: string;
    productId: number;
    email: string;
  }): Promise<{ code: string; winterBalance: number }> {
    const response = await fetch(`${this.baseUrl}/certificates`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        certificate: params.code,
        productID: params.productId,
        email: params.email
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create certificate');
    }

    const data = await response.json();
    const winterBalance = data.remainingCounts?.['25250022'] || 0;

    return { 
      code: params.code,
      winterBalance 
    };
  }
}