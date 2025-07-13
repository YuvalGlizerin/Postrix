import prisma from 'joby-db';
import whatsapp, { type WhatsAppTemplate } from 'whatsapp-utils';
import secrets from 'secret-manager';
import { Logger } from 'logger';
import OpenAI from 'openai';
import redis from 'redis';

const jobyPhoneId = secrets.JOBY_WHATSAPP_PHONE_ID;
const accessToken = secrets.WHATSAPP_ACCESS_TOKEN;
const getJobDetailsUrl = (id: string) => `https://linkedin-data-api.p.rapidapi.com/get-job-details?id=${id}`;
const getLocationUrl = (location: string) =>
  `https://linkedin-data-api.p.rapidapi.com/search-locations?keyword=${location}`;
const getCompanyUrl = (company: string) =>
  `https://linkedin-data-api.p.rapidapi.com/get-company-details?username=${company}`;
const getJobsUrl = (
  keywords: string,
  locationId?: number,
  companyIds?: string[],
  datePosted?: 'anyTime' | 'pastMonth' | 'pastWeek' | 'past24Hours' | null,
  jobType?: 'fullTime' | 'partTime' | 'contract' | 'internship' | null,
  onsiteRemote?: 'onsite' | 'remote' | 'hybrid' | null
) => {
  const baseUrl = 'https://linkedin-data-api.p.rapidapi.com/search-jobs-v2';
  const queryParts: string[] = [];

  // Manually encode keywords to use %20 for spaces
  queryParts.push(`keywords=${keywords.replace(/ /g, '%20')}`);

  if (locationId) {
    queryParts.push(`locationId=${locationId}`);
  }
  if (companyIds) {
    queryParts.push(`companyIds=${companyIds.join(',')}`);
  }
  if (datePosted) {
    queryParts.push(`datePosted=${datePosted}`);
  }
  if (jobType) {
    queryParts.push(`jobType=${jobType}`);
  }
  if (onsiteRemote) {
    queryParts.push(`onsiteRemote=${onsiteRemote}`);
  }

  return `${baseUrl}?${queryParts.join('&')}`;
};

const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-key': secrets.LINKEDIN_API_KEY,
    'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com'
  }
};

interface JobData {
  id: string;
  title: string;
  company: {
    name: string;
  };
  location: string;
  details?: {
    description?: string;
  };
}

async function addJobDetailsToEveryJob(jobs: JobData[]) {
  await Promise.all(
    jobs.map(async job => {
      const jobDetails = await fetch(getJobDetailsUrl(job.id), options);
      const jobDetailsResult = await jobDetails.json();
      job.details = jobDetailsResult.data;
    })
  );
  return jobs;
}

const logger = new Logger('JobScheduler');

const openai = new OpenAI({
  apiKey: secrets.OPENAI_TOKEN
});

// Redis key prefix for storing last notification times
const LAST_NOTIFICATION_KEY_PREFIX = 'last_notification:';

// Keep track of the interval ID
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

