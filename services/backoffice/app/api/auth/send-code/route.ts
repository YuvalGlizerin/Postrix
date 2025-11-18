import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import redis from 'redis';
import secrets from 'secret-manager';
import { Logger } from 'logger';

const logger = new Logger('auth');

// Generate a 6-digit verification code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * API route to send verification code to email
 * POST /api/auth/send-code
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.endsWith('@postrix.io')) {
      return NextResponse.json({ error: 'Valid Postrix email is required' }, { status: 400 });
    }

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();

    // Generate verification code
    const code = generateCode();

    // Store code in Redis with 5 minute TTL
    // Key format: auth:code:{email}
    const redisKey = `auth:code:${normalizedEmail}`;
    await redis.setex(redisKey, 300, code); // 300 seconds = 5 minutes

    logger.log('Verification code generated', { email: normalizedEmail });

    // Send email with code using Nodemailer
    try {
      // Simple password-based authentication (App Password)
      // Note: secrets.SECRET_SMTP_USER contains the resolved value from Kubernetes secrets
      // process.env.SECRET_SMTP_USER may be a path like /k8s-secrets/... which should not be used directly
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: secrets.SECRET_SMTP_USER || process.env.SECRET_SMTP_USER,
          pass: secrets.SECRET_SMTP_PASSWORD || process.env.SECRET_SMTP_PASSWORD
        }
      });

      // Email content
      // Authenticate with your real account (yuval.glizerin@postrix.io), but send from no-reply@postrix.io
      // Note: For this to work, no-reply@postrix.io must be configured as an alias in Google Workspace
      // If Gmail still shows your real email, the alias may not be properly configured
      const fromEmail = process.env.SMTP_FROM || 'Backoffice <no-reply@postrix.io>';
      const mailOptions = {
        from: fromEmail,
        sender: 'no-reply@postrix.io', // Explicitly set sender
        replyTo: 'no-reply@postrix.io', // Set reply-to to prevent replies
        to: normalizedEmail,
        subject: 'Your Backoffice Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verification Code</h2>
            <p>Your verification code for Backoffice is:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
        text: `Your verification code for Backoffice is: ${code}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`
      };

      await transporter.sendMail(mailOptions);
      logger.log('Verification code email sent successfully', { email: normalizedEmail });
    } catch (emailError) {
      // Log error but don't fail the request (security: don't reveal if email exists)
      logger.error('Failed to send verification email', { error: emailError, email: normalizedEmail });
      return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
    }

    // Always return success (don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: 'If the email exists, a verification code has been sent.'
    });
  } catch (error) {
    logger.error('Error sending verification code', { error });
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
