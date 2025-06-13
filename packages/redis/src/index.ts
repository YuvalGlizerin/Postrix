import os from 'os';

import { Redis } from 'ioredis';
import secrets from 'secret-manager';
import { Logger } from 'logger';

const logger = new Logger('redis');

const keyPrefix = `${process.env.ENV}:${process.env.ENV === 'local' ? os.hostname() : process.env.NAMESPACE}:`;

const client = new Redis(process.env.REDIS_URL!, {
  keyPrefix,
  password: secrets.REDIS_PASSWORD
});

client.on('error', (err: Error) => logger.log('Redis Client Error', { err }));

export default client;
