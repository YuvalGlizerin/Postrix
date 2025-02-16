import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import whatsapp from 'whatsapp';

dotenv.config({ path: `envs/${process.env.ENV}.env` });
process.title = 'joby';
const app = express();
const PORT = process.env.PORT;

app.get('/', (req: Request, res: Response) => {
  res.send(`Full CI/CD running on ${process.env.ENV}.\nFixed service!`);
});

app.get('/webhook', (req: Request, res: Response) => {
  whatsapp.verifyToken(req, res, 'VERIFY_TOKEN');
});

const server = app.listen(PORT, () => {
  console.log(`Joby service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export { server as default };
