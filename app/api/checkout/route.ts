import { NextResponse } from 'next/server';
import { Stripe } from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tier, certificateCode, email } = body;

    const lookupKey = `OFFSEASON_UPGRADE_TIER_${tier}`;
    
    // Get price ID using the lookup key
    const prices = await stripe.prices.search({
      query: `active:\'true\' AND lookup_key:\'${lookupKey}\'`,
    });

    if (!prices.data[0]?.id) {
      throw new Error(`No price found for lookup key: ${lookupKey}`);
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price: prices.data[0].id,
        quantity: 1
      }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&certificate=${certificateCode}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}?canceled=true`,
      customer_email: email,
      metadata: {
        certificateCode,
        tier
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 