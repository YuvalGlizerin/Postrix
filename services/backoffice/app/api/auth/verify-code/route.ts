import { NextRequest, NextResponse } from 'next/server';
import redis from 'redis';
import { Logger } from 'logger';

const logger = new Logger('auth');

/**
 * API route to verify code
 * POST /api/auth/verify-code
 * Body: { email: string, code: string }
 * Returns: { valid: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get code from Redis
    const redisKey = `auth:code:${normalizedEmail}`;
    const storedCode = await redis.get(redisKey);

    if (!storedCode) {
      logger.log('Verification code not found or expired', { email: normalizedEmail });
      return NextResponse.json({ valid: false, error: 'Code not found or expired' });
    }

    // Verify code (case-insensitive)
    const isValid = storedCode === code;

    if (isValid) {
      // Delete code after successful verification (one-time use)
      await redis.del(redisKey);
      logger.log('Verification code verified successfully', { email: normalizedEmail });
      return NextResponse.json({ valid: true });
    } else {
      logger.log('Invalid verification code', { email: normalizedEmail });
      return NextResponse.json({ valid: false, error: 'Invalid code' });
    }
  } catch (error) {
    logger.error('Error verifying code', { error });
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
