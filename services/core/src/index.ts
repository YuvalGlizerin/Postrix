import express, { type Request, type Response } from 'express';

process.title = 'core-service';

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World from Google Cloud Functions!');
});

const PORT = 8000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default server;
