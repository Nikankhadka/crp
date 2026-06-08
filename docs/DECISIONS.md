# Design Decisions

Record of all major design decisions with rationale and dates.

---

## Decision 1: Build path — Hybrid (Phase 1 + Phase 2)

**Date**: 2026-06-06  
**Decision**: Use OpenClaw Phase 1 for immediate value (20 min setup), then build NestJS Phase 2 in parallel (2-4 weeks).

**Rationale**:
- OpenClaw gives value today: job discovery + tailoring without code.
- NestJS gives long-term value: headless deployment, feedback loop, dashboard.
- Running both in parallel means you get immediate ROI while building the production system.
- OpenClaw data (applications.xlsx) can seed the NestJS Supabase database for the feedback loop.

**Alternatives considered**:
- NestJS only: 4-6 weeks to first value. Too slow.
- OpenClaw only: No headless deployment, no feedback loop, no dashboard. Less powerful.

---

## Decision 2: Two separate profiles (Tech + AIN)

**Date**: 2026-06-06  
**Decision**: Support two distinct profiles with separate resumes, cover letters, preferences, and scoring prompts.

**Rationale**:
- User has two different career paths with different target roles, tones, and sources.
- Tech profile: Software Engineer, confident/technical tone, Seek+LinkedIn+Indeed.
- AIN profile: Assistant in Nursing, compassionate/person-centred tone, Seek Health+Indeed+Jora+provider careers.
- Separate profiles allow profile-specific scoring, tailoring, and auto-apply guardrails.

**Alternatives considered**:
- Single profile with role tags: Too complex, different tones/sources don't mix well.
- Two separate systems: Duplicates work, harder to maintain.

---

## Decision 3: Run mode — Parallel daily runs (different quotas)

**Date**: 2026-06-06  
**Decision**: Both profiles run daily in parallel, with different daily quotas (Tech: 15/day, AIN: 10/day).

**Rationale**:
- Parallel runs maximize application volume without waiting for one profile to finish.
- Different quotas reflect market differences: Tech has more jobs but higher competition, AIN has fewer jobs but higher demand.
- Staggered start times (Tech 9am, AIN 9:30am) reduce load on scrapers and look more natural to ATS.

**Alternatives considered**:
- Sequential (alternate days): Slower, less volume.
- Same quota for both: Doesn't reflect market differences.

---

## Decision 4: Auto-apply — Strict guardrails (Tech) + Full auto (AIN)

**Date**: 2026-06-06  
**Decision**: 
- Tech profile: Strict guardrails (dry-run first, captcha-escalate, daily cap, per-company cap, first-5 human approval).
- AIN profile: Full auto with all guardrails (no dry-run, but still rate-limited and captcha-aware).

**Rationale**:
- Tech market is more competitive and ATS systems are more sophisticated. Strict guardrails reduce ban risk.
- AIN market has higher demand and less sophisticated ATS. Full auto is viable with rate limits.
- Both profiles use the same guardrail framework (daily cap, per-company cap, cooldown, captcha detection, blacklist).

**Alternatives considered**:
- No auto-apply (prep-only): Safer but slower. User wants automation.
- Full auto for both: Higher ban risk for Tech profile.

---

## Decision 5: Sources — Tech (Seek+LinkedIn+Indeed) vs AIN (Seek Health+Indeed+Jora+provider careers)

**Date**: 2026-06-06  
**Decision**: 
- Tech profile: Seek, LinkedIn (public listings only), Indeed.
- AIN profile: Seek Healthcare & Medical, Indeed, Jora, aged care provider career sites (Bupa, Opal, Regis, HammondCare, Estia).

**Rationale**:
- Tech roles are concentrated on Seek, LinkedIn, Indeed.
- AIN roles are concentrated on Seek Healthcare, Jora, and provider career sites. LinkedIn has fewer AIN roles.
- Provider career sites are essential for AIN — many aged care facilities only post on their own sites.

**Alternatives considered**:
- Same sources for both: Misses AIN-specific sources (Jora, provider sites).
- More sources (Glassdoor, AngelList): Not viable for AU market, too much work.

---

## Decision 6: AIN references — Keep in resume.md, configurable

**Date**: 2026-06-06  
**Decision**: Keep references in the AIN resume.md, with a toggle in preferences.md (`include_references_in_tailored: true|false`).

