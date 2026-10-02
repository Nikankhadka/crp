# Career Pilot vs ResuMax: competitive analysis

Scope: this repository ("Career Pilot", package `resume-refiner`) compared with
**ResuMax** (<https://resumax.ai>), a tech-focused AI career agent.

Method: Career Pilot claims come from inspecting this codebase (file references
below). ResuMax claims come from its public marketing site on the date of
research and are **self-reported and unverified**. Confirm pricing, limits and
figures on the vendor site before relying on them.

## TL;DR - the main differences

- **Scope.** Career Pilot is a resume *engine*: score, tailor and render a
  resume against one job ad. ResuMax is a full career *funnel*: find roles,
  assess fit, tailor materials, prepare for interviews and track applications.
- **Audience.** Career Pilot is job-agnostic and works for any occupation.
  ResuMax is explicitly tech-only (software engineers, ML engineers, product
  managers, designers).
- **Delivery.** Career Pilot is self-hostable, has a CLI, and runs an
  invite-only private web app. ResuMax is a closed, public multi-tenant SaaS
  with Stripe billing.
- **Business model.** Career Pilot has no billing and no pricing (invite-only,
  bring-your-own free model). ResuMax is freemium with usage-limited paid tiers.
- **Anti-fabrication.** Both promise not to invent experience, but Career Pilot
  enforces it in code (a validation guard plus facts resolved from the bank),
  while ResuMax enforces it as a review-before-save product policy.
- **Surface area.** ResuMax adds a native live job market, interview, coding and
  system-design coaching, offer negotiation, named ATS templates, and an MCP
  bridge into ChatGPT/Claude/Codex. Career Pilot has none of those products.

## At a glance

| Dimension | Career Pilot | ResuMax |
|---|---|---|
| Primary purpose | Job-agnostic resume score/tailor/render engine | Tech-focused end-to-end career agent |
| Target user | Any occupation, any industry | SWE, ML, PM, design (tech only) |
| Core flow | Score -> tailor -> render | Discover -> assess -> tailor -> prepare -> track |
| Scoring model | Fixed 100-point rubric (skills, seniority, domain, location, nice-to-have) | 0-100 recruiter-style review with 5 weighted categories |
| Tailoring guard | Code-level anti-fabrication guard | Review-before-save policy, "never invents experience" |
| Content model | Free-form user "seed bank" (`sections`) | Structured "career record" profile |
| Output formats | PDF (Typst) and DOCX, ATS-safe, auto one-page shrink | PDF and DOCX, ATS templates (Jake's, Harvard, MIT, Stanford, Deedy) |
| Job discovery | Optional Adzuna + Firecrawl, click-driven | Native Career Market (~12.6k roles, daily refresh) |
| Interview prep | None (docs library can hold prep material) | Coding, behavioral, system design, offer negotiation |
| AI-assistant integration | None | MCP into ChatGPT, Claude, Codex |
| LLM/provider | Open, bring-your-own OpenAI-compatible, free Zen gateway | Closed vendor-managed models |
| Hosting | Self-hostable (Vercel/Supabase or local PGlite) + CLI | Vendor-hosted SaaS only |
| Accounts | Invite-only, no public signup | Public signup |
| Pricing | None (free) | Free; Pro $29/mo; Premium $49/mo |
| Maturity | Early / private | Launched Oct 2025, self-reported 16k+ users |
| Open source | Source in this repo, testable, extensible | Proprietary |

## Detailed differences

### 1. Positioning and scope

Career Pilot is deliberately narrow and generic: "A job-agnostic resume engine.
It scores, tailors and renders resumes against a job advertisement using a
personal seed bank, with no industry-specific vocabulary baked into the prompts"
(`README.md:1-15`). Its shipped surface is the CLI score/tailor/render path,
the seed bank, the universal prompt base, the anti-fabrication guard and the
Typst renderer (`README.md:7-8`).

ResuMax positions itself as "the career operating system," covering the whole
funnel a candidate moves through: "building and scoring a resume, tailoring it
to a specific job description, finding matching roles, generating cover letters,
preparing for interviews, and negotiating offers" (resumax.ai/about). Its agent,
Atlas, runs a discover/assess/tailor/prepare/track loop (resumax.ai).

The gap is therefore not "better vs worse engine" but "engine vs platform."
Career Pilot stops at the tailored document; ResuMax continues into the job
market and interview.

### 2. Target audience

Career Pilot is occupation-agnostic by design, and task prompts are tested to
contain no occupation-specific vocabulary (`AGENTS.md:5-6`, `AGENTS.md:93-94`).

ResuMax is explicitly vertical: "built for software engineers, PMs, designers,
and ML engineers" and states non-engineers "should look elsewhere"
(resumax.ai/about; resumax.ai/best/resume-builder-software-engineers). It ships
tech templates such as Jake's Resume, the Harvard/MIT/Stanford formats and the
Deedy template (resumax.ai/resume-templates).

Consequence: Career Pilot can serve a nurse, a marketer or a lawyer with the
same prompts; ResuMax's scoring, project library and interview content are tuned
to tech roles.

### 3. Scoring model

Career Pilot uses a fixed 100-point rubric: required skills 40, seniority 20,
domain 15, location/work rights 15, nice-to-have 10. Partial postings are capped
at 75, and citizenship/PR/clearance requirements are hard blockers
(`prompts/base/score.md`; `src/core/score.ts`). Output includes
`keywordsToMirror` (max 15), `redFlags`, `oneLineWhy` and a must-haves
met/missing list (`src/core/schemas.ts`).

ResuMax uses a recruiter-style 0-100 score with a category breakdown. Its public
example shows ATS readability 25, content quality 35, writing 10, job match 25
and application ready 5 (resumax.ai). Free accounts get the score plus the top
two findings, five scores per month; Pro gets 25 recruiter reviews per month and
Premium 100 (resumax.ai/pricing).

Career Pilot's rubric is transparent in the repo and deterministic in shape;
ResuMax's is a black-box vendor score with published weights.

### 4. Tailoring and the anti-fabrication guarantee

Both products claim they do not invent experience.

Career Pilot enforces this in code. Every tailored bullet cites a bank
`sourceId`, and the guard rejects unknown item/source/summary ids, invented
numbers, rewrites that share too little with their source (under 50 percent),
unknown skills, and vocabulary the bank cannot back (`src/core/guard.ts`;
`README.md:63-66`). Separately, org, title, name, credentials, dates and tech are
always resolved from the bank at merge time, never taken from the model
(`AGENTS.md:100-101`; `src/render/typst.ts`). The model can only produce bullet
text and the summary rewrite.

ResuMax's guarantee is a workflow policy: tailoring creates a reviewable
proposal, saving requires explicit approval, and "the original stays intact"
(resumax.ai/mcp). The site states it "never invents achievements"
(resumax.ai/best/best-resume-builder-2026). This is asserted, not visible as a
verifiable rule from outside.

For a technically skeptical user, Career Pilot's guarantee is inspectable and
testable; ResuMax's is contractual.

### 5. Content model

Career Pilot's seed bank is a free-form list of `{ type, items }` sections, so
any section type works without schema changes, and the top level is strict so a
misplaced key errors loudly (`src/core/bank.ts`; `AGENTS.md:96-98`). Data lives
in three documents per user: `profile.yaml`, `resume.yaml`, `personal.md`
(`src/server/seedBank.ts`).

ResuMax centers on a persistent "career record" that keeps profile, documents,
roles, applications and outcomes connected so the assistant "can answer from the
same source of truth without making you repeat your story" (resumax.ai/mcp).

Career Pilot's model is file/format-driven and portable; ResuMax's is a hosted
record designed to be queried by an assistant.

### 6. Rendering and output

Career Pilot merges against the bank, renders a generic single-column Typst
template, and runs a render-then-shrink loop that drops trailing bullets until
the resume fits the target page count (default 1 page, up to 3 passes), reading
page counts with `pdf-lib`; DOCX output is ATS-safe with no tables, columns or
graphics (`src/render/typst.ts`; `src/render/docx.ts`; `README.md:56-61`).

ResuMax offers a form-based builder with five named ATS templates and exports
clean, unwatermarked PDF and DOCX on paid plans (resumax.ai/resume-templates;
resumax.ai/pricing). It advertises automatic spacing/font adjustment after edits
so content always fills the page (resumax.ai).

Both land on one-page ATS-safe output; Career Pilot's is generic and
template-independent, ResuMax's is designer-named and builder-driven.

### 7. Job discovery

Career Pilot's discovery is optional and explicit-click only: Adzuna keyword,
place and country search (17 countries) plus Firecrawl URL-to-markdown import,
both env-keyed and disabled cleanly when unset. Every upstream failure collapses
to a fixed message because the Adzuna key travels in the request URL
(`src/server/discovery.ts`; `README.md:87-98`).

ResuMax runs a native Career Market: "12,661 verified roles" from "11 source
families," refreshed daily, with a personalized digest of 5 to 10 roles and
evidence-based fit (resumax.ai). Discovery is a core product, not an add-on.

### 8. Interview and offer preparation

Career Pilot has no interview product. Its docs library can hold reference
material across categories such as `interview`, `playbook` and `memory`, but it
is explicitly background context and "never a source of facts"
(`src/server/docsStore.ts`; `prompts/base/system.md`).

ResuMax makes this a pillar: coding practice and Company Focus packs, behavioral
practice (50/month Pro, 200/month Premium), a system-design coach (8/month Pro,
30/month Premium), interview coaching and readiness tracking, and offer
negotiation on Premium, plus an 81-project build library (22 free)
(resumax.ai/pricing).

### 9. AI integration and extensibility

Career Pilot is extensible at the source level: an OpenAI-compatible client, a
single LLM seam, a CLI, and a testable engine (`src/providers/llm.ts`;
`src/cli.ts`). It defaults to the free OpenCode Zen gateway and the free
`nemotron-3.5-lightning-free` model, switchable by env
(`README.md:30-39`). There is no MCP integration.

ResuMax ships an MCP server so ChatGPT, Claude and Codex can drive it: find
roles, review resumes, prepare interviews and track applications. Access is
owner-scoped and revocable, and it cannot submit applications or message
employers (resumax.ai/mcp).

These are opposite strategies: Career Pilot is a library you can fork and
self-host; ResuMax is a service you connect other assistants to.

### 10. Accounts, privacy and hosting

Career Pilot is invite-only with no public signup. Sessions are a stateless
HMAC-signed `cp_session` cookie, passwords use scrypt, and login/signup accept
JSON only to stop form login CSRF (`src/server/auth.ts`; `src/proxy.ts`). Only
the owner/admin creates single-use, expiring invites, and only the sha256 is
stored (`src/server/invites.ts`). Every store call is user-scoped, and the
README states no one, including the owner, sees another user's data
(`README.md:115-117`; `AGENTS.md:58-62`). It runs locally on embedded PGlite or
on Vercel plus Supabase (`README.md:68-85`).

ResuMax is public signup. It states career data "is not sold," only the context
needed for an action is sent to model providers, and users can disconnect
clients, export data or delete the account (resumax.ai/pricing). It is
vendor-hosted only.

### 11. Pricing and business model

Career Pilot has no billing, plans, paywall or rate limits in the product. It
runs on free models, is invite-only, and is effectively free for a private
group. A repo-wide search for billing/pricing terms found no product matches;
the only forward hooks are an unused notification topic and a "hardening slice"
note for per-user rate limits (`.env.example`; `src/app/api/discovery/search/route.ts`).

ResuMax runs freemium: Free at $0; Pro at $29/mo (about $12/mo billed yearly);
Premium at $49/mo (about $17/mo billed yearly) with a $2.95 seven-day trial, all
through Stripe (resumax.ai/pricing). Free includes all ATS templates, five
resume scores, three tailoring previews and one cover letter per month; paid
tiers raise limits and unlock interview coaching (resumax.ai/pricing).

### 12. Maturity and traction

ResuMax reports launching in October 2025 and reaching 15,000+ to 16,000+ job
seekers, 29,000+ resumes built and 14,000+ recruiter-grade reviews, grown by word
of mouth (resumax.ai/about; resumax.ai/pricing). Career Pilot is an early,
private codebase with no published traction and no public signup.

## Where each wins

**Career Pilot strengths**

- Job-agnostic: one engine for any occupation, prompts tested to stay generic.
- Verifiable anti-fabrication: code-level guard, facts resolved from the bank.
- Private and self-hostable: invite-only, per-user isolation, runs on a laptop
  or Vercel/Supabase with a free model.
- Free and open: no billing, no usage caps, source is inspectable and testable.
- Portable content: free-form seed bank in plain YAML/Markdown.

**ResuMax strengths**

- Breadth: one connected loop from job market to offer.
- Native live Career Market with personalized matching.
- Deep interview prep: coding, behavioral, system design, negotiation.
- Named ATS templates and a polished form builder.
- MCP bridge into ChatGPT, Claude and Codex.
- Go-to-market: public signup, Stripe, priced tiers, reported traction.

## Caveats

- All ResuMax figures, category weights, limits and prices are self-reported on
  its marketing site and can change; verify before relying on them.
- ResuMax is aimed at tech roles; comparisons of "quality" for non-tech work are
  not apples to apples.
- Career Pilot has no pricing page because it is invite-only and has no billing.
  "Free" here means no cost is built into the product, not a marketed plan.
- This analysis is a feature and positioning comparison, not a quality benchmark
  of output from either tool.

## Sources

Career Pilot (this repo):

- `README.md`, `AGENTS.md`
- `prompts/base/score.md`, `prompts/base/system.md`
- `src/core/score.ts`, `src/core/guard.ts`, `src/core/bank.ts`, `src/core/schemas.ts`
- `src/render/typst.ts`, `src/render/docx.ts`
- `src/server/discovery.ts`, `src/server/docsStore.ts`, `src/server/seedBank.ts`
- `src/server/auth.ts`, `src/server/invites.ts`
- `src/providers/llm.ts`, `src/cli.ts`

ResuMax (public site, accessed during research):

- <https://resumax.ai/>
- <https://resumax.ai/about>
- <https://resumax.ai/pricing>
- <https://resumax.ai/mcp>
- <https://resumax.ai/resume-templates>
- <https://resumax.ai/resume-score>
- <https://resumax.ai/best/best-resume-builder-2026>
- <https://resumax.ai/best/resume-builder-software-engineers>
