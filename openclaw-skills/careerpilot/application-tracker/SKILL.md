---
name: careerpilot-application-tracker
description: "Track job applications, outcomes, and follow-ups. Maintains Excel log with color-coded status. Generates weekly reports with response rates per source/variant."
---

# Application Tracker

Track job applications, outcomes, and follow-ups. Maintains Excel log with color-coded status. Generates weekly reports with response rates per source/variant.

## Trigger phrases
- "Track this application"
- "Log application for [company]"
- "Update application status"
- "Generate weekly report"
- "Show application stats"

## Instructions

### Step 1 — Log new application
When user applies to a job or asks to track:

1. Collect: company, title, source, URL, score, variant
2. Open or create: `~/careerpilot/data/applications.xlsx`
3. Append row with:
   - Date (today)
   - Company
   - Title
   - Source (seek/linkedin/indeed/jora/provider)
   - Location
   - Match Score
   - Company Score (if available)
   - Salary Estimate
   - Status: "applied"
   - Variant: A or B
   - URL
   - Reasoning
   - Responded: false

### Step 2 — Update status
When user reports outcome:

1. Find most recent row matching company
2. Update Status column:
   - "responded" — got a reply
   - "interview" — invited to interview
   - "rejected" — rejected
   - "ghosted" — no response after 14 days
3. Update Responded column to true
4. Update Response Date

### Step 3 — Color-code rows
Apply row colors based on status:
- applied → light green (#D4EDDA)
- responded → light blue (#CCE5FF)
- interview → light yellow (#FFF3CD)
- rejected → light red (#F8D7DA)
- manual_required → light orange (#FDEBD0)
- ghosted → light gray (#E2E3E5)

### Step 4 — Generate weekly report
Calculate:
- Total applications this week
- Response rate (responded / applied)
- Interviews secured
- Best source (highest response rate)
- Best variant (A vs B response rate)
- Average match score of applications

Format as Discord/Telegram embed:
```
📊 Weekly Job Search Report

Applications: 15
Response Rate: 20% (3/15)
Interviews: 1

Best Source: Seek (25% response rate)
Best Variant: B (30% vs 10% for A)
Avg Match Score: 72

Top Companies Applied:
1. Company A (Score: 85)
2. Company B (Score: 78)
3. Company C (Score: 75)
```

### Step 5 — Save report
Save to: `~/careerpilot/output/{profile}/reports/{date}_weekly_report.md`

## Configuration
- Excel file: `~/careerpilot/data/applications.xlsx`
- Status workflow: `{baseDir}/references/status-workflow.md`

## Notes
- Always use most recent row when updating
- Color-code immediately on status change
- Weekly report covers Monday-Sunday
- Track both profiles separately if needed
