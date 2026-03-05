import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const isAllowedOrigin = (origin) => {
  const allowedOrigins = [
    'https://signalnoise.tech',
    'https://www.signalnoise.tech',
    'http://localhost:3000',
  ];
  return allowedOrigins.includes(origin);
};

export async function POST(request) {
  try {
    // Check origin
    const origin = request.headers.get('origin');
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json({ 
        error: { message: 'Unauthorized origin' } 
      }, { status: 403 });
    }

    // Rate limiting check
    const fingerprintId = request.headers.get('x-fingerprint-id');

    if (!fingerprintId) {
      return NextResponse.json({ 
        error: { message: 'Missing authentication. Please refresh the page.' } 
      }, { status: 400 });
    }

    // Check if user is Pro
    const proStatus = await redis.get(`pro:${fingerprintId}`);
    const isPro = proStatus === 'active';

    // Check bonus checks
    const bonusChecks = parseInt(await redis.get(`bonus:${fingerprintId}`) || 0);

    // Check daily usage
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `usage:${fingerprintId}:${today}`;
    const currentUsage = parseInt(await redis.get(usageKey) || 0);

    console.log('RATE LIMIT CHECK:', { fingerprintId, isPro, bonusChecks, currentUsage });

    // Enforce limit
    if (!isPro && bonusChecks === 0 && currentUsage >= 2) {
      return NextResponse.json({
        error: { 
          message: 'Free tier limit reached (2 checks/day). Upgrade to Pro for unlimited checks or use a promo code for bonus checks.' 
        }
      }, { status: 429 });
    }

    // Increment usage or decrement bonus
    if (bonusChecks > 0) {
      await redis.decr(`bonus:${fingerprintId}`);
      console.log('Used bonus check. Remaining:', bonusChecks - 1);
    } else if (!isPro) {
      await redis.incr(usageKey);
      await redis.expire(usageKey, 86400); // Expire after 24 hours
      console.log('Incremented daily usage to:', currentUsage + 1);
    }

    // Parse request body
    const body = await request.json();
    const { model, max_tokens, system, tools, messages } = body;
    
    // Input validation
    if (!model || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ 
        error: { message: 'Invalid request format' } 
      }, { status: 400 });
    }
    
    // Validate message content length (prevent abuse) - 5MB limit
    const totalLength = JSON.stringify(messages).length;
    if (totalLength > 5000000) {
      return NextResponse.json({ 
        error: { message: 'Request too large. Please use an image under 5MB or shorter text.' } 
      }, { status: 413 });
    }

    // Build Anthropic API request
    const anthropicRequest = {
      model,
      max_tokens,
      messages,
    };

    if (system) {
      anthropicRequest.system = system;
    }

    if (tools && tools.length > 0) {
      anthropicRequest.tools = tools.map(tool => {
        if (tool.type === 'web_search_20250305') {
          return {
            type: 'web_search_20250305',
            name: tool.name || 'web_search',
            ...(tool.max_uses && { max_uses: tool.max_uses })
          };
        }
        return tool;
      });
    }

    console.log('Calling Anthropic API with model:', model);

    // Call Anthropic API
    const response = await anthropic.messages.create(anthropicRequest);

    console.log('Anthropic API response received');

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error:', error);
    
    if (error.status === 429) {
      return NextResponse.json({
        error: { 
          message: 'Rate limit exceeded. Please try again in a moment.' 
        }
      }, { status: 429 });
    }

    if (error.status === 400) {
      return NextResponse.json({
        error: { 
          message: error.message || 'Invalid request to AI service.' 
        }
      }, { status: 400 });
    }

    return NextResponse.json({
      error: { 
        message: 'An error occurred while processing your request. Please try again.' 
      }
    }, { status: 500 });
  }
}
