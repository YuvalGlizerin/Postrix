import { Logger } from 'logger';
import whatsapp, { type WhatsAppMessagePayload } from 'whatsapp-utils';
import prisma from 'joby-db';

const logger = new Logger('Whatsapp');

export async function handleUnsubscribeCommand(
  whatsAppPayload: WhatsAppMessagePayload,
  accessToken: string
): Promise<boolean> {
  const phoneNumber = whatsAppPayload.entry[0].changes[0].value.messages[0].from;

  await prisma.users.update({
    where: { phone_number: phoneNumber },
    data: { job_preferences: { update: { alert_schedule: 'not_set' } } }
  });

  await whatsapp.respond(whatsAppPayload, 'You have been unsubscribed from job alerts', accessToken);
  return true;
}

export async function handleResetCommand(
  whatsAppPayload: WhatsAppMessagePayload,
  accessToken: string
): Promise<boolean> {
  const phoneNumber = whatsAppPayload.entry[0].changes[0].value.messages[0].from;

  // Delete user and their job preferences in a transaction
  await prisma.$transaction(async tx => {
    // First find the user to get their ID
    const user = await tx.users.findUnique({
      where: { phone_number: phoneNumber }
    });

    if (user) {
      // Delete job preferences first (foreign key constraint)
      await tx.job_preferences
        .delete({
          where: { user_id: user.id }
        })
        .catch(() => {
          // Ignore error if no job_preferences exist
        });

      // Then delete the user
      await tx.users.delete({
        where: { id: user.id }
      });
    }
  });

  logger.log('User reset requested and completed', { phoneNumber });

  await whatsapp.respond(whatsAppPayload, 'Your history has been successfully reset', accessToken);
  return true;
}

export async function handlePreferencesCommand(
  whatsAppPayload: WhatsAppMessagePayload,
  accessToken: string
): Promise<boolean> {
  const phoneNumber = whatsAppPayload.entry[0].changes[0].value.messages[0].from;

  const user = await prisma.users.findUnique({
    where: { phone_number: phoneNumber },
    include: {
      job_preferences: true
    }
  });

  if (!user || !user.job_preferences) {
    await whatsapp.respond(
      whatsAppPayload,
      "You haven't saved any job preferences yet. Start by telling me what kind of job you're looking for!",
      accessToken
    );
    return true;
  }

  let responseMessage = `📋 **Your Job Search Settings:**\n\n`;

  // Add job preferences
  if (user.job_preferences.job_preference) {
    responseMessage += `**Job Preferences:**\n"${user.job_preferences.job_preference}"\n\n`;
  }

  // Add keywords if available
  if (user.job_preferences.keywords) {
    responseMessage += `**Keywords:**\n${user.job_preferences.keywords}\n\n`;
  }

  // Add location if available
  if (user.job_preferences.location) {
    responseMessage += `**Location:**\n${user.job_preferences.location}\n\n`;
  }

  // Add companies if available
  if (user.job_preferences.companies && user.job_preferences.companies.length > 0) {
    responseMessage += `**Target Companies:**\n${user.job_preferences.companies.join(', ')}\n\n`;
  }

  // Add job type if available
  if (user.job_preferences.jobType) {
    responseMessage += `**Job Type:**\n${user.job_preferences.jobType}\n\n`;
  }

  // Add remote preference if available
  if (user.job_preferences.onsiteRemote) {
    responseMessage += `**Work Style:**\n${user.job_preferences.onsiteRemote}\n\n`;
  }

  // Add date posted preference if available
  if (user.job_preferences.datePosted) {
    responseMessage += `**Job Posting Age:**\n${user.job_preferences.datePosted}\n\n`;
  }

  // Add timezone if available
  if (user.job_preferences.time_zone) {
    responseMessage += `**Timezone:**\n${user.job_preferences.time_zone}\n\n`;
  }

  // Add alert schedule
  if (user.job_preferences.alert_schedule) {
    const schedule = user.job_preferences.alert_schedule;
    let scheduleDescription = '';

    // Parse cron to human-readable format
    const cronParts = schedule.split(' ');
    if (cronParts.length >= 5) {
      const hour = parseInt(cronParts[1]);
      const dayOfWeek = cronParts[4];
      const dayOfMonth = cronParts[2];

      let timeStr = '';
      if (hour === 9) {
        timeStr = '9 AM (morning)';
      } else if (hour === 14) {
        timeStr = '2 PM (afternoon)';
      } else if (hour === 18) {
        timeStr = '6 PM (evening)';
      } else {
        timeStr = `${hour}:00`;
      }

      if (dayOfWeek === '*' && dayOfMonth === '*') {
        scheduleDescription = `Daily at ${timeStr}`;
      } else if (dayOfWeek !== '*') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[parseInt(dayOfWeek)] || 'Monday';
        scheduleDescription = `Weekly on ${dayName} at ${timeStr}`;
      } else if (dayOfMonth === '1') {
        scheduleDescription = `Monthly on the 1st at ${timeStr}`;
      } else {
        scheduleDescription = `Custom schedule: ${schedule}`;
      }
    }

    responseMessage += `**Alert Schedule:**\n${scheduleDescription}\n\n`;
  } else {
    responseMessage += `**Alert Schedule:**\nNot set up yet. Tell me when you'd like to receive job alerts!\n\n`;
  }

  responseMessage += `To update your preferences or schedule, just tell me what you're looking for!`;

  await whatsapp.respond(whatsAppPayload, responseMessage, accessToken);
  return true;
}

export async function handleCommand(
  message: string,
  whatsAppPayload: WhatsAppMessagePayload,
  accessToken: string
): Promise<boolean> {
  if (message === '/unsubscribe' || message?.toLocaleLowerCase() === 'unsubscribe') {
    return await handleUnsubscribeCommand(whatsAppPayload, accessToken);
  }

  if (message === '/reset') {
    return await handleResetCommand(whatsAppPayload, accessToken);
  }

  if (message === '/preferences') {
    return await handlePreferencesCommand(whatsAppPayload, accessToken);
  }

  return false; // Not a command
}
