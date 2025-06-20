import 'env-loader';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { Logger } from 'logger';
import express, { type Request, type Response } from 'express';
import prisma from 'cannon-db';

const logger = new Logger('Cannon');

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.title = 'cannon';
const app = express();
const PORT = process.env.PORT;

// Serve static files from the assets directory
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ✅ Serve public directory (including App-ads.txt)
app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json()); // Add this line to parse JSON request bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Root route to serve the HTML toybuttons website
app.get('/', (req: Request, res: Response) => {
  try {
    const htmlPath = path.join(__dirname, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    res.send(htmlContent);
  } catch (error) {
    logger.error('Error serving HTML file:', { error });
    res.send(`Cannon service running on ${process.env.ENV}.\n`);
  }
});

// Updated leaderboard endpoint to query the database
app.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const leaderboardEntries = await prisma.leaderboard.findMany({
      orderBy: {
        score: 'desc'
      }
    });
    res.status(200).json(leaderboardEntries);
  } catch (error) {
    logger.error('Error querying leaderboard:', { error });
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

// Add a post for leaderboard that will accept a username and a score
app.post('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { username, score } = req.body;
    const result = await prisma.leaderboard.upsert({
      where: { username },
      update: { score },
      create: { username, score }
    });
    res.status(201).json(result);
  } catch (error) {
    logger.error('Error adding to leaderboard:', { error });
    res.status(500).json({ error: 'Failed to add to leaderboard' });
  }
});

const server = app.listen(PORT, () => {
  logger.log(`Cannon service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export { server as default };
