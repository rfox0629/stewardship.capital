# Build Roadmap v1

## Purpose

This roadmap defines the intended build sequence for Stewardship Capital. Future sessions should follow this order unless the user explicitly changes priorities.

Do not skip ahead into auth, database migrations, assessment logic, dashboard UI, or reports until the relevant step is requested.

## Locked Build Order

1. Foundation docs and AGENTS.md
2. Responsive homepage shell
3. Auth
4. Supabase schema
5. Assessment MVP
6. Auto save / resume later
7. Scoring engine
8. Dashboard MVP
9. PDF report v1
10. Financial Analysis
11. Opportunity Engine
12. Professional Network

## Step 1: Foundation Docs And AGENTS.md

Goal:

Create the project source of truth before product code is built.

Deliverables:

- `AGENTS.md`
- `docs/stewardship-capital-master-plan-v1.md`
- `docs/scoring-framework-v1.md`
- `docs/ux-dashboard-architecture-v1.md`
- `docs/data-architecture-v1.md`
- `docs/brand-homepage-direction-v1.md`
- `docs/build-roadmap-v1.md`

Status:

Current foundation step.

## Step 2: Responsive Homepage Shell

Goal:

Create the first public product surface.

Requirements:

- Hero headline: "Steward What Matters Most."
- Subheadline: "Understand, organize, and grow everything God has entrusted to you from your finances and business to your family, legacy, and impact."
- Primary CTA: Start Your Assessment
- Secondary CTA: View Sample Dashboard
- Trust bullets: Takes about 5 minutes; Progress saves automatically
- Key copy: "Clarity brings confidence. Stewardship brings purpose."
- Scripture CTA: "To whom much is given, much is required." Luke 12:48
- Mobile first
- Desktop responsive
- Premium Christian family office feel, but not family-office-only

Do not implement authentication during this step unless explicitly requested.

## Step 3: Auth

Goal:

Allow users to create accounts and return to their assessment and dashboard.

Notes:

- Auth should support the required resume-later experience.
- Auth should be implemented only after the homepage shell is ready or when explicitly requested.

## Step 4: Supabase Schema

Goal:

Create the initial database foundation.

MVP data model should plan for:

- profiles
- assessments
- assessment_responses
- scores
- roadmap_items
- dashboard_snapshots
- reports

Do not create migrations before this step is requested.

## Step 5: Assessment MVP

Goal:

Build the 5 to 7 minute diagnostic assessment.

Requirements:

- Fast diagnostic, not financial intake
- 25 questions max
- No dollar amounts
- No account connections
- No uploads
- Mostly Yes / No / Not Sure and multiple choice
- Auto save shown at top
- Resume later is required

## Step 6: Auto Save / Resume Later

Goal:

Make progress preservation visible and trustworthy.

Requirements:

- Auto save visible in assessment header
- Clear saved state
- Resume later path
- Users should never fear losing progress

## Step 7: Scoring Engine

Goal:

Calculate initial scores and stage from Assessment v1.

Outputs:

- Stewardship Score
- Financial Readiness Score
- Legacy Impact Score
- Stewardship Stage
- Top priority signals

Stages:

- Survive
- Stabilize
- Build
- Multiply
- Legacy

## Step 8: Dashboard MVP

Goal:

Create the first full product experience.

The dashboard is the product. The PDF is a deliverable generated from dashboard data.

MVP dashboard includes:

- Stewardship Score
- Stewardship Stage
- Profile Completion %
- Protect / Grow / Transfer / Impact snapshot
- Top 3 priorities
- Next recommended step
- Locked future modules
- CTA to Complete Financial Analysis

Tabs:

- Overview
- Protect
- Grow
- Transfer
- Impact
- Reports

## Step 9: PDF Report v1

Goal:

Generate professional reports from dashboard data.

Principle:

The PDF should not be the product. It should be an export or deliverable generated from the dashboard's source data.

## Step 10: Financial Analysis

Goal:

Unlock deeper data collection after dashboard creation.

Financial Analysis can collect richer financial details that are not allowed in Assessment v1.

## Step 11: Opportunity Engine

Goal:

Generate structured opportunities from dashboard, assessment, and Financial Analysis data.

All opportunities should map to:

- Protect
- Grow
- Transfer
- Impact

Recommendations should be framed as topics worth discussing with the user's professional team.

## Step 12: Professional Network

Goal:

Support referral or collaboration workflows with relevant professional teams.

Potential professionals:

- Attorneys
- CPAs
- Financial advisors
- Insurance professionals
- Business advisors
- Real estate professionals
- Giving and foundation advisors

## Future Data Domains

Future architecture should plan for:

- assets
- liabilities
- income_sources
- expenses
- businesses
- estate_documents
- insurance_policies
- giving_records
- account_connections
- document_uploads
- redaction_jobs
- opportunities
- professional_referrals

