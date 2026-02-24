import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Valid promo codes and their bonus checks
const PROMO_CODES = {
  'FRIEND5': 5,
  'BETA10': 10,
  'EARLYBIRD': 5,
};

export async function POST(request) {
  try {
    const { code, visitorId } = await request.json();

    if (!code || !visitorId) {
      return NextResponse.json({ error: 'Missing code or visitor ID' }, { status: 400 });
    }

    const upperCode = code.toUpperCase();

    // Check if code is valid
    if (!PROMO_CODES[upperCode]) {
      return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
    }

    // Check if user already used this code
    const usedKey = `promo:${visitorId}:${upperCode}`;
    const alreadyUsed = await redis.get(usedKey);

    if (alreadyUsed) {
      return NextResponse.json({ error: 'You already used this promo code' }, { status: 400 });
    }

    // Add bonus checks
    const bonusChecks = PROMO_CODES[upperCode];
    const bonusKey = `bonus:${visitorId}`;
    const currentBonus = parseInt(await redis.get(bonusKey) || '0');
    const newBonus = currentBonus + bonusChecks;

    await redis.set(bonusKey, newBonus);
    await redis.set(usedKey, '1', { ex: 365 * 24 * 60 * 60 }); // Mark as used for 1 year

    return NextResponse.json({ 
      message: `Success! You got ${bonusChecks} bonus fact-checks!`,
      bonusChecks: newBonus 
    });

  } catch (error) {
    console.error('Promo code error:', error);
    return NextResponse.json({ error: 'Failed to apply promo code' }, { status: 500 });
  }
}
