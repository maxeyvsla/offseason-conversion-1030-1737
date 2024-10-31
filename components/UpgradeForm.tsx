'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, CreditCard, ArrowLeft, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import ConfirmationModal from './ConfirmationModal';
import ContactForm from './ContactForm';
import ImageLightbox from './ImageLightbox';
import Confetti from './Confetti';
import DebugPanel from './DebugPanel';
import { PRODUCT_TIERS } from "@/lib/config/pricing-tiers";
import { ApiCall } from '@/types/api';
import { loadStripe } from '@stripe/stripe-js';

interface ApiDebugInfo {
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    timestamp?: string;
    body?: any;
  };
  response?: {
    status: number;
    data: any;
    timestamp?: string;
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

interface ProductTierData {
  readonly productIds: readonly number[];
  readonly offseasonVSD: number;
  readonly winterVSD: number;
}

const step1Schema = z.object({
  certificateCode: z.string()
    .length(8, 'Certificate code must be exactly 8 characters')
    .toUpperCase(),
  email: z.string().email('Invalid email address'),
});

const step2Schema = z.object({
  conversionOption: z.string(),
});

interface CertificateData {
  code: string;
  id: string;
  remainingBalance: number;
  productId: number;
  costPerSession: number;
  totalCost: number;
  adjustedBalance: number;
  otherRemainingBalance?: number;
}

// Add near top of file, outside component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function UpgradeForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const { toast } = useToast();

  const upgradePrice = certificateData?.costPerSession ?? 0;
  const totalUpgradePrice = certificateData?.totalCost ?? 0;
  const adjustedSessions = certificateData?.adjustedBalance ?? 0;
  const remainingSessions = certificateData?.remainingBalance ?? 0;

  const form = useForm<z.infer<typeof step1Schema> & z.infer<typeof step2Schema>>({
    resolver: zodResolver(step === 1 ? step1Schema : step2Schema),
    defaultValues: {
      certificateCode: '',
      email: '',
      conversionOption: undefined,
    },
  });

  const addApiCall = (call: Omit<ApiCall, 'id' | 'timestamp'>) => {
    setApiCalls(prev => [...prev, {
      ...call,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }]);
  };

  const handleSubmit = async (values: z.infer<typeof step1Schema> & z.infer<typeof step2Schema>) => {
    setIsLoading(true);

    if (step === 1) {
      try {
        console.log('Validating certificate:', values.certificateCode);
        
        const response = await fetch(
          `/api/certificates/check?certificate=${encodeURIComponent(values.certificateCode)}`
        );
        const data = await response.json();

        console.log('API Response:', {
          status: response.status,
          data
        });

        // Find pricing tier if product ID exists
        let pricingTierInfo;
        if (data?.certificate?.productId) {
          const tier = (Object.entries(PRODUCT_TIERS) as [string, ProductTierData][]).find(([_, t]) => 
            t.productIds.includes(data.certificate.productId)
          );
          if (tier) {
            pricingTierInfo = {
              name: tier[0],
              ...tier[1]
            };
          }
        }

        addApiCall({
          request: {
            url: `/api/certificates/check?certificate=${values.certificateCode}`,
            method: 'GET',
            headers: {},
            timestamp: new Date().toISOString()
          },
          response: {
            status: response.status,
            data,
            timestamp: new Date().toISOString(),
            errorDetails: !response.ok ? {
              code: data.errorCode,
              message: data.error
            } : undefined,
            rawResponse: response.ok ? data : undefined
          },
          acuityData: {
            productId: data?.certificate?.productId,
            remainingCounts: data?.certificate?.remainingCounts,
            pricingTier: pricingTierInfo
          }
        });

        if (!response.ok) {
          setFailedAttempts(prev => prev + 1);
          
          let errorTitle = 'Error';
          let errorMessage = data.errorMessage;
          if (data.error === 'invalid_certificate') {
            errorTitle = 'Invalid Certificate';
            errorMessage = 'Certificate code not found. Please try again.';
          } else if (data.error === 'certificate_uses') {
            errorTitle = 'No Offseason Sessions Remaining';
            errorMessage = 'All offseason sessions for this certificate have been used.';
          } else if (data.error === 'invalid_certificate_type') {
            errorTitle = 'Invalid Certificate';
            errorMessage = 'This certificate is not an offseason package.';
          }

          toast({
            title: errorTitle,
            description: errorMessage,
            variant: 'destructive'
          });
          return;
        }

        setCertificateData(data.certificate);
        setStep(2);
        setFailedAttempts(0);

      } catch (error) {
        console.error('Certificate validation error:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    } else if (step === 2) {
      if (!['adjustment', 'upgrade'].includes(values.conversionOption)) {
        toast({
          title: 'Selection Required',
          description: 'Please select a conversion option.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (values.conversionOption === 'adjustment') {
        setShowConfirmationModal(true);
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      setStep(4);
    }

    setIsLoading(false);
  };

  const [isConverting, setIsConverting] = useState(false);

  const [conversionResult, setConversionResult] = useState<{
    code: string;
    finalBalance: number;
  } | null>(null);

  const handleConfirmAdjustment = async () => {
    setIsConverting(true);
    try {
      const requestBody = {
        certificateCode: form.getValues('certificateCode'),
        certificateId: certificateData?.id,
        email: form.getValues('email'),
        conversionType: 'adjustment',
        currentBalance: remainingSessions,
        adjustedBalance: adjustedSessions,
        otherRemainingBalance: certificateData?.otherRemainingBalance ?? 0
      };

      const response = await fetch('/api/certificates/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      const timestamp = new Date().toISOString();

      // Add the conversion API call to debug panel
      addApiCall({
        request: {
          url: '/api/certificates/convert',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          timestamp
        },
        response: {
          status: response.status,
          data,
          timestamp,
          errorDetails: !response.ok ? {
            code: data.error,
            message: data.errorMessage
          } : undefined,
          rawResponse: response.ok ? data : undefined
        },
        acuityData: {
          conversionDetails: {
            certificateCode: requestBody.certificateCode,
            conversionType: 'adjustment',
            finalBalance: data.certificate?.finalBalance,
            newProductId: data.certificate?.productId
          }
        }
      });

      if (!response.ok) {
        throw new Error(data.errorMessage || 'Failed to convert sessions');
      }

      setConversionResult(data.certificate);
      setShowConfirmationModal(false);
      setStep(4);

    } catch (error) {
      toast({
        title: 'Conversion Failed',
        description: error instanceof Error ? error.message : 'Failed to convert sessions',
        variant: 'destructive'
      });
    } finally {
      setIsConverting(false);
    }
  };

  const renderHeader = () => {
    if (step === 1) {
      return (
        <>
          <CardTitle>Offseason Conversion</CardTitle>
          <CardDescription>
            Convert your offseason sessions into non-expiring winter sessions.
          </CardDescription>
        </>
      );
    } else if (step === 2) {
      return (
        <>
          <CardTitle>Upgrade or Adjust Balance?</CardTitle>
          <CardDescription>
            Select how to convert your offseason sessions into non-expiring winter sessions.
          </CardDescription>
        </>
      );
    }
    return null;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Open the scheduling link for your offseason package.</li>
                <li>
                  Copy the certificate code from the URL.
                  <div className="mx-auto my-0 sm:my-2 md:my-4 max-w-[350px] sm:max-w-[400px]">
                    <ImageLightbox
                      src="/images/offseason-conversion-instructions.jpg"
                      alt="Instructions for finding certificate code"
                      width={600}
                      height={200}
                    />
                  </div>
                </li>
                <li>Paste the code below.</li>
              </ol>
            </div>
            <FormField
              control={form.control}
              name="certificateCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificate Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your certificate code" 
                      {...field} 
                      value={field.value.toUpperCase()}
                      maxLength={8}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 2:
        return (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold">
                Offseason Sessions Balance: {remainingSessions}
              </h3>
              <p className="text-sm text-gray-600">
                Certificate: {form.getValues('certificateCode')}
              </p>
            </div>
            <FormField
              control={form.control}
              name="conversionOption"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Conversion Option</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <Label
                        htmlFor="upgrade"
                        className={`p-4 rounded-lg border-2 h-full cursor-pointer ${
                          field.value === 'upgrade'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start space-x-3 h-full">
                          <RadioGroupItem value="upgrade" id="upgrade" className="mt-1" />
                          <div className="flex-1 flex flex-col h-full">
                            <span className="text-lg font-semibold block">
                              Upgrade Sessions
                            </span>
                            <p className="text-sm text-gray-600 mt-1 flex-grow">
                              Keep all your sessions by paying the difference between the winter price
                              and offseason price.
                            </p>
                            <div className="mt-4 space-y-1">
                              <p className="text-sm text-gray-600">
                                Price per session: ${upgradePrice}
                              </p>
                              <p className="text-sm text-gray-600">
                                Total Cost: <strong className="text-black">${totalUpgradePrice}</strong>
                              </p>
                              <p className="text-lg font-semibold mt-2">
                                Upgraded Balance: {remainingSessions} {remainingSessions === 1 ? 'Session' : 'Sessions'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Label>

                      <Label
                        htmlFor="adjustment"
                        className={`p-4 rounded-lg border-2 h-full ${adjustedSessions === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
                          field.value === 'adjustment'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start space-x-3 h-full">
                          <RadioGroupItem 
                            value="adjustment" 
                            id="adjustment" 
                            className="mt-1"
                            disabled={adjustedSessions === 0}
                          />
                          <div className="flex-1 flex flex-col h-full">
                            <span className="text-lg font-semibold block">
                              Adjust Balance
                            </span>
                            <p className="text-sm text-gray-600 mt-1 flex-grow">
                              Take a reduction in your session balance to match the
                              equivalent value in winter sessions.
                            </p>
                            <div className="mt-4 space-y-1">
                              {adjustedSessions === 0 ? (
                                <p className="text-xs text-red-900">Cannot reduce a session balance of 1</p>
                              ) : (
                                <p className="text-sm text-gray-600">Total Cost: <span className="text-black">Free</span></p>
                              )}
                              <p className="text-lg font-semibold mt-2">
                                Adjusted Balance: {adjustedSessions} {adjustedSessions === 1 ? 'Session' : 'Sessions'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 3:
        const handleCheckout = async () => {
          setIsLoading(true);
          try {
            // Determine tier by checking which tier's productIds array contains our productId
            const tier = Object.entries(PRODUCT_TIERS).find(([_, tierData]) => 
              tierData.productIds.some(id => id === certificateData?.productId)
            )?.[0]?.replace('TIER_', '') ?? '1';

            const response = await fetch('/api/checkout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tier,
                certificateCode: form.getValues('certificateCode'),
                email: form.getValues('email')
              }),
            });

            const { url } = await response.json();
            if (url) {
              window.location.href = url;
            }
          } catch (error) {
            console.error('Checkout error:', error);
            toast({
              title: 'Checkout Error',
              description: 'Failed to initialize checkout. Please try again.',
              variant: 'destructive'
            });
          }
          setIsLoading(false);
        };

        return (
          <div className="text-center">
            <CreditCard className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Checkout</h3>
            <p className="text-gray-600 mb-4">Total amount: ${totalUpgradePrice}</p>
            <div className="flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleCheckout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </Button>
            </div>
          </div>
        );
      case 4:
        const schedulingUrl = `https://vsla.as.me/schedule.php?appointmentType=25250022&certificate=${encodeURIComponent(form.getValues('certificateCode'))}`;
        
        return (
          <div className="text-center">
            <Confetti />
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold">Success!</h3>
            <div className="text-gray-600 mt-5 mb-7 max-w-[350px] mx-auto">
              {form.getValues('conversionOption') === 'upgrade'
                ? <>
                  <p className="mb-2 text-sm">Your sessions have been upgraded. We&apos;ve sent you an email with your new scheduling link.</p>
                  <p>New balance: <span className="font-semibold">{conversionResult?.finalBalance} sessions</span></p>
                  {certificateData?.otherRemainingBalance && certificateData.otherRemainingBalance >= 1 && (
                    <p className="mt-2 text-sm text-gray-500">
                      {form.getValues('conversionOption') === 'upgrade' ? remainingSessions : adjustedSessions} converted 
                      offseason {remainingSessions === 1 ? 'session' : 'sessions'} plus {certificateData.otherRemainingBalance} existing winter 
                      {certificateData.otherRemainingBalance === 1 ? ' session' : ' sessions'}
                    </p>
                  )}
                </>
                : <>
                  <p className="mb-2 text-sm">Your sessions have been adjusted. We&apos;ve sent you an email with your new scheduling link.</p>
                  <p>New balance: <span className="font-semibold">{conversionResult?.finalBalance} sessions</span></p>
                  {certificateData?.otherRemainingBalance && certificateData.otherRemainingBalance >= 1 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {adjustedSessions} converted offseason {adjustedSessions === 1 ? 'session' : 'sessions'} plus {certificateData.otherRemainingBalance} existing winter 
                      {certificateData.otherRemainingBalance === 1 ? ' session' : ' sessions'}
                    </p>
                  )}
                </>
              }
            </div>
            <Button 
              onClick={() => window.location.href = schedulingUrl} 
              className="gap-2 mb-4"
            >
              Start Booking Now
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          {renderHeader()}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {renderStep()}
              {step === 1 && failedAttempts >= 3 && (
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-normal text-sm text-blue-500 hover:text-blue-700 mt-4"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowContactForm(true);
                  }}
                >
                  Think something&apos;s wrong?
                </Button>
              )}
              {step < 4 && step !== 3 && (
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait
                    </>
                  ) : step === 1 ? (
                    'Validate Certificate'
                  ) : step === 2 ? (
                    'Confirm Selection'
                  ) : (
                    'Complete Payment'
                  )}
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
      <ContactForm
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
        certificateCode={form.getValues('certificateCode')}
        email={form.getValues('email')}
      />
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleConfirmAdjustment}
        sessions={{
          current: remainingSessions,
          adjusted: adjustedSessions,
        }}
      />
      <DebugPanel
        apiCalls={apiCalls}
      />
    </>
  );
}