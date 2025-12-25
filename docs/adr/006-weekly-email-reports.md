# ADR 006: Automated Weekly Email Reports

## Status

Accepted

## Context

Poshak leaders and administrators needed:

- Regular summaries of student performance
- Identification of students with missing entries
- Aggregated statistics without manual dashboard review
- Scheduled delivery without manual intervention

## Decision

We implemented automated weekly email reports using node-cron and Nodemailer.

### Cron Schedule

```javascript
// Every Monday at 7:00 AM IST
cron.schedule('0 7 * * 1', async () => {
  await sendWeeklyReports();
}, {
  timezone: 'Asia/Kolkata'
});
```

### Report Contents

```
📊 Weekly Accountability Report
Period: [Start Date] - [End Date]

📈 Summary Statistics
- Total entries submitted: X
- Average wake-up time: HH:MM
- Mangala Aarti attendance: X%
- Morning Katha (Zoom): X%
- Average meditation: X min

⚠️ Students with Missing Entries
- Student Name: X missing days
- ...

✅ Perfect Attendance (7/7 days)
- Student Name
- ...

📉 Areas for Improvement
- Students with high wasted time
- Students with low reading time
```

### Email Configuration

```javascript
// Nodemailer with SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
```

### Recipients

- All approved poshak leaders
- All admin users
- Configurable additional recipients

## Consequences

### Positive

- Passive monitoring without manual effort
- Early identification of struggling students
- Data-driven coaching opportunities
- Consistent delivery schedule

### Negative

- Requires SMTP configuration
- Email deliverability concerns
- Server must be running at scheduled time
- No real-time alerting

## Future Improvements

1. Add daily summary option
2. WhatsApp integration for mobile-first users
3. Customizable report templates
4. Per-poshak filtered reports

