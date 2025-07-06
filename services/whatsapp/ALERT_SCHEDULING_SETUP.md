# Job Alert Scheduling Setup Guide

## Overview

This guide adds job alert scheduling functionality to Joby, allowing users to set when they want to receive job alerts (daily, weekly, or monthly) with specific timing preferences.

## Database Changes

### New Column Added
- `alert_schedule` (VARCHAR(100)) - Stores cron job syntax for scheduling alerts

### Migration Steps

1. **Run the database migration:**
```bash
cd packages/joby-db
npx prisma db push
```

2. **Regenerate Prisma client:**
```bash
npx prisma generate
```

3. **Verify migration:**
```bash
npx prisma studio
# Check that job_preferences table now has alert_schedule column
```

## New Functionality

### 🕐 Alert Scheduling Features

**Frequency Options:**
- **Daily**: Maximum frequency (once per day)
- **Weekly**: Recommended (once per week, defaults to Monday)
- **Monthly**: Minimum frequency (once per month, on 1st)

**Time Handling:**
- User specifies hour → use that hour
- "morning" → 9 AM
- "afternoon" → 2 PM  
- "evening" → 6 PM
- No time specified → current hour as default

**Cron Examples Generated:**
- Daily at 9 AM: `0 9 * * *`
- Weekly on Monday at 2 PM: `0 14 * * 1`
- Monthly on 1st at 6 PM: `0 18 1 * *`

### 🤖 Joby's New Behavior

1. **After saving job preferences** → Always asks about alert scheduling
2. **Proactive scheduling** → Guides users through frequency and timing options
3. **Smart defaults** → Uses current hour if no time specified
4. **Flexible scheduling** → Accepts natural language ("weekly alerts in the morning")

### 💬 Example Conversations

**Basic Setup:**
```
User: "I want Python developer jobs in San Francisco"
Joby: ✅ I've saved your job preference:

"Python developer jobs in San Francisco"

Now, let me set up job alerts for you! How often would you like to receive job updates:
• Daily (maximum)
• Weekly (recommended) 
• Monthly (minimum)

And what time of day works best for you?

User: "Weekly in the morning"
Joby: ✅ Perfect! I've scheduled weekly job alerts for you.

You'll receive job updates every Monday at 9 AM based on your preferences.
```

**Advanced Setup:**
```
User: "Remote React developer, $80k+, send me updates twice a week at 2 PM"
Joby: ✅ I've saved your job preference:

"Remote React developer positions, $80k+ salary"

✅ Perfect! I've scheduled weekly job alerts for you.

You'll receive job updates every Monday at 2 PM based on your preferences.
```

## Commands Still Available

- `/preferences` - View saved job preferences AND alert schedule
- `/reset` - Clear all data including alert schedules

## Database Query Examples

**Check user's alert schedule:**
```sql
SELECT phone_number, job_preference, alert_schedule 
FROM users u 
JOIN job_preferences jp ON u.id = jp.user_id 
WHERE u.phone_number = '1234567890';
```

**Find all daily alert users:**
```sql
SELECT * FROM job_preferences 
WHERE alert_schedule LIKE '0 % * * *';
```

**Find weekly Monday alerts:**
```sql
SELECT * FROM job_preferences 
WHERE alert_schedule LIKE '% % * * 1';
```

## Cron Job Integration

The `alert_schedule` column contains standard cron syntax that can be used with:
- Linux cron jobs
- Kubernetes CronJobs  
- AWS CloudWatch Events
- Any cron-compatible scheduler

**Example cron job setup:**
```bash
# Add to crontab for processing alerts
# This would run every hour and check which users need alerts
0 * * * * /path/to/job-alert-processor.sh
```

## Troubleshooting

### TypeScript Errors
If you see `'alert_schedule' does not exist` errors:
1. Ensure migration ran: `npx prisma db push`
2. Regenerate client: `npx prisma generate`
3. Restart your development server

### Missing Cron Schedules
If users have job preferences but no alert schedules:
- This is normal for existing users
- Joby will ask them about scheduling on their next interaction
- You can manually trigger by asking "When would you like job alerts?"

### Invalid Cron Expressions
- Joby automatically generates valid cron syntax
- All expressions follow format: `minute hour day month day_of_week`
- Validation happens in the function parameters

## Monitoring

### Key Metrics to Track
1. **Alert Schedule Adoption**: % of users with both preferences and schedules
2. **Frequency Distribution**: Daily vs Weekly vs Monthly usage
3. **Time Preferences**: Popular hours for alerts
4. **Schedule Changes**: How often users modify their schedules

### Useful Queries
```sql
-- Alert adoption rate
SELECT 
  COUNT(*) as total_users,
  COUNT(alert_schedule) as users_with_schedules,
  ROUND(COUNT(alert_schedule) * 100.0 / COUNT(*), 2) as adoption_rate
FROM job_preferences;

-- Frequency distribution  
SELECT 
  CASE 
    WHEN alert_schedule LIKE '% % * * *' THEN 'daily'
    WHEN alert_schedule LIKE '% % * * %' AND alert_schedule NOT LIKE '% % * * *' THEN 'weekly'
    WHEN alert_schedule LIKE '% % 1 * *' THEN 'monthly'
    ELSE 'other'
  END as frequency,
  COUNT(*) as count
FROM job_preferences 
WHERE alert_schedule IS NOT NULL
GROUP BY frequency;
```

This functionality transforms Joby from a preference collector into a proactive job alert system! 🚀 