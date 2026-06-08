---
name: careerpilot-email-manager
description: "Manage job search emails. Draft responses to recruiters, track email threads, flag urgent replies, and schedule follow-ups."
---

# Email Manager

Manage job search emails. Draft responses to recruiters, track email threads, flag urgent replies, and schedule follow-ups.

## Trigger phrases
- "Draft email response"
- "Reply to recruiter email"
- "Track this email thread"
- "Follow up on application"

## Instructions

### Step 1 — Categorize email
When user shares an email, categorize:
- **Interview invite**: Respond within 24 hours
- **Rejection**: Acknowledge professionally, ask for feedback
- **Information request**: Provide requested info promptly
- **Recruiter outreach**: Express interest or decline politely
- **Offer**: Review carefully, use salary-negotiation skill
- **Follow-up needed**: No response after 7+ days

### Step 2 — Draft appropriate response

**Interview Invite:**
```
Subject: Re: Interview for [Role] at [Company]

Hi [Name],

Thank you for the invitation. I'm available at the following times:
- [Date/Time 1]
- [Date/Time 2]
- [Date/Time 3]

Please let me know which works best. I look forward to speaking with the team.

Best,
[Your name]
[Phone]
```

**Rejection (graceful):**
```
Subject: Re: [Role] Application

Hi [Name],

Thank you for letting me know. While disappointed, I appreciate you taking the time to review my application.

If possible, I'd welcome any feedback on how I could strengthen my candidacy for future roles.

I'd love to stay connected for opportunities that might be a better fit.

Best regards,
[Your name]
```

**Recruiter Outreach (interested):**
```
Hi [Name],

Thanks for reaching out. The [role] at [company] sounds interesting — my experience with [relevant skill] seems well-aligned.

I'd love to learn more. Are you available for a quick call this week?

Best,
[Your name]
```

**Follow-Up (no response):**
```
Subject: Following up on [Role] application

Hi [Name],

I hope this finds you well. I wanted to follow up on my application for the [role] position submitted on [date].

I remain very interested in the opportunity and would welcome the chance to discuss how my experience with [relevant skill] could contribute to [company].

Please let me know if you need any additional information.

Best regards,
[Your name]
```

### Step 3 — Track email thread
Log to tracker:
- Company
- Contact name
- Email type
- Date received
- Response sent (yes/no)
- Follow-up needed (date)

### Step 4 — Schedule follow-ups
If no response after 7 days:
- Draft follow-up email
- Remind user to send
- Log follow-up in tracker

### Step 5 — Save emails
Save to: `~/careerpilot/output/{profile}/emails/{date}_{company}_emails.md`

## Notes
- Respond to interview invites within 24 hours
- Keep responses professional and concise
- Always thank the recruiter/hiring manager
- Track all email threads in one place
- Follow up once after 7 days, then move on
