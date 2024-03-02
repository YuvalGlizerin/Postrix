import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: `envs/${process.env.ENV}.env` });
process.title = 'core-service';
const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Done for today');
});

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`Server is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export default server;