**Rationale**:
- AIN employers often explicitly ask for references in the job ad.
- Modern convention is "references available on request," but some aged care providers want them upfront.
- Configurable toggle lets the user decide per run.

**Alternatives considered**:
- Strip references: Loses data if employer asks for them.
- Hardcode references in tailored output: Less flexible.

---

## Decision 7: Resume input — Markdown (.md)

**Date**: 2026-06-06  
**Decision**: Use Markdown for resumes and cover letters, not JSON or PDF.

**Rationale**:
- Markdown is human-readable and easy to edit.
- LLMs work better with Markdown than JSON for resume tailoring (more natural language).
- No need for PDF parsing (user provides Markdown directly).
- Markdown can be converted to PDF/DOCX later if needed.

**Alternatives considered**:
- JSON: More structured but harder for humans to write/edit.
- PDF: Requires parsing, loses formatting, harder to tailor.
- DOCX: Requires parsing, complex format.

---

## Decision 8: Docs depth — VIABILITY + DECISIONS thorough, rest concise

**Date**: 2026-06-06  
**Decision**: 
- `docs/VIABILITY.md` and `docs/DECISIONS.md`: Thorough (3-5 pages each, with rationale, tradeoffs, alternatives).
- Other docs: Concise (1-2 pages, focus on what to do, less on why).

**Rationale**:
- Viability analysis is critical for understanding what the system can and cannot do.
- Decision log is critical for understanding why the system is built this way.
- Other docs are reference material — concise is better for quick lookup.

**Alternatives considered**:
- All docs thorough: Too much writing, slows down build.
- All docs concise: Loses important context for viability and decisions.

---

## Decision 9: AGENT_PROMPTS versioning — v1 kept, v2 added alongside

**Date**: 2026-06-06  
**Decision**: Keep the original `AGENT_PROMPTS.md` (v1) untouched, add `AGENT_PROMPTS_v2.md` alongside.

**Rationale**:
- v1 is a reference for the original 16-step plan (JSON resume, single profile, no guardrails).
- v2 is the revised plan (MD resume, two profiles, guardrails, multi-market).
- Keeping both allows comparison and rollback if needed.

**Alternatives considered**:
- Replace v1 with v2: Loses the original reference.
- Patch v1 inline: Messy, hard to track changes.

---

## Decision 10: Preferences capture — Full (blacklist, salary floor, company-size, tone)

**Date**: 2026-06-06  
**Decision**: Capture full preferences per profile: target roles, locations, min score, daily cap, blacklist, salary floor, company-size preference, tone.

**Rationale**:
- Full preferences give the LLM more context for scoring and tailoring.
- Blacklist prevents applying to companies the user wants to avoid.
- Salary floor filters out jobs below the user's minimum.
- Company-size preference helps prioritize jobs at companies of the right size.
- Tone ensures cover letters match the profile (tech = confident, AIN = compassionate).

**Alternatives considered**:
- Minimal preferences (just roles + locations): Less context for LLM, lower quality.
- Full + A/B variant instructions: More complex, not needed yet.

---

## Decision 11: Phone/email mismatch — Two different people

**Date**: 2026-06-06  
**Decision**: Treat the two profiles as two different people. Keep both emails/phones as-is.

**Rationale**:
- User confirmed the two profiles are for two different people.
- Phone numbers differ by one digit (469-691 vs 469-491), but user confirmed this is intentional.
- Emails are different Gmail accounts.

**Alternatives considered**:
- Same person, normalize contact info: User said no.
- Same person, keep separate: User said no.

---

## Future decisions (to be made later)

### Decision 12: Dashboard deployment — Vercel vs self-hosted
**Status**: Not yet decided  
**Options**: Vercel (free, easy), self-hosted (more control, more work)

### Decision 13: Multi-resume support (different resumes per role)
**Status**: Not yet decided  
**Options**: Single resume per profile, multiple resumes per profile (e.g., "React Developer" resume vs "Full Stack" resume)

### Decision 14: Feedback loop weight — How much to trust past outcomes
**Status**: Not yet decided  
**Options**: Light weighting (past outcomes inform but don't override), heavy weighting (past outcomes strongly influence scoring)
