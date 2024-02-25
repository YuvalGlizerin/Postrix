import express, { type Request, type Response } from 'express';

process.title = 'core-service';

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World from Google Cloud Functions!');
});

const PORT = 8080; // TODO: update to 8000 for local with env vars

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default server;
