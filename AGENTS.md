# Stewardship Capital Agent Guide

## Purpose

This file is the operating guide for future Codex sessions working on Stewardship Capital. Treat it as the first source of truth before making product, design, schema, or implementation decisions.

Stewardship Capital is a Christian first Stewardship Operating System for families, business owners, investors, doctors, dentists, real estate owners, and affluent Christian households.

Core promise:

Understand, organize, and grow everything God has entrusted to you.

## Product Positioning

Position Stewardship Capital as:

A Christian first Stewardship Operating System for families, business owners, investors, doctors, dentists, real estate owners, and affluent Christian households.

Primary audience:

- Christian business owners
- Doctors
- Dentists
- Real estate investors
- Executives
- Retirees
- Affluent Christian families

Do not position Stewardship Capital as:

- Budgeting app
- Financial advisor
- CPA firm
- Wealth management firm
- Generic fintech app
- Family office only

The product should feel like a premium Christian family office experience, but it must remain approachable for people who do not identify as family office clients.

## Locked Product Journey

The core product journey is:

Landing Page -> Create Account -> 5 to 7 minute assessment -> Dashboard Created -> Explore Dashboard -> Complete Financial Analysis -> Unlock Opportunities -> Generate Professional Reports

The dashboard is the product. The PDF is a deliverable generated from dashboard data.

## Build Order

Follow this order unless the user explicitly changes it:

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

Do not skip ahead. In particular, do not implement auth, database migrations, assessment logic, dashboard UI, or PDF generation until the relevant build step is requested.

## Assessment v1 Rules

Assessment v1 is a fast diagnostic, not financial intake.

Locked requirements:

- 25 questions max
- No dollar amounts
- No account connections
- No uploads
- Mostly Yes / No / Not Sure and multiple choice
- Auto save shown at top
- Resume later is required
- Designed for 5 to 7 minutes

Product rules:

- Never force users through a giant intake form.
- Use progressive onboarding through the dashboard.
- The first assessment should feel easy and fast.
- No financial numbers in Assessment v1.
- Financial data is unlocked after dashboard creation.
- Auto save should be visible in the assessment header.
- Users should never fear losing progress.

## Scores, Stages, And Pillars

Scores:

- Stewardship Score
- Financial Readiness Score
- Legacy Impact Score

Stages:

- Survive
- Stabilize
- Build
- Multiply
- Legacy

Four pillars:

- Protect what God has entrusted
- Grow your capacity to serve
- Transfer values and resources to future generations
- Impact Kingdom and community

Every recommendation should map to Protect, Grow, Transfer, or Impact.

Recommendations should use plain language and be framed as topics worth discussing with your professional team, not as direct legal, tax, or investment advice.

## Dashboard Source Of Truth

Dashboard tabs:

- Overview
- Protect
- Grow
- Transfer
- Impact
- Reports

MVP dashboard includes:

- Stewardship Score
- Stewardship Stage
- Profile Completion %
- Protect / Grow / Transfer / Impact snapshot
- Top 3 priorities
- Next recommended step
- Locked future modules
- CTA to Complete Financial Analysis

The dashboard should progressively reveal the user's stewardship picture. Financial data should come after dashboard creation, through Financial Analysis.

## Brand And Homepage Direction

Brand direction:

- Premium Christian family office feel, but not family-office-only
- Apple-level simplicity
- Mobile first
- Desktop responsive
- Warm white or very light gray/tan background
- Deep navy primary
- Soft gold accent
- Subtle green accent
- Stylized SC monogram placeholder logo
- Avoid shield/cross logo for now
- Avoid overly churchy visuals
- Avoid cluttered fintech dashboard feel

Homepage direction:

- Hero headline: "Steward What Matters Most."
- Subheadline: "Understand, organize, and grow everything God has entrusted to you from your finances and business to your family, legacy, and impact."
- Primary CTA: Start Your Assessment
- Secondary CTA: View Sample Dashboard
- Trust bullets: Takes about 5 minutes; Progress saves automatically
- Key copy: "Clarity brings confidence. Stewardship brings purpose."
- Scripture CTA: "To whom much is given, much is required." Luke 12:48

## Data Architecture Direction

MVP data architecture should plan for:

- profiles
- assessments
- assessment_responses
- scores
- roadmap_items
- dashboard_snapshots
- reports

Future data architecture should plan for:

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

Do not create database migrations until explicitly asked.

## Implementation Guardrails

- Read the relevant docs before implementing.
- Do not build app UI unless requested.
- Do not implement auth unless requested.
- Do not create Supabase migrations unless requested.
- Do not commit unless instructed.
- Prefer simple, premium, mobile-first product surfaces.
- Use plain language, not advisor jargon.
- Avoid direct legal, tax, or investment advice.
- Avoid cluttered dashboard patterns and generic fintech styling.
- Visual fidelity is extremely important. When a mockup exists, match the mockup before introducing alternative layouts or styles.

Primary docs:

- `docs/stewardship-capital-master-plan-v1.md`
- `docs/scoring-framework-v1.md`
- `docs/ux-dashboard-architecture-v1.md`
- `docs/data-architecture-v1.md`
- `docs/brand-homepage-direction-v1.md`
- `docs/build-roadmap-v1.md`
