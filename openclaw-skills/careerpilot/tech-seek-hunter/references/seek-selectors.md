# Seek CSS Selectors

## Job Search Results Page

### Job Cards
```css
/* Main job card container */
[data-automation="jobCard"]

/* Individual job cards */
article[data-automation="jobCard"]

/* Job title */
[data-automation="jobTitle"]
a[data-automation="jobTitle"]

/* Company name */
[data-automation="jobCompany"]

/* Location */
[data-automation="jobLocation"]

/* Salary (if shown) */
[data-automation="jobSalary"]

/* Job description snippet */
[data-automation="jobDescription"]

/* Posted date */
[data-automation="jobListingDate"]

/* Easy Apply badge */
[data-automation="jobEasyApply"]
```

## Job Detail Page

### Full Description
```css
/* Main job description container */
[data-automation="jobDescription"]
[data-automation="jobAdDetails"]

/* Job details sidebar */
[data-automation="jobDetails"]

/* Apply button */
[data-automation="applyButton"]
button[data-automation="applyButton"]
```

## Search Form

### Search Inputs
```css
/* "What" field (keywords) */
input[data-automation="search-suggestions-keyword-input"]
#search-suggestions-keyword-input

/* "Where" field (location) */
input[data-automation="search-suggestions-location-input"]
#search-suggestions-location-input

/* Search button */
button[data-automation="searchSubmit"]
```

## Rate Limiting

- Wait 2-3 seconds between job card clicks
- Wait 3-5 seconds between full job page loads
- Maximum 20 jobs per session
- If CAPTCHA appears: stop immediately, report to user

## Common Issues

### Selectors Changed
Seek updates their DOM frequently. If selectors fail:
1. Take a screenshot
2. Inspect the page manually
3. Update selectors in this file
4. Report the change

### No Results
- Check spelling of keywords
- Try broader location (e.g., "Sydney NSW" instead of "Sydney")
- Remove filters (salary range, date posted)

### Blocked by CAPTCHA
- Stop all automation
- Report to user: "CAPTCHA detected on Seek. Please solve manually."
- Wait 5 minutes before retrying
- Mark job as `manual_required` in tracker
