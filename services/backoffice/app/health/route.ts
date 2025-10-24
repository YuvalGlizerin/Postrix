import { NextResponse } from 'next/server';
import { Logger } from 'logger';

const logger = new Logger('Backoffice');

export async function GET() {
  logger.info('Backoffice health check route');
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