// Function to check if user should receive notification based on cron and last sent time
async function shouldSendNotification(userId: number, alertSchedule: string, timezone: string): Promise<boolean> {
  try {
    // Parse cron expression: "minute hour day_of_month month day_of_week"
    const [minute, hour, dayOfMonth, month, dayOfWeek] = alertSchedule.split(' ');

    // Get current time in user's timezone
    const now = new Date();
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    // Check if current time matches the cron schedule
    const currentMinute = userTime.getMinutes();
    const currentHour = userTime.getHours();
    const currentDay = userTime.getDate();
    const currentMonth = userTime.getMonth() + 1; // getMonth() is 0-indexed
    const currentDayOfWeek = userTime.getDay(); // 0=Sunday, 1=Monday, etc.

    // Check minute (should be 0 for our schedules)
    if (minute !== '0' && minute !== '*' && parseInt(minute) !== currentMinute) {
      return false;
    }

    // Check hour
    if (hour !== '*' && parseInt(hour) !== currentHour) {
      return false;
    }

    // Check day of month
    if (dayOfMonth !== '*' && parseInt(dayOfMonth) !== currentDay) {
      return false;
    }

    // Check month
    if (month !== '*' && parseInt(month) !== currentMonth) {
      return false;
    }

    // Check day of week
    if (dayOfWeek !== '*' && parseInt(dayOfWeek) !== currentDayOfWeek) {
      return false;
    }

    // Get last sent time from Redis
    const lastSentTimestamp = await redis.get(`${LAST_NOTIFICATION_KEY_PREFIX}${userId}`);
    const lastSent = lastSentTimestamp ? new Date(parseInt(lastSentTimestamp)) : null;

    // If we have a last sent time, check if enough time has passed
    if (lastSent) {
      const timeDiff = now.getTime() - lastSent.getTime();
      const hoursSinceLastSent = timeDiff / (1000 * 60 * 60);

      // Don't send if we sent within the last hour (prevents duplicates)
      if (hoursSinceLastSent < 1) {
        return false;
      }

      // For daily schedules, don't send more than once per day
      if (alertSchedule.includes('* * *') && hoursSinceLastSent < 24) {
        return false;
      }

      // For weekly schedules, don't send more than once per week
      if (
        alertSchedule.includes('* * 1') ||
        alertSchedule.includes('* * 2') ||
        alertSchedule.includes('* * 3') ||
        alertSchedule.includes('* * 4') ||
        alertSchedule.includes('* * 5') ||
        alertSchedule.includes('* * 6') ||
        alertSchedule.includes('* * 0')
      ) {
        const daysSinceLastSent = hoursSinceLastSent / 24;
        if (daysSinceLastSent < 7) {
          return false;
        }
      }

      // For monthly schedules, don't send more than once per month
      if (alertSchedule.includes('1 * *')) {
        const daysSinceLastSent = hoursSinceLastSent / 24;
        if (daysSinceLastSent < 30) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    logger.error('Error parsing cron schedule:', { alertSchedule, error });
    return false;
  }
}

// Function to send job alert to a user
export async function sendJobAlert(
  user: { id: number; phone_number: string | null },
  preferences: {
    job_preference: string;
    keywords: string;
    location?: string | null;
    datePosted: 'anyTime' | 'pastMonth' | 'pastWeek' | 'past24Hours' | null;
    companies?: string[];
    jobType?: 'fullTime' | 'partTime' | 'contract' | 'internship' | null;
    onsiteRemote?: 'onsite' | 'remote' | 'hybrid' | null;
    time_zone?: string | null;
    alert_schedule: string;
  }
): Promise<void> {
  try {
    let locationId: number | undefined;
    let companyIds: string[] | undefined;

    if (!user.phone_number) {
      return;
    }

    if (preferences.location) {
      const locationResponse = await fetch(getLocationUrl(preferences.location), options);
      const locationResult = await locationResponse.json();
      locationId = locationResult?.data?.items?.[0]?.id.split(':').pop();
    }

    if (preferences.companies) {
      for (const company of preferences.companies) {
        const companyResponse = await fetch(getCompanyUrl(company), options);
        const companyResult = await companyResponse.json();
        if (!companyIds) {
          companyIds = [];
        }
        companyIds.push(companyResult?.data?.id);
      }
    }

    const searchJobsUrl = getJobsUrl(
      preferences.keywords,
      locationId,
      companyIds,
      preferences.datePosted,
      preferences.jobType,
      preferences.onsiteRemote
    );

    const response = await fetch(searchJobsUrl, options);
    const result = await response.json();
    const jobsWithDetails = await addJobDetailsToEveryJob(result.data.slice(0, 48));

    // Ask AI to choose 0-5 jobs based on job preference
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful job assistant that chooses the BEST 0 to 5 jobs that suit the users preference. You MUST return between 0 and 5 job IDs maximum. Return ONLY a valid JSON array of job IDs that match the preference, or an empty array if none match. Do not use markdown formatting or code blocks - return raw JSON only.'
        },
        {
          role: 'user',
          content: `Based on this job preference: ${JSON.stringify(preferences)}
            
Choose 0-5 jobs from this list that best match the preference:
${JSON.stringify(jobsWithDetails, null, 2)}

Return only a JSON array of job IDs (strings) that match, for example: ["job1", "job2"]`
        }
      ]
    });

    const selectedJobIds = JSON.parse(aiResponse.choices[0].message.content || '[]').slice(0, 5);

    // Send WhatsApp message for each selected job
    for (const jobId of selectedJobIds) {
      const selectedJob = jobsWithDetails.find(job => job.id === jobId);
      if (!selectedJob) {
        continue;
      }

      // Summarize the job description using OpenAI
      const summaryResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful job assistant that summarizes job descriptions.'
          },
          {
            role: 'user',
            content: `Summarize the following job description in at most one sentence:\n${selectedJob.details?.description || 'No description available'}`
          }
        ]
      });
      const summary = summaryResponse.choices[0].message.content;

      const template: WhatsAppTemplate = {
        name: 'one_job',
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                parameter_name: 'job_title',
                text: selectedJob.title
              },
              {
                type: 'text',
                parameter_name: 'company',
                text: selectedJob.company.name
              },
              {
                type: 'text',
                parameter_name: 'location',
                text: selectedJob.location
              },
              {
                type: 'text',
                parameter_name: 'description',
                text: summary || 'No description available'
              }
            ]
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              {
                type: 'text',
                text: selectedJob.id
              }
            ]
          }
        ]
      };

      await whatsapp.sendTemplate(user.phone_number, jobyPhoneId, template, accessToken);
      logger.log(`Sent job notification for: ${selectedJob.title} at ${selectedJob.company.name}`);
    }
  } catch (error) {
    logger.error('Error sending job alert:', {
      userId: user.id,
      phoneNumber: user.phone_number,
      error
    });
  }
}

