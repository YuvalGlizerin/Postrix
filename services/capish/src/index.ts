import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import whatsapp from 'whatsapp';

dotenv.config({ path: `envs/${process.env.ENV}.env` });
process.title = 'Capish';
const app = express();
const PORT = process.env.PORT;

// Add this line to serve static files from the Website directory
app.use(express.static('src/PlacementBusiness/Website'));

app.get('/', (req: Request, res: Response) => {
  res.sendFile('PlacementBusiness/Website/index.html', { root: './src' });
});

app.get('/webhook', (req: Request, res: Response) => {
  whatsapp.verifyToken(req, res, 'VERIFY_TOKEN');
});

app.get('/privacy-policy', (req: Request, res: Response) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - Capish</title>
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
                <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to Capish.</li>
                <li><strong>Cookies</strong> are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.</li>
                <li><strong>Country</strong> refers to: Israel</li>
                <li><strong>Device</strong> means any device that can access the Service such as a computer, a cellphone or a digital tablet.</li>
                <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
                <li><strong>Service</strong> refers to the Website.</li>
                <li><strong>Website</strong> refers to Capish, accessible from <a href="https://capish.postrix.io">https://capish.postrix.io</a></li>
                <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
            </ul>

            <!-- Rest of the privacy policy content -->
            
            <h2>Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, You can contact us:</p>
            <ul>
                <li>By email: mayrondadush@gmail.com</li>
            </ul>
        </div>
    </body>
    </html>
  `;
  res.send(html);
});

const server = app.listen(PORT, () => {
  console.log(`Capish service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export { server as default };
