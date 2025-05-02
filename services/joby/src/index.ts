import 'env-loader';
import secrets from 'secret-manager';
import express, { type Request, type Response } from 'express';
import whatsapp from 'whatsapp';
import { Logger } from 'logger';
import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config({ path: `envs/${process.env.ENV}.env` });

process.title = 'joby';
const app = express();
const PORT = process.env.PORT;
const logger = new Logger({
  serviceName: 'joby',
  password: secrets.ELASTICSEARCH_PASSWORD!
});
logger.log('Joby service started', { count: 1, env: process.env.ENV });

await redis.set('foo', 'bar23');
const value = await redis.get('foo');
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
