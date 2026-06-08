---
name: careerpilot-networking-outreach
description: "Draft networking messages, recruiter outreach, and follow-up emails. Templates for LinkedIn connection requests, informational interviews, and referral asks."
metadata: { "openclaw": { "requires": { "env": ["OPENROUTER_API_KEY"] }, "primaryEnv": "OPENROUTER_API_KEY" } }
---

# Networking Outreach

Draft networking messages, recruiter outreach, and follow-up emails. Templates for LinkedIn connection requests, informational interviews, and referral asks.

## Trigger phrases
- "Draft a networking message"
- "Write LinkedIn connection request"
- "Message to recruiter at [company]"
- "Follow up after no response"

## Instructions

### Step 1 — Get context
Collect from user:
- Recipient name and role
- Company
- Relationship (stranger, acquaintance, mutual connection)
- Goal (informational interview, referral, job inquiry)
- Platform (LinkedIn, email, other)

### Step 2 — Generate appropriate message

**LinkedIn Connection Request (300 char limit):**
```
Hi [Name], I'm a [role] admiring [company]'s work in [specific]. I'd love to connect and learn from your experience with [specific topic]. Happy to share insights on [your expertise] as well.
```

**Informational Interview Ask:**
```
Subject: Quick chat about [specific topic]?

Hi [Name],

I came across your profile and was impressed by [specific achievement/project]. I'm a [role] exploring [industry/specialization] and would love to learn about your experience with [specific topic].

Would you have 15 minutes for a quick chat in the next couple weeks? I'm happy to work around your schedule.

Thanks,
[Your name]
```

**Referral Request:**
```
Subject: Quick question about [company]

Hi [Name],

I hope you're doing well. I noticed [company] is hiring for a [role] and I'm very interested in applying.

Given your experience there, I'd love to hear your perspective on the team culture and what makes someone successful in that role. If you feel comfortable, I'd also appreciate a referral.

I've attached my resume for context. Happy to chat at your convenience.

Thanks,
[Your name]
```

**Recruiter Response (positive):**
```
Hi [Name],

Thanks for reaching out about the [role] at [company]. It sounds like a great fit — my experience with [relevant skill] aligns well with what you're looking for.

I'd love to learn more. Are you available for a call [suggest 2-3 time slots]?

Best,
[Your name]
```

**Recruiter Response (not interested):**
```
Hi [Name],

Thanks for thinking of me. While this role isn't quite the right fit at the moment, I'd love to stay connected for future opportunities in [your area].

Best,
[Your name]
```

### Step 3 — Generate follow-up sequence

**Day 0:** Initial message sent
**Day 3:** If no response, send gentle follow-up:
```
Hi [Name], just following up on my previous message. I understand you're busy — happy to chat whenever works for you.
```

**Day 7:** If still no response, one more attempt:
```
Hi [Name], I know this is a busy time. If now isn't the right moment, no worries at all. I'd still love to connect when things settle down.
```

**Day 14:** If no response after 3 attempts, move on. Don't spam.

### Step 4 — Save messages
Save to: `~/careerpilot/output/{profile}/networking/{date}_{recipient}_messages.md`

## Notes
- Keep messages under 150 words
- Be specific about why you're reaching out
- Don't ask for too much in first message
- Always offer value in return
- Follow up but don't spam
