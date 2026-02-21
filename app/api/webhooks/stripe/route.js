import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Redis } from '@upstash/redis';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata.userId;
        
        if (userId) {
          // Mark user as Pro subscriber
          await redis.set(`user:${userId}:pro`, 'true', { ex: 31536000 }); // 1 year expiry
          await redis.set(`user:${userId}:subscription_id`, session.subscription);
          await redis.set(`user:${userId}:customer_id`, session.customer);
          
          console.log(`User ${userId} upgraded to Pro`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        // Find user by subscription ID and downgrade
        const keys = await redis.keys('user:*:subscription_id');
        for (const key of keys) {
          const subId = await redis.get(key);
          if (subId === subscription.id) {
            const userId = key.split(':')[1];
            await redis.del(`user:${userId}:pro`);
            console.log(`User ${userId} subscription cancelled`);
            break;
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        // Handle subscription updates (e.g., payment failed)
        if (subscription.status !== 'active') {
          const keys = await redis.keys('user:*:subscription_id');
          for (const key of keys) {
            const subId = await redis.get(key);
            if (subId === subscription.id) {
              const userId = key.split(':')[1];
              await redis.del(`user:${userId}:pro`);
              console.log(`User ${userId} subscription inactive`);
              break;
            }
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ 
      error: 'Webhook handler failed',
      details: error.message 
    }, { status: 500 });
  }
}
