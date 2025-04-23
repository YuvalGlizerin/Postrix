import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import whatsapp from 'whatsapp';
import { Logger } from 'logger';
import { createClient } from 'redis';
import { fromIni } from '@aws-sdk/credential-providers';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

dotenv.config({ path: `envs/${process.env.ENV}.env` });
process.title = 'joby';
const app = express();
const PORT = process.env.PORT;

const secretsClient = new SecretsManagerClient({
  region: 'us-east-1',
  ...(process.env.ENV === 'local' ? { credentials: fromIni() } : {})
});

const postgres = await secretsClient.send(new GetSecretValueCommand({ SecretId: 'redis' }));
const elasticsearch = await secretsClient.send(new GetSecretValueCommand({ SecretId: 'elasticsearch' }));
if (!postgres.SecretString) {
  throw new Error('Secrets not found, cannot connect to postgres');
}
if (!elasticsearch.SecretString) {
  throw new Error('Secrets not found, cannot connect to elasticsearch');
}
const { password } = JSON.parse(postgres.SecretString);
const { password: elasticsearchPassword } = JSON.parse(elasticsearch.SecretString);
const logger = new Logger({
  serviceName: 'joby',
  password: elasticsearchPassword
});
logger.log('Joby service started', { count: 1, env: process.env.ENV });
const client = createClient({
  url: 'redis://redis.postrix.io', // TODO: Use 'redis://redis-master.redis.svc.cluster.local:6379' if running on cloud
  password
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();
await client.set('foo', 'bar2');
const value = await client.get('foo');
logger.log(`Redis value: ${value}`, { env: process.env.ENV });

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req: Request, res: Response) => {
  res.send(`Full CI/CD running on ${process.env.ENV}.\nFixed service!`);
});

app.get('/webhook', (req: Request, res: Response) => {
  whatsapp.verifyToken(req, res, 'VERIFY_TOKEN');
});

const server = app.listen(PORT, () => {
  logger.log(`Joby service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export { server as default };
