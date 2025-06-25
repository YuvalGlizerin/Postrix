import 'env-loader';
import fs from 'fs';

import express, { type Request, type Response } from 'express';
import whatsapp from 'whatsapp-utils';
import creatomate from 'creatomate';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import secrets from 'secret-manager';
import fileSystem from 'file-system';
import { Logger } from 'logger';

const logger = new Logger('Whatsapp');

process.title = 'Whatsapp';
const app = express();
const PORT = process.env.PORT;

app.use(express.json()); // Add this line to parse JSON request bodies

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/webhook', async (req: Request, res: Response) => {
  logger.log('Received GET webhook verification request:', req.query);
  whatsapp.verifyToken(req, res, 'VERIFY_TOKEN');
});

// Add work in progress auto response
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    res.status(200).send('Message sent successfully'); // no retries

    const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;
    const phoneId = secrets.CAPISH_WHATSAPP_PHONE_ID;
    const apiVideoKey = secrets.CREATOMATE_API_KEY_TRIAL;

    // Log the incoming request body to understand its structure
    logger.log('Incoming webhook payload:', { debug: JSON.stringify(req.body, null, 2) });

    if (req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type !== 'video') {
      const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: req.body.entry[0].changes[0].value.messages[0].from,
        type: 'text',
        text: {
          body: `We only support videos. Please send a video to get it back with captions.`
        }
      };

      const result = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!result.ok) {
        throw new Error('Failed to send message');
      }

      return;
    }

    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: req.body.entry[0].changes[0].value.messages[0].from,
        type: 'text',
        text: {
          body: `We are processing your video. It will be ready shortly with subtitles.`
        }
      })
    });

    const media = await whatsapp.getMedia(req.body, accessToken);
    if (media) {
      const videoPath = await whatsapp.downloadMedia(media, accessToken);

      const fileContent = fs.readFileSync(videoPath);
      const fileName = `video_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp4`;

      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME || 'capish-videos',
        Key: fileName,
        Body: fileContent,
        ContentType: 'video/mp4'
      };

      await fileSystem.s3Client.send(new PutObjectCommand(uploadParams));
      const s3VideoUrl = `https://${uploadParams.Bucket}.s3.amazonaws.com/${uploadParams.Key}`;
      logger.log('S3 Video URL:', { debug: { s3VideoUrl } });

      const captionsUrl = await creatomate.getCaptionsVideoUrlCreatomate(s3VideoUrl, apiVideoKey);
      logger.log(captionsUrl);

      const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: req.body.entry[0].changes[0].value.messages[0].from,
        type: 'video',
        video: {
          link: captionsUrl,
          caption: 'Here is your video with captions!'
        }
      };

      const result = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!result.ok) {
        throw new Error('Failed to send message');
      }
    }
  } catch (error) {
    logger.error('Error with webhook:', { error });
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

app.get('/', (req: Request, res: Response) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en" style="overflow-x: hidden;">

      <head>

        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <meta name="description" content="">
        <meta name="author" content="">

        <title>Capish</title>

        <!-- Bootstrap core CSS -->
        <link href="https://manpower.netlify.app/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">

        <!-- Favicon -->
        <link rel="icon" href="https://manpower.netlify.app/img/favicon.ico" type="image/x-icon"/>
        <link rel="shortcut icon" href="https://manpower.netlify.app/img/favicon.ico" type="image/x-icon"/>

        <!-- Custom fonts for this template -->
        <link href="/proxy/vendor/fontawesome-free/css/all.min.css" rel="stylesheet" type="text/css">
        <link href='https://fonts.googleapis.com/css?family=Open+Sans:300italic,400italic,600italic,700italic,800italic,400,300,600,700,800' rel='stylesheet' type='text/css'>
        <link href='https://fonts.googleapis.com/css?family=Merriweather:400,300,300italic,400italic,700,700italic,900,900italic' rel='stylesheet' type='text/css'>

        <!-- Plugin CSS -->
        <link href="https://manpower.netlify.app/vendor/magnific-popup/magnific-popup.css" rel="stylesheet">

        <!-- Custom styles for this template -->
        <link href="https://manpower.netlify.app/css/creative.min.css" rel="stylesheet">
        <style>
        .video-container {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 100%;
          height: 100%; 
          overflow: hidden;
        }
        .video-container video {
          /* Make video to at least 100% wide and tall */
          min-width: 100%; 
          min-height: 100%; 

          /* Setting width & height to auto prevents the browser from stretching or squishing the video */
          width: auto;
          height: auto;

          /* Center the video */
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%,-50%);
        }
        @media (max-width: 991px) {
          .video-container {
            display: none;
          }
          section {
            padding: 4rem 0;
          }
          header {
            padding-top : 8rem !important;
            padding-bottom: calc(8rem - 56px) !important;
          }
        }
        .no-gutter > [class*=col-] {
        padding-right: 0;
        padding-left: 0;
    }
        </style>
      </head>

      <body id="page-top" style="height: 100%;">

        <!-- Navigation -->
        <nav class="navbar navbar-expand-lg navbar-light fixed-top" id="mainNav">
          <div class="container" style="direction: rtl;">
            <a class="navbar-brand js-scroll-trigger" href="#page-top" style="margin-left: 1rem;margin-right: 0;">Capish</a>
            <button class="navbar-toggler navbar-toggler-right collapsed" type="button" data-toggle="collapse" data-target="#navbarResponsive" aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="navbar-collapse collapse" id="navbarResponsive" style="text-align: right;">
              <ul class="navbar-nav ml-auto" style="margin-right: auto !important;margin-left: 0 !important;padding-right: 0;">
                <li class="nav-item">
                  <a class="nav-link js-scroll-trigger" href="#about">אודות</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link js-scroll-trigger" href="#services">איך זה עובד</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link js-scroll-trigger" href="#contact">יצירת קשר</a>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        <div class="video-container">
          <video autoplay="" muted="" loop="" id="myVideo">
            <source src="https://manpower.netlify.app/img/header.mp4" type="video/mp4">
          </video>
        </div>

        <header class="masthead text-center text-white d-flex">
          <div class="container my-auto">
            <div class="row">
              <div class="col-lg-10 mx-auto">
                <h1 class="">
                  <strong>?רוצים להנגיש את התוכן שלכם<br>!אנחנו כאן בשבילכם</strong>
                </h1>
                <hr>
              </div>
              <div class="col-lg-8 mx-auto">
                <p class="text-faded mb-5">הצטרפו לפלטפורמה המובילה בישראל להוספת כתוביות לסרטונים! מערכת חכמה, מקצועית ומדויקת שתעזור לכם להגיע לקהל רחב יותר</p>
                <a class="btn btn-primary btn-xl js-scroll-trigger" href="#contact">התחילו עכשיו</a>
              </div>
            </div>
          </div>
        </header>

        <section class="bg-primary" id="about">
          <div class="container">
            <div class="row">
              <div class="col-lg-8 mx-auto text-center">
                <h2 class="section-heading text-white">Capish קצת על</h2>
                <hr class="light my-4">
                <p style="direction: rtl" class="text-faded mb-4">Capish היא הפלטפורמה המתקדמת ביותר להוספת כתוביות לסרטונים בישראל. המערכת שלנו משלבת טכנולוגיית AI מתקדמת עם עריכה אנושית מקצועית, כדי להבטיח דיוק מרבי ואיכות ללא פשרות. בין אם מדובר בסרטוני תדמית, הדרכה, או תוכן שיווקי - אנחנו נדאג שהמסר שלכם יגיע לכולם.</p>
                <a class="btn btn-light btn-xl js-scroll-trigger" href="#contact">התחל עכשיו</a>
              </div>
            </div>
          </div>
        </section>

        <section id="services" style="background-color: white;">
          <div class="container">
            <div class="row">
              <div class="col-lg-12 text-center">
                <h2 class="section-heading">?איך עושים את זה</h2>
                <hr class="my-4">
              </div>
            </div>
          </div>
          <div class="container">
            <div style="direction: rtl;" class="row">
              <div class="col-lg-4 text-center">
                <div class="service-box mt-5 mx-auto">
                  <i class="fas fa-4x fa-upload text-primary mb-3 sr-icon-1" style="visibility: visible;"></i>
                  <h3 class="mb-3">שלב ראשון</h3>
                  <p class="text-muted mb-0">העלאת הסרטון למערכת שלנו</p>
                </div>
              </div>
              <div class="col-lg-4 text-center">
                <div class="service-box mt-5 mx-auto">
                  <i class="fas fa-4x fa-magic text-primary mb-3 sr-icon-2" style="visibility: visible;"></i>
                  <h3 class="mb-3">שלב שני</h3>
                  <p class="text-muted mb-0">המערכת החכמה שלנו מייצרת כתוביות מדויקות</p>
                </div>
              </div>
              <div class="col-lg-4 text-center">
                <div class="service-box mt-5 mx-auto">
                  <i class="fas fa-4x fa-check-circle text-primary mb-3 sr-icon-3" style="visibility: visible;"></i>
                  <h3 class="mb-3">שלב שלישי</h3>
                  <p class="text-muted mb-0">קבלת הסרטון המוכן עם כתוביות מושלמות</p>
                </div>
              </div> 
            </div>
          </div>
        </section>
        <section id="contact" class="bg-dark text-white">
          <div class="container">
            <div class="row">
              <div class="col-lg-8 mx-auto text-center">
                <h2 class="section-heading">!נשמח להיות איתכם בקשר</h2>
                <hr class="my-4">
                <p class="mb-5">!אם יש לכם שאלה, הצעה עסקית או סתם רעיון גאוני - אנחנו פה</p>
              </div>
            </div>
            <div style="direction: rtl;" class="row">
              <div class="col-lg-4 mr-auto text-center">
                <a style="color:white" href="tel:+972-52-626-9826">
                  <i class="fas fa-phone fa-3x mb-3 sr-contact-1" style="visibility: visible;"></i>
                  <p>052-626-9826</p>
                </a>
              </div>
              <div class="col-lg-4 ml-auto text-center">
                <a style="color:white" href="mailto:mayrondadush@gmail.com">
                  <i class="fas fa-envelope fa-3x mb-3 sr-contact-2" style="visibility: visible;"></i>
                  <p>mayrondadush@gmail.com</p>
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- Bootstrap core JavaScript -->
        <script src="https://manpower.netlify.app/vendor/jquery/jquery.min.js"></script>
        <script src="https://manpower.netlify.app/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>

        <!-- Plugin JavaScript -->
        <script src="https://manpower.netlify.app/vendor/jquery-easing/jquery.easing.min.js"></script>
        <script src="https://manpower.netlify.app/vendor/scrollreveal/scrollreveal.min.js"></script>
        <script src="https://manpower.netlify.app/vendor/magnific-popup/jquery.magnific-popup.min.js"></script>

        <!-- Custom scripts for this template -->
        <script src="https://manpower.netlify.app/js/creative.min.js"></script>
      

    </body>

    </html>`;
  res.send(html);
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
                <li><strong>Website</strong> refers to Capish, accessible from <a href="https://whatsapp.postrix.io">https://whatsapp.postrix.io</a></li>
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
  logger.log(`Whatsapp service is running on ${process.env.ENV}: http://localhost:${PORT}`);
});

export { server as default };
