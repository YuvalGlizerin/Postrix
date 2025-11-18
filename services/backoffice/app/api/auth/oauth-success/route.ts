import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../../../lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL));
  }

  // Redirect to home page after successful OAuth
  return NextResponse.redirect(new URL('/', process.env.NEXTAUTH_URL));
}
