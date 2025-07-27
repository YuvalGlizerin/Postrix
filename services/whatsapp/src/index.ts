import 'env-loader';

import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

import express, { type Request, type Response } from 'express';
import whatsapp from 'whatsapp-utils';
import secrets from 'secret-manager';
import { Logger } from 'logger';
import prisma from 'joby-db';
import prismaLumo from 'lumo-db';

import lumoWebhook from './services/lumo.ts';
import capishWebhook from './services/capish.ts';
import { getSchedulerStatus, sendJobAlert } from './services/joby/job-scheduler.ts';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = new Logger('Whatsapp');

process.title = 'Whatsapp';
const app = express();
const PORT = process.env.PORT;

// startJobScheduler();

app.use(express.json()); // Add this line to parse JSON request bodies

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const schedulerStatus = getSchedulerStatus();
  res.status(200).json({
    status: 'OK',
    service: 'whatsapp',
    scheduler: schedulerStatus
  });
});

app.get('/webhook', async (req: Request, res: Response) => {
  logger.log('Received GET webhook verification request:', req.query);
  whatsapp.verifyToken(req, res, 'VERIFY_TOKEN');
});

app.get('/website/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const website = await prismaLumo.websites.findUnique({
    where: { id: parseInt(id) }
  });
  res.status(200).send(website?.website_code);
});

// List all available websites
app.get('/websites', async (req: Request, res: Response) => {
  try {
    const websitesDir = path.join(__dirname, 'websites');
    const files = await fs.readdir(websitesDir);

    // Filter for HTML files only
    const htmlFiles = files.filter(file => file.endsWith('.html'));

    const websiteLinks = htmlFiles.map(file => ({
      name: file.replace('.html', ''),
      url: `/websites/${file}`
    }));

    res.status(200).json({
      message: 'Available websites',
      websites: websiteLinks,
      count: htmlFiles.length
    });
  } catch (error) {
    logger.error('Error reading websites directory:', { error });
    res.status(500).json({ error: 'Unable to list websites' });
  }
});

// Serve static website files from the websites folder
app.get('/websites/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;

  try {
    // Validate filename to prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).send('Invalid filename');
      return;
    }

    // Only allow HTML files
    if (!filename.endsWith('.html')) {
      res.status(400).send('Only HTML files are supported');
      return;
    }

    const filePath = path.join(__dirname, 'websites', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      res.status(404).send('Website file not found');
      return;
    }

    const htmlContent = await fs.readFile(filePath, 'utf8');

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
  } catch (error) {
    logger.error('Error serving website file:', { filename, error });
    res.status(500).send('Error loading website');
  }
});

app.post('/send-job-alert', async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  logger.log('Received send job alert request:', { phoneNumber });

  // Get all users with job preferences and alert schedules
  const userWithAlerts = await prisma.users.findUnique({
    include: {
      job_preferences: true
    },
    where: {
      phone_number: phoneNumber,
      job_preferences: {
        alert_schedule: {
          not: 'not_set'
        }
      }
    }
  });

  if (!userWithAlerts) {
    logger.error('No user with alerts found', { phoneNumber });
    res.status(404).send('No user with alerts found');
    return;
  }

  if (!userWithAlerts.job_preferences) {
    logger.error('No job preferences found', { phoneNumber });
    res.status(404).send('No job preferences found');
    return;
  }

  await sendJobAlert(userWithAlerts, userWithAlerts.job_preferences);
  logger.log('Sent job alert for:', { phoneNumber });
  res.status(200).send('OK');
});

// Add work in progress auto response
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const capishPhoneId = secrets.CAPISH_WHATSAPP_PHONE_ID;
    const lumoPhoneId = secrets.LUMO_WHATSAPP_PHONE_ID;
    const phoneNumberId = req.body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    logger.log('Incoming webhook payload:', { debug: JSON.stringify(req.body, null, 2) });

    if (whatsapp.isStatusMessage(req.body)) {
      logger.log('Ignoring status message', { body: JSON.stringify(req.body, null, 2) });
      res.status(200).send('OK');
      return;
    }

    if (phoneNumberId === capishPhoneId) {
      await capishWebhook(req, res);
    } else if (phoneNumberId === lumoPhoneId) {
      await lumoWebhook(req, res);
    } else {
      logger.error('Invalid phone number', {
        debug: phoneNumberId
      });
    }
  } catch (error) {
    logger.error('Error in webhook:', { error });
  }
});

// Add proxy endpoints for font files
app.get('/proxy/vendor/*', async (req: Request, res: Response) => {
  try {
    const url = `https://manpower.netlify.app${req.path.replace('/proxy', '')}`;
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // Set appropriate headers
    res.set('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.set('Access-Control-Allow-Origin', '*');

    res.send(Buffer.from(buffer));
  } catch (error) {
    logger.error('Proxy error:', { error });
    res.status(500).send('Error fetching resource');
  }
});

app.get('/', async (req: Request, res: Response) => {
  try {
    const filePath = path.join(__dirname, 'websites', 'lumo.html');

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      res.status(404).send('Website file not found');
      return;
    }

    const htmlContent = await fs.readFile(filePath, 'utf8');

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
  } catch (error) {
    logger.error('Error serving website file:', { error });
    res.status(500).send('Error loading website');
  }
});

app.get('/privacy-policy', (req: Request, res: Response) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - Joby</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background-color: #f0f2f5;
            }
            .container {
                max-width: 900px;
                margin: 0 auto;
                padding: 2rem;
                background-color: white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #25D366;
                font-size: 2.5rem;
                margin-bottom: 1rem;
            }
            h2 {
                color: #075E54;
                margin-top: 2rem;
            }
            h3 {
                color: #128C7E;
            }
            ul {
                padding-left: 2rem;
            }
            a {
                color: #25D366;
                text-decoration: none;
            }
            a:hover {
                text-decoration: underline;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Privacy Policy</h1>
            <p>Last updated: February 19, 2025</p>

            <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>

            <p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>

            <h2>Interpretation and Definitions</h2>
            <h3>Interpretation</h3>
            <p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

            <h3>Definitions</h3>
            <p>For the purposes of this Privacy Policy:</p>
            <ul>
                <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
                <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to Joby.</li>
                <li><strong>Cookies</strong> are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.</li>
                <li><strong>Country</strong> refers to: Israel</li>
                <li><strong>Device</strong> means any device that can access the Service such as a computer, a cellphone or a digital tablet.</li>
                <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
                <li><strong>Service</strong> refers to the Website.</li>
                <li><strong>Website</strong> refers to Joby, accessible from <a href="https://whatsapp.postrix.io">https://whatsapp.postrix.io</a></li>
                <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
            </ul>

            <!-- Rest of the privacy policy content -->
            
            <h2>Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, You can contact us:</p>
            <ul>
                <li>By email: yuval.glizerin@gmail.com</li>
            </ul>
        </div>
    </body>
    </html>
  `;
  res.send(html);
});

const server = app.listen(PORT, () => {
  logger.log(`Whatsapp service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});
export { server as default };
