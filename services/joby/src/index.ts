import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: `envs/${process.env.ENV}.env` });
process.title = 'joby';
const app = express();
const PORT = process.env.PORT;

app.get('/', (req: Request, res: Response) => {
  res.send(`Full CI/CD running on ${process.env.ENV}.\nFixed service URL!`);
});

const server = app.listen(PORT, () => {
  console.log(`Joby service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export default server;
