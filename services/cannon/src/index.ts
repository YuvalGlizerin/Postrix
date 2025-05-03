import 'env-loader';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import express, { type Request, type Response } from 'express';
import pkg from 'pg';
import secrets from 'secret-manager';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Pool } = pkg;

process.title = 'cannon';
const app = express();
const PORT = process.env.PORT;

const pool = new Pool({
  user: secrets.POSTGRES_USERNAME,
  host: secrets.POSTGRES_HOST,
  database: process.env.DATABASE,
  password: secrets.POSTGRES_PASSWORD,
  port: Number(secrets.POSTGRES_PORT),
  ssl: {
    rejectUnauthorized: false
  }
});

// Serve static files from the assets directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use(express.json()); // Add this line to parse JSON request bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root route to serve the HTML website
app.get('/', (req: Request, res: Response) => {
  try {
    const htmlPath = path.join(__dirname, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    res.send(htmlContent);
  } catch (error) {
    console.error('Error serving HTML file:', error);
    res.send(`Cannon service running on ${process.env.ENV}.\n`);
  }
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
