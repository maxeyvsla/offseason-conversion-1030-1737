export interface ApiCall {
  id: string;
  timestamp: string;
  request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: any;
    timestamp: string;
  };
  response: {
    status: number;
    data: any;
    timestamp: string;
    errorDetails?: {
      code: string;
      message: string;
    };
    rawResponse?: any;
  };
  acuityData?: {
    productId?: number;
    remainingCounts?: Record<string, number>;
    pricingTier?: {
      name: string;
      offseasonVSD: number;
      winterVSD: number;
    };
    conversionDetails?: {
      certificateCode?: string;
      conversionType?: 'upgrade' | 'adjustment';
      finalBalance?: number;
      newProductId?: number;
    };
  };
} 