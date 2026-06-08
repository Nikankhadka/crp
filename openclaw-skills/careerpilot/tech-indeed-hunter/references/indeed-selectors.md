# Indeed CSS Selectors

## Job Search Results Page

### Job Cards
```css
/* Main job card container */
.jobsearch-ResultsList .jobsearch-SerpJobCard

/* Job title */
.jobTitle a
h2.jobTitle a

/* Company name */
.companyName
[data-testid="company-name"]

/* Location */
.companyLocation
[data-testid="text-location"]

/* Salary (if shown) */
.salary-snippet
[data-testid="attribute_snippet_testid"]

/* Job description snippet */
.job-snippet
.underShelfFooter

/* Posted date */
.date
[data-testid="myJobsStateDate"]

/* Easily Apply badge */
.iaLabel
[data-testid="easily-apply-badge"]
```

## Job Detail Page

### Full Description
```css
/* Main job description container */
#jobDescriptionText
.jobsearch-JobComponent-jobDescriptionContainer

/* Job details sidebar */
.jobsearch-JobMetadataHeader
.jobsearch-HiringTeamWrapper

/* Apply button */
#applyButtonLinkContainer
button[data-testid="applyButton"]
```

## Search Form

### Search Inputs
```css
/* "What" field (keywords) */
#text-input-what
input[name="q"]

/* "Where" field (location) */
#text-input-where
input[name="l"]

/* Find Jobs button */
#jobsearch-WhatOrWhere-formSubmitButton
button[type="submit"]
```

## Rate Limiting

- Wait 2 seconds between job card clicks
- Wait 3 seconds between full job page loads
- Maximum 20 jobs per session
- If CAPTCHA appears: stop immediately, report to user

## Common Issues

### Selectors Changed
Indeed updates their DOM frequently. If selectors fail:
1. Take a screenshot
2. Inspect the page manually
3. Update selectors in this file
4. Report the change

### No Results
- Check spelling of keywords
- Try broader location (e.g., "Sydney NSW" instead of "Sydney")
- Remove filters (salary range, date posted, job type)

### Blocked by CAPTCHA
- Stop all automation
- Report to user: "CAPTCHA detected on Indeed. Please solve manually."
- Wait 5 minutes before retrying
- Mark job as `manual_required` in tracker

### "Easily Apply" vs Regular Apply
- "Easily Apply" jobs have a green badge
- These use Indeed's simplified application form
- Regular jobs redirect to company ATS
- Note which jobs have "Easily Apply" in the report
