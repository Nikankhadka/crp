---
name: careerpilot-auto-apply
description: "Auto-apply to jobs with Playwright browser automation. 8 guardrails: daily cap, per-company cap, cooldown, CAPTCHA detection, blacklist, first-N approval, dry-run, rollback."
metadata: { "openclaw": { "requires": { "bins": ["npx"] } } }
---

# Auto-Apply

Auto-apply to jobs with Playwright browser automation. 8 guardrails ensure safe, controlled automation.

## Trigger phrases
- "Auto-apply to this job"
- "Submit application for [company]"
- "Run auto-apply for qualified jobs"

## Instructions

### Step 1 — Check guardrails before each apply

**Guardrail 1: Daily Cap**
- Tech: max 15 applications per day
- AIN: max 10 applications per day
- Check tracker for today's count
- If at cap: stop, report to user

**Guardrail 2: Per-Company Cap**
- Max 1 application per company per 24 hours
- Check tracker for recent applications to same company
- If duplicate: skip, report to user

**Guardrail 3: Cooldown**
- Wait 30-60 seconds between applications (random)
- Prevents detection as bot
- Use random jitter within range

**Guardrail 4: CAPTCHA Detection**
- Monitor for CAPTCHA during automation
- If detected: pause immediately
- Report to user: "CAPTCHA detected. Please solve manually."
- Wait for user confirmation before continuing
- Mark job as `manual_required`

**Guardrail 5: Blacklist Check**
- Load blacklist from `~/careerpilot/data/shared/blacklist.md`
- Check company name against blacklist
- If blacklisted: skip, report to user

**Guardrail 6: First-N Approval**
- First 5 applications require human approval
- Send approval request to Discord/Telegram
- Wait for user to click "Approve" button
- If rejected: skip job
- After first 5: auto-apply (if AUTO_APPLY=true)

**Guardrail 7: Dry-Run Mode**
- If DRY_RUN=true: log actions but don't submit
- Useful for testing without actually applying
- Report what would have been submitted

**Guardrail 8: Rollback**
- If submission fails (4xx/5xx error): revert status
- Mark as `manual_required`
- Report error to user

### Step 2 — Launch Playwright with saved session
1. Check for saved session: `~/.playwright-auth.json`
2. If no session: prompt user to login manually first
3. Launch Chromium with saved session
4. Navigate to application URL

### Step 3 — Handle platform-specific flows

**Seek Quick Apply:**
1. Click "Apply" button
2. Fill: name, email, phone
3. Upload resume (convert MD to PDF first)
4. Paste cover letter
5. Answer screening questions (if any)
6. Wait for manual confirmation
7. Click submit

**LinkedIn Easy Apply:**
1. Click "Easy Apply" button
2. Fill: name, email, phone
3. Upload resume
4. Paste cover letter (if field available)
5. Answer screening questions
6. Wait for manual confirmation
7. Click submit

**Indeed Easy Apply:**
1. Click "Easily apply" button
2. Fill: name, email, phone
3. Upload resume
4. Paste cover letter (if field available)
5. Answer screening questions
6. Wait for manual confirmation
7. Click submit

**Generic ATS (Workday, Greenhouse, etc.):**
1. Navigate to application page
2. Create account if needed
3. Fill all required fields
4. Upload resume and cover letter
5. Answer screening questions
6. Wait for manual confirmation
7. Click submit

### Step 4 — Log result
Update tracker:
- If successful: status = "applied"
- If failed: status = "manual_required"
- Note any errors

### Step 5 — Report to user
Send confirmation:
```
✅ Application submitted: [Company] - [Title]
Score: [score]/100
Variant: [A/B]
URL: [job URL]
```

## Configuration
- Session file: `~/.playwright-auth.json`
- Guardrails: `{baseDir}/references/guardrails.md`
- Platform flows: `{baseDir}/references/seek-quick-apply.md`, etc.

## Notes
- Always wait for manual confirmation before submit (unless AUTO_APPLY=true)
- Never auto-apply to blacklisted companies
- If CAPTCHA appears: stop and report
- Log every action for debugging
