import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe('sk_test_51T33IvRTl9hYt1sIetyfhyZnqaXsQBvsudAjop2hUaUnZEJsTIily0R1IUQWkcr8wZYlP4kAcmJsGVWUItb3ihwF002uxKwasO', {
  apiVersion: '2023-10-16',
});

export async function POST(request) {
  try {
    const { priceId, userId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://signal-vs-noise-f8ju.vercel.app/?success=true',
      cancel_url: 'https://signal-vs-noise-f8ju.vercel.app/?canceled=true',
      client_reference_id: userId,
      metadata: { userId: userId },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
