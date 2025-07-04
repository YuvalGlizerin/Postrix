import 'env-loader';

import whatsapp from 'whatsapp-utils';
import secrets from 'secret-manager';
import { Logger } from 'logger';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: secrets.OPENAI_TOKEN
});
const logger = new Logger('Job Notifications');
const jobyPhoneId = secrets.JOBY_WHATSAPP_PHONE_ID;
const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;
const myPhoneNumber = '972544686188';
const searchJobsUrl =
  'https://linkedin-data-api.p.rapidapi.com/search-jobs-v2?keywords=Backend%20Developer%20Nodejs&locationId=101570771&datePosted=past24Hours&jobType=fullTime&sort=mostRelevant';
const getJobDetailsUrl = (id: string) => `https://linkedin-data-api.p.rapidapi.com/get-job-details?id=${id}`;

const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-key': secrets.LINKEDIN_API_KEY,
    'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com'
  }
};

async function run() {
  try {
    logger.log('Fetching LinkedIn jobs');
    const response = await fetch(searchJobsUrl, options);
    const result = await response.json();
    const jobDetails = await fetch(getJobDetailsUrl(result.data[0].id), options);
    const jobDetailsResult = await jobDetails.json();

    const jobDescription = jobDetailsResult.data.description;
    // Summarize the job description using OpenAI
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that summarizes job descriptions.' },
        {
          role: 'user',
          content: `Summarize the following job description in at most two sentences:\n${jobDescription}`
        }
      ]
    });
    const summary = summaryResponse.choices[0].message.content;

    const whatsappMessage =
      `Hi Yuval, I found a job that you might be interested in: \n\n` +
      `*Job Title:* ${result.data[0].title}\n` +
      `*Company:* ${result.data[0].company.name}\n` +
      `*Location:* ${result.data[0].location}\n` +
      `*Job Url:* ${result.data[0].url}\n` +
      `*Job Description:* ${summary}`;

    await whatsapp.sendMessage(myPhoneNumber, jobyPhoneId, whatsappMessage, accessToken);
    logger.log(result);
  } catch (error) {
    logger.error('Error fetching LinkedIn jobs', { error });
    process.exit(1);
  }
  process.exit(0);
}

run();

export default run;
