# 🚀 Joby Job Alert Scheduling System

## Overview

This system enables Joby to send personalized job alerts to users based on their individual cron schedules stored in the database. The system runs continuously as part of the WhatsApp service and uses a simple interval timer to check every minute for users who should receive notifications.

## 🏗️ Architecture

### Components

1. **Job Scheduler Service** (`services/joby/job-scheduler.ts`)
   - Uses `setInterval` to check every minute for due notifications
   - Handles individual user timezones correctly
   - Prevents duplicate notifications with smart timing logic
   - Generates personalized alerts using OpenAI GPT-4o-mini

2. **Database Integration**
   - Uses `alert_schedule` column with cron expressions
   - Supports `time_zone` for accurate scheduling
   - Tracks notification history in memory

3. **WhatsApp Integration**
   - Sends notifications via existing WhatsApp API
   - Uses proper WhatsApp message payload structure

## 📅 Cron Schedule Examples

| User Input | Cron Expression | Description |
|------------|----------------|-------------|
| "Daily at 9 AM" | `0 9 * * *` | Every day at 9:00 AM |
| "Weekly on Monday morning" | `0 9 * * 1` | Every Monday at 9:00 AM |
| "Monthly alerts" | `0 9 1 * *` | 1st of every month at 9:00 AM |
| "Weekly Friday evening" | `0 18 * * 5` | Every Friday at 6:00 PM |

## 🌍 Timezone Handling

The system intelligently determines timezones:

1. **If user specifies job location**: Uses location's timezone
   - Tel Aviv/Jerusalem → `Asia/Jerusalem`
   - New York → `America/New_York`
   - London → `Europe/London`

2. **If remote/no location**: Uses phone number prefix
   - 972 (Israel) → `Asia/Jerusalem`
   - 1 (US/Canada) → `America/New_York`
   - 44 (UK) → `Europe/London`

## 🔄 How It Works

### 1. User Sets Preferences
```
User: "I want weekly Python developer alerts on Monday mornings"
Joby: Updates preferences with cron "0 9 * * 1" and timezone
```

### 2. Scheduler Checks Every Minute
```typescript
// Uses setInterval to run every minute (60000ms)
schedulerInterval = setInterval(async () => {
  await checkAndSendNotifications();
}, 60000);
```

### 3. Smart Notification Logic
- Checks if current time matches user's cron schedule
- Considers user's timezone
- Prevents duplicates (won't send within 1 hour of last notification)
- Respects frequency limits (daily/weekly/monthly)

### 4. Personalized Alerts
```typescript
const prompt = `Generate a personalized job alert message for WhatsApp based on these user preferences:

Job Preference: ${userPreferences.job_preference}
Keywords: ${userPreferences.keywords}
Location: ${userPreferences.location || 'Not specified'}
...`;
```

## 🛠️ Setup Instructions

### Prerequisites
✅ Node.js and npm installed
✅ Database with `job_preferences` table
✅ OpenAI API key configured
✅ WhatsApp API access

### Installation

1. **No Additional Dependencies Needed**
   - Uses built-in JavaScript `setInterval`
   - No external cron libraries required

2. **Start the Service**
```bash
npm start
```

The job scheduler automatically starts when the WhatsApp service launches.

### Health Check

Visit `http://localhost:${PORT}/health` to see scheduler status:

```json
{
  "status": "OK",
  "service": "whatsapp",
  "scheduler": {
    "status": "running",
    "intervalId": "active",
    "lastNotificationCount": 5,
    "lastCheck": "2025-01-10T15:30:00.000Z"
  }
}
```

## 📊 Monitoring

### Key Metrics to Track

1. **Notification Delivery Rate**
   - Success vs failure rates
   - Network/API errors

2. **User Engagement**
   - Response rates to alerts
   - Preference update frequency

3. **System Performance**
   - Memory usage (notification tracking)
   - OpenAI API usage
   - WhatsApp API rate limits

### Useful Database Queries

```sql
-- Users with active alert schedules
SELECT COUNT(*) FROM job_preferences 
WHERE alert_schedule != 'not_set';

-- Daily alert users
SELECT * FROM job_preferences 
WHERE alert_schedule LIKE '0 % * * *';

-- Weekly alert distribution by day
SELECT 
  CASE 
    WHEN alert_schedule LIKE '% % * * 1' THEN 'Monday'
    WHEN alert_schedule LIKE '% % * * 2' THEN 'Tuesday'
    -- ... etc
  END as day_of_week,
  COUNT(*) as count
FROM job_preferences 
WHERE alert_schedule LIKE '% % * * %'
GROUP BY day_of_week;
```

## 🔧 Configuration

### Environment Variables
- `OPENAI_TOKEN` - Required for generating personalized alerts
- `WHATSAPP_ACCESS_TOKEN` - Required for sending notifications
- `DATABASE_URL` - PostgreSQL connection string

### Scheduler Settings
- **Check Frequency**: Every minute (60000ms)
- **Duplicate Prevention**: 1 hour minimum between notifications
- **API Delay**: 1 second between user notifications
- **Implementation**: Simple JavaScript `setInterval`

## 🚨 Error Handling

### Common Issues

1. **Invalid Cron Expressions**
   - System logs errors and skips invalid schedules
   - User can update their preferences

2. **OpenAI API Failures**
   - Falls back to template message
   - Continues notification delivery

3. **WhatsApp API Rate Limits**
   - 1-second delay between notifications
   - Proper error logging

4. **Timezone Errors**
   - Falls back to `America/New_York`
   - Logs for manual review

### Debugging

Check logs for:
```
- "Starting job scheduler..."
- "Checking X users for due notifications"
- "Sending job alert" (individual notifications)
- "Job alert sent successfully"
```

## 🔮 Future Enhancements

### Planned Improvements

1. **Persistent Notification Tracking**
   - Move from memory to Redis/database
   - Survive service restarts

2. **Advanced Scheduling**
   - Support for complex schedules
   - Holiday awareness
   - User pause/resume functionality

3. **Analytics Dashboard**
   - Real-time metrics
   - User engagement tracking
   - Performance monitoring

4. **Smart Notification Timing**
   - ML-based optimal timing
   - User activity patterns
   - Response rate optimization

### Database Schema Extensions

```sql
-- Future notification tracking table
CREATE TABLE notification_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  alert_type VARCHAR(50),
  delivery_status VARCHAR(20),
  user_response BOOLEAN
);
```

## 📝 API Reference

### Scheduler Functions

```typescript
// Start the job scheduler
startJobScheduler(): void

// Stop the scheduler
stopJobScheduler(): void

// Get current status
getSchedulerStatus(): object
```

### Health Check Endpoint

```
GET /health
Response: {
  status: "OK",
  service: "whatsapp", 
  scheduler: {
    status: "running",
    intervalId: "active",
    lastNotificationCount: number,
    lastCheck: string
  }
}
```

## 🤝 Contributing

When modifying the scheduler:

1. **Test Timezone Logic** - Verify with different user locations
2. **Check Duplicate Prevention** - Ensure no spam notifications
3. **Monitor Memory Usage** - Notification tracking uses memory
4. **Validate Cron Expressions** - Handle edge cases gracefully

## 📞 Support

For issues with the job alert system:
1. Check service logs for scheduler errors
2. Verify database connections
3. Test OpenAI API connectivity
4. Monitor WhatsApp API rate limits

---

🎉 **Your personalized job alert system is now live!** Users will receive notifications based on their individual schedules and preferences using a simple, reliable interval-based scheduler. 