// Function to check and send due notifications
async function checkAndSendNotifications(): Promise<void> {
  try {
    // Get all users with job preferences and alert schedules
    const usersWithAlerts = await prisma.users.findMany({
      include: {
        job_preferences: true
      },
      where: {
        job_preferences: {
          alert_schedule: {
            not: 'not_set'
          }
        }
      }
    });

    logger.log(`Checking ${usersWithAlerts.length} users for due notifications`);

    for (const user of usersWithAlerts) {
      const preferences = user.job_preferences;
      if (!preferences || !preferences.alert_schedule || preferences.alert_schedule === 'not_set') {
        continue;
      }

      const timezone = preferences.time_zone || 'America/New_York';

      if (await shouldSendNotification(user.id, preferences.alert_schedule, timezone)) {
        logger.log('Sending job alert', {
          userId: user.id,
          phoneNumber: user.phone_number,
          schedule: preferences.alert_schedule,
          timezone
        });

        await sendJobAlert(user, preferences);

        // Update last notification time in Redis
        await redis.set(`${LAST_NOTIFICATION_KEY_PREFIX}${user.id}`, Date.now().toString());

        // Add small delay to avoid overwhelming WhatsApp API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    logger.error('Error in checkAndSendNotifications:', { error });
  }
}

// Initialize the job scheduler
export function startJobScheduler(): void {
  logger.log('Starting job scheduler...');

  // Clear any existing interval
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  // Run every minute (60000ms)
  schedulerInterval = setInterval(async () => {
    await checkAndSendNotifications();
  }, 60000);

  logger.log('Job scheduler started - checking for notifications every minute');
}

// Function to stop the scheduler
export function stopJobScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.log('Job scheduler stopped');
  }
}

// Health check function
export async function getSchedulerStatus(): Promise<object> {
  try {
    // Get count of Redis keys matching our pattern
    const keys = await redis.keys(`${LAST_NOTIFICATION_KEY_PREFIX}*`);
    return {
      status: schedulerInterval ? 'running' : 'stopped',
      intervalId: schedulerInterval ? 'active' : 'inactive',
      lastNotificationCount: keys.length,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting scheduler status:', { error });
    return {
      status: schedulerInterval ? 'running' : 'stopped',
      intervalId: schedulerInterval ? 'active' : 'inactive',
      lastNotificationCount: 0,
      lastCheck: new Date().toISOString(),
      error: 'Failed to get Redis count'
    };
  }
}
