import { createClient } from 'redis';
import secrets from 'secret-manager';

const client = createClient({
  url: process.env.ENV === 'local' ? 'redis://redis.postrix.io' : 'redis://redis-master.redis.svc.cluster.local:6379',
  password: secrets.REDIS_PASSWORD
});

client.on('error', (err: Error) => console.log('Redis Client Error', err));

await client.connect();

export default client;
