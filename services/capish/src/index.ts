import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import whatsapp from 'whatsapp';

dotenv.config({ path: `envs/${process.env.ENV}.env` });
process.title = 'Capish';
const app = express();
const PORT = process.env.PORT;

app.get('/', (req: Request, res: Response) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Capish - WhatsApp Video Caption Generator</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f0f2f5;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 2rem;
                text-align: center;
            }
            h1 {
                color: #25D366;
                font-size: 2.5rem;
                margin-bottom: 1rem;
            }
            .description {
                color: #333;
                font-size: 1.2rem;
                line-height: 1.6;
                margin-bottom: 2rem;
            }
            .features {
                background-color: white;
                border-radius: 10px;
                padding: 2rem;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .feature-item {
                margin-bottom: 1rem;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Welcome to Capish</h1>
            <div class="description">
                Generate captions for your WhatsApp videos automatically
            </div>
            <div class="features">
                <div class="feature-item">✨ Easy to use with WhatsApp</div>
                <div class="feature-item">🎯 Accurate caption generation</div>
                <div class="feature-item">⚡ Fast processing</div>
                <div class="feature-item">🌐 Multiple language support</div>
            </div>
        </div>
    </body>
    </html>
  `;
  res.send(html);
});

app.get('/webhook', (req: Request, res: Response) => {
  whatsapp.verifyToken(req, res, 'VERIFY_TOKEN');
});

const server = app.listen(PORT, () => {
  console.log(`Capish service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export { server as default };
