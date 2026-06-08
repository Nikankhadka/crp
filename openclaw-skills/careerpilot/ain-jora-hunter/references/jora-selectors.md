# Jora CSS Selectors

## Jora Search Page

### Search Form
```css
/* Keyword input */
input#q
input[name="q"]

/* Location input */
input#l
input[name="l"]

/* Search button */
button[type="submit"]
input[type="submit"]
```

### Job Cards
```css
/* Main job card container */
.job-card
article.job-card

/* Job title */
.job-title a
h2.job-title a

/* Company name */
.company-name
[data-testid="company-name"]

/* Location */
.job-location
[data-testid="location"]

/* Salary (if shown) */
.job-salary
[data-testid="salary"]

/* Source board */
.job-source
.posted-by

/* Posted date */
.job-date
[data-testid="date"]

/* Job description snippet */
.job-snippet
.job-description-snippet
```

## Job Detail Page

### Full Description
```css
/* Main job description */
.job-description
#job-description

/* Apply button (links to original source) */
.apply-button
a.apply-link

/* Original source link */
.source-link
a[data-testid="source-link"]
```

## Jora-Specific Notes

### Aggregator Behavior
- Jora aggregates from Seek, Indeed, and other boards
- Clicking "Apply" redirects to original source
- Job URLs may be Jora redirect URLs
- Always note the original source board

### Duplicate Detection
- Same job may appear from multiple sources
- Check company + title + location for duplicates
- Prefer direct source (Seek/Indeed) over aggregator

### Rate Limiting
- Wait 2 seconds between job card clicks
- Wait 3 seconds between full job page loads
- Maximum 20 jobs per session
- If CAPTCHA appears: stop immediately

## Common Issues

### Redirect URLs
Jora uses redirect URLs like:
```
https://www.jora.com/job/123456?source=seek
```
The `source` parameter indicates original board.

### Missing Salary
Many aggregated jobs don't include salary. Note "Not specified" in tracker.

### Expired Jobs
Jora sometimes shows expired jobs. If job page shows "no longer available":
- Skip the job
- Note in tracker as "expired"
- Don't count toward daily total
