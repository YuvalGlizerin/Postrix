import os from 'os';

import { Redis } from 'ioredis';
import { Logger } from 'logger';
import secrets from 'secret-manager';

const logger = new Logger('redis');

const keyPrefix = `${process.env.ENV}:${process.env.ENV === 'local' ? os.hostname() : process.env.NAMESPACE}:`;

const client = new Redis(process.env.REDIS_URL!, {
  keyPrefix,
  password: secrets.REDIS_PASSWORD,
  keepAlive: 30000 // Send TCP keepalive packets every 30 seconds to prevent idle connection timeouts
});

client.on('error', (err: Error) => logger.log('Redis Client Error', { err }));

export default client;
