import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { result, urlInput, textInput, hasImage } = body;
    
    // Generate unique ID (6 chars, URL-safe)
    const id = randomBytes(3).toString('hex'); // abc123
    
    // Save to Redis (expires in 90 days)
    const checkData = {
      result,
      urlInput: urlInput || '',
      textInput: textInput || '',
      hasImage: hasImage || false,
      createdAt: new Date().toISOString()
    };
    
    await redis.set(`factcheck:${id}`, JSON.stringify(checkData), { ex: 90 * 24 * 60 * 60 });
    
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Save check error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
