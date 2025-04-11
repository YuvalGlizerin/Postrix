import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';
import { fromIni } from '@aws-sdk/credential-providers';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
const { Pool } = pkg;

dotenv.config({ path: 'envs/default.env' });
dotenv.config({ path: `envs/${process.env.ENV}.env` });

process.title = 'cannon';
const app = express();
const PORT = process.env.PORT;

const secretsClient = new SecretsManagerClient({
  region: 'us-east-1',
  ...(process.env.ENV === 'local' ? { credentials: fromIni() } : {})
});

const postgres = await secretsClient.send(new GetSecretValueCommand({ SecretId: 'postgres' }));
if (!postgres.SecretString) {
  throw new Error('Secrets not found, cannot connect to postgres');
}
const { username, password, host, port } = JSON.parse(postgres.SecretString);

const pool = new Pool({
  user: username,
  host,
  database: process.env.DATABASE,
  password,
  port,
  ssl:
    process.env.ENV === 'local'
      ? {
          rejectUnauthorized: false // Use only for development!
        }
      : undefined
});

app.use(express.json()); // Add this line to parse JSON request bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req: Request, res: Response) => {
  res.send(`Cannon service running on ${process.env.ENV}.\n`);
});

// Updated leaderboard endpoint to query the database
app.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM leaderboard');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error querying leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

// Add a post for leaderboard that will accept a username and a score
app.post('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { username, score } = req.body;
    const result = await pool.query(
      'INSERT INTO leaderboard (username, score) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET score = EXCLUDED.score RETURNING *',
      [username, score]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding to leaderboard:', error);
    res.status(500).json({ error: 'Failed to add to leaderboard' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Cannon service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export { server as default };
