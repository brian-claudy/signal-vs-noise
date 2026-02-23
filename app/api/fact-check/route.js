import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis with environment variables from Upstash
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Rate limiting config
const RATE_LIMIT = {
  FREE_TIER_CHECKS: 2,
  WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
  DAILY_BUDGET: 50, // $50/day max spend
  COST_PER_CHECK: 0.015, // Average cost
};

export async function POST(request) {
  try {
    // Get request body
    const body = await request.json();
    const { model, max_tokens, system, tools, messages } = body;

    // Get user fingerprint from request headers (will come from FingerprintJS)
    const fingerprint = request.headers.get('x-fingerprint-id');
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
           request.headers.get('x-real-ip') || 
           'unknown';

console.log('RATE LIMIT CHECK - fingerprint:', fingerprint, 'ip:', ip);

if (!fingerprint) {
  return NextResponse.json({ error: { message: 'Missing fingerprint ID' } }, { status: 400 });
}

const userId = fingerprint;
const usageKey = `usage:${userId}`;
const ipUsageKey = `usage:ip:${ip}`;

// Check if user is Pro subscriber
const isPro = await redis.get(`user:${userId}:pro`);
console.log('USER:', userId, 'isPro:', isPro);

// Only apply rate limiting for free tier users
if (!isPro) {
  const usage = await redis.get(usageKey) || 0;
  const ipUsage = await redis.get(ipUsageKey) || 0;
  
  console.log('USAGE CHECK:', usageKey, '=', usage, '/ limit:', RATE_LIMIT.FREE_TIER_CHECKS);
  console.log('IP USAGE CHECK:', ipUsageKey, '=', ipUsage, '/ IP limit: 5');
  
  // Check fingerprint limit (2/day)
  if (usage >= RATE_LIMIT.FREE_TIER_CHECKS) {
    return NextResponse.json({ 
      error: { 
        message: 'Free tier limit reached. You\'ve used your 2 free fact-checks. Upgrade to Pro for unlimited access!',
        code: 'rate_limit_exceeded',
        upgradeUrl: '/upgrade'
      } 
    }, { status: 429 });
  }
  
  // Check IP limit (5/day - catches incognito abuse)
  if (ipUsage >= 5) {
    return NextResponse.json({ 
      error: { 
        message: 'Daily limit reached from this network. Upgrade to Pro for unlimited access!',
        code: 'rate_limit_exceeded',
        upgradeUrl: '/upgrade'
      } 
    }, { status: 429 });
  }
}
    // Check daily cost budget (circuit breaker)
    const costToday = await redis.get(costKey) || 0;
    if (costToday > RATE_LIMIT.DAILY_BUDGET) {
      return NextResponse.json({ 
        error: { 
          message: 'Service temporarily unavailable. Please try again tomorrow.',
          code: 'budget_exceeded'
        } 
      }, { status: 503 });
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens, system, tools, messages }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error }, { status: response.status });
    }

    const data = await response.json();

   // Update usage counters (only for free tier users)
if (!isPro) {
  const usage = await redis.get(usageKey) || 0;
  const ipUsage = await redis.get(ipUsageKey) || 0;
  await redis.set(usageKey, usage + 1, { ex: Math.floor(RATE_LIMIT.WINDOW_MS / 1000) });
  await redis.set(ipUsageKey, ipUsage + 1, { ex: Math.floor(RATE_LIMIT.WINDOW_MS / 1000) });
}

    // Update daily cost tracking
    await redis.set(costKey, costToday + RATE_LIMIT.COST_PER_CHECK, { ex: 86400 }); // Expire at end of day

    // Return the response
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: { message: 'Internal server error', details: error.message } 
    }, { status: 500 });
  }
}
