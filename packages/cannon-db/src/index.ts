import os from 'os';

import secrets from 'secret-manager';

import { PrismaClient } from './generated/prisma/client.ts';

const databaseUrl = `postgresql://${secrets.POSTGRES_USERNAME}:${secrets.POSTGRES_PASSWORD}@${secrets.POSTGRES_HOST}:${secrets.POSTGRES_PORT}/${process.env.DATABASE}`;
const schema = process.env.ENV === 'local' ? os.hostname() : 'postgres-prisma-kickoff';

const fullDatabaseUrl = `${databaseUrl}?schema=${schema}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: fullDatabaseUrl
    }
  }
});

export default prisma;
