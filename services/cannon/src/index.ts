import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: `envs/${process.env.ENV}.env` });
process.title = 'joby';
const app = express();
const PORT = process.env.PORT;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req: Request, res: Response) => {
  res.send(`Cannon service running on ${process.env.ENV}.\n`);
});

const server = app.listen(PORT, () => {
  console.log(`Joby service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export { server as default };
