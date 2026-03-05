import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST(request) {
  try {
    const fingerprintId = request.headers.get('x-fingerprint-id');
    
    if (!fingerprintId) {
      return Response.json({ error: 'Missing fingerprint' }, { status: 400 });
    }

    // Check if user is Pro subscriber
    const proStatus = await redis.get(`pro:${fingerprintId}`);
    const isPro = proStatus === 'active';

    // Check bonus checks from promo codes
    const bonusChecks = await redis.get(`bonus:${fingerprintId}`) || 0;

    // Check daily usage
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const usageKey = `usage:${fingerprintId}:${today}`;
    const usage = await redis.get(usageKey) || 0;

    return Response.json({
      usage: parseInt(usage),
      bonusChecks: parseInt(bonusChecks),
      isPro,
      canCheck: isPro || bonusChecks > 0 || usage < 2
    });

  } catch (error) {
    console.error('Check usage error:', error);
    return Response.json({ error: 'Failed to check usage' }, { status: 500 });
  }
}
