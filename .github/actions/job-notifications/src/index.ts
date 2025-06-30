import 'env-loader';

import whatsapp from 'whatsapp-utils';
import secrets from 'secret-manager';
import { Logger } from 'logger';

const logger = new Logger('Job Notifications');
const jobyPhoneId = secrets.JOBY_WHATSAPP_PHONE_ID;
const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;
const myPhoneNumber = '972544686188';
const url =
  'https://linkedin-data-api.p.rapidapi.com/search-jobs-v2?keywords=Backend%20Developer%20Nodejs&locationId=101570771&datePosted=past24Hours&jobType=fullTime&sort=mostRelevant';
const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-key': secrets.LINKEDIN_API_KEY,
    'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com'
  }
};

async function run() {
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    const whatsappMessage = `Hi Yuval, I found a job that you might be interested in: \n\nJob Title: ${result.data[0].title}\nJob Url: ${result.data[0].url}`;
    await whatsapp.sendMessage(myPhoneNumber, jobyPhoneId, whatsappMessage, accessToken);
    logger.log(result);
  } catch (error) {
    logger.error('Error fetching LinkedIn jobs', { error });
  }
}

run();

export default run;
