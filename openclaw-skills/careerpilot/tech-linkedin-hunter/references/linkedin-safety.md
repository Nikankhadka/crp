# LinkedIn Safety Rules

## Critical Rules

### 1. No Login Scraping
- Only access public job listings
- Do NOT log into LinkedIn
- Do NOT use saved credentials
- Public listings are visible without authentication

### 2. Rate Limiting
- Wait 3 seconds between job card clicks
- Wait 5 seconds between page loads
- Maximum 20 jobs per session
- Maximum 1 session per day

### 3. No Automated Actions
- Do NOT send connection requests
- Do NOT send messages to recruiters
- Do NOT click "Easy Apply" automatically
- Do NOT endorse skills or recommend people
- Do NOT like, comment, or share posts

### 4. CAPTCHA Handling
If LinkedIn shows a CAPTCHA:
1. Stop all automation immediately
2. Report to user: "LinkedIn CAPTCHA detected. Please solve manually."
3. Wait 5 minutes before retrying
4. If CAPTCHA appears again: stop for the day

### 5. What You CAN Do
- Browse public job listings
- Extract job title, company, location, description
- Note "Easy Apply" badges
- Save job URLs for manual application

### 6. What You CANNOT Do
- Access private profiles
- Send messages or connection requests
- Apply to jobs automatically
- Scrape recruiter contact info
- Access premium features

## Consequences of Violations

LinkedIn actively detects automation:
- Temporary account restrictions
- Permanent account bans
- IP address blocking
- Device fingerprinting

**Always prioritize account safety over speed.**

## Easy Apply vs Regular Apply

### Easy Apply
- Badge: "Easy Apply" shown on job card
- Application stays within LinkedIn
- Can upload resume and cover letter
- Still requires manual review and submit

### Regular Apply
- Redirects to company's external site
- May use different ATS (Workday, Greenhouse, etc.)
- Requires separate application process
- Use auto-apply skill if available

## Detection Avoidance

### Good Practices
- Use real browser (not headless)
- Maintain 3-second delays
- Limit to 20 jobs per session
- Use residential IP (not datacenter)
- Clear cookies between sessions

### Bad Practices (Avoid)
- Headless browsers
- Fast clicking (< 2 seconds)
- Multiple sessions per day
- VPN/datacenter IPs
- Automated form filling
