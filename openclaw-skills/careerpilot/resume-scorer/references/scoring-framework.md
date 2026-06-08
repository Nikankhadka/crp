# Scoring Framework

## Detailed Scoring Methodology

### 1. Keyword Match (40 points)

#### Exact Match (60% of keyword score)
Count keywords that appear exactly as written in job description.

**Process:**
1. Extract all nouns and technical terms from job description
2. Remove common words (the, a, and, etc.)
3. Compare against resume text (case-insensitive)
4. Calculate: (exact_matches / total_keywords) × 100

**Example:**
- Job requires: "React", "TypeScript", "Node.js", "PostgreSQL"
- Resume has: "React", "TypeScript", "Express", "MongoDB"
- Exact matches: 2/4 = 50%
- Score: 50% × 24 = 12 points

#### Semantic Match (40% of keyword score)
Count keywords that are semantically related.

**Semantic mappings:**
- "React" ↔ "React.js", "ReactJS"
- "Node.js" ↔ "Node", "Express", "Backend JavaScript"
- "SQL" ↔ "PostgreSQL", "MySQL", "Database"
- "REST API" ↔ "RESTful", "API development"
- "Agile" ↔ "Scrum", "Kanban", "Sprint"

**Process:**
1. For each unmatched keyword, check semantic equivalents
2. Count semantic matches
3. Calculate: (semantic_matches / total_keywords) × 100
4. Score: percentage × 16

**Total keyword score = exact_score + semantic_score**

---

### 2. Experience Relevance (25 points)

#### Years of Experience (10 points)
- Meets or exceeds requirement: 10 points
- Within 1 year short: 7 points
- Within 2 years short: 4 points
- More than 2 years short: 0 points
- Overqualified (3+ years over): 5 points (may leave quickly)

#### Industry Match (8 points)
- Same industry: 8 points
- Related industry: 5 points
- Different industry but transferable: 3 points
- No relevant industry experience: 0 points

#### Seniority Level (7 points)
- Perfect match (e.g., Mid-level applying for Mid-level): 7 points
- One level off (e.g., Senior applying for Mid-level): 4 points
- Two levels off: 0 points

---

### 3. Skills Match (20 points)

#### Required Skills (12 points)
- All required skills present: 12 points
- 80-99% of required skills: 9 points
- 60-79% of required skills: 6 points
- 40-59% of required skills: 3 points
- Less than 40%: 0 points

#### Preferred Skills (8 points)
- All preferred skills present: 8 points
- 60-99% of preferred skills: 5 points
- 30-59% of preferred skills: 3 points
- Less than 30%: 0 points

---

### 4. Format/ATS (10 points)

#### Section Headers (3 points)
Standard headers present:
- Contact Information: 1 point
- Experience/Work History: 1 point
- Education: 1 point
- Skills: 1 point (bonus, max 3 total)

Deduct 1 point for non-standard headers (e.g., "My Journey" instead of "Experience")

#### Formatting (4 points)
- No tables: 1 point
- No images/graphics: 1 point
- No headers/footers with content: 1 point
- Standard fonts (Arial, Calibri, Times): 1 point

#### Date Format (2 points)
- Consistent format: 2 points
- Parseable (MM/YYYY or Month YYYY): 1 point
- Inconsistent or unparsable: 0 points

#### Contact Info (1 point)
- Email present: 0.5 points
- Phone present: 0.5 points

---

### 5. Location Fit (5 points)

- Same city: 5 points
- Same metropolitan area: 4 points
- Same state, commutable: 3 points
- Same state, requires relocation: 2 points
- Different state, willing to relocate: 1 point
- International or no relocation mentioned: 0 points

---

## Score Interpretation

### Tech Profile
- **85-100**: Excellent match, apply immediately
- **70-84**: Good match, worth applying
- **65-69**: Minimum threshold, apply with strong cover letter
- **60-64**: Stretch, only if high volume day
- **Below 60**: Skip

### AIN Profile
- **80-100**: Excellent match, apply immediately
- **70-79**: Good match, worth applying
- **60-69**: Minimum threshold, apply with strong cover letter
- **55-59**: Stretch, only if location/salary perfect
- **Below 55**: Skip

---

## Common Keyword Categories

### Tech Keywords
**Frontend:** React, Vue, Angular, JavaScript, TypeScript, HTML, CSS, Next.js
**Backend:** Node.js, Express, Python, Java, Go, REST API, GraphQL
**Database:** PostgreSQL, MySQL, MongoDB, Redis, SQL, NoSQL
**DevOps:** Docker, Kubernetes, CI/CD, AWS, Azure, GCP
**Testing:** Jest, Cypress, Playwright, Unit Testing, E2E

### AIN Keywords
**Care:** Person-centred care, ADLs, care plans, medication assistance
**Certifications:** Certificate III, First Aid, CPR, Police Check, NDIS Screening
**Conditions:** Dementia, diabetes, palliative care, aged care
**Skills:** Manual handling, communication, teamwork, observation
