import { createClient } from 'redis';
import secrets from 'secret-manager';

const client = createClient({
  url: process.env.REDIS_URL,
  password: secrets.REDIS_PASSWORD
});

client.on('error', (err: Error) => console.log('Redis Client Error', err));

await client.connect();

export default client;
