import os from 'os';

import secrets from 'secret-manager';

import { PrismaClient } from './generated/prisma/client.ts';

const databaseUrl = `postgresql://${process.env.POSTGRES_USERNAME}:${secrets.SECRET_POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.DATABASE}`;
const schema = process.env.ENV === 'local' ? os.hostname() : process.env.NAMESPACE;
const fullDatabaseUrl = `${databaseUrl}?schema=${schema}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: fullDatabaseUrl
    }
  }
});

export default prisma;

export * from './generated/prisma/models.ts';
