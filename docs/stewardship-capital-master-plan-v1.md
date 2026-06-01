# Stewardship Capital Master Plan v1

## Project

Stewardship Capital is a Christian first Stewardship Operating System for families, business owners, investors, doctors, dentists, real estate owners, and affluent Christian households.

Core promise:

Understand, organize, and grow everything God has entrusted to you.

## Positioning

A Christian first Stewardship Operating System for families, business owners, investors, doctors, dentists, real estate owners, and affluent Christian households.

The product should feel premium, trusted, and simple. It borrows the clarity and polish of a Christian family office experience, but it should not be positioned as family-office-only.

## Primary Audience

- Christian business owners
- Doctors
- Dentists
- Real estate investors
- Executives
- Retirees
- Affluent Christian families

## Do Not Position As

- Budgeting app
- Financial advisor
- CPA firm
- Wealth management firm
- Generic fintech app
- Family office only

Stewardship Capital can support conversations with professional advisors, but it should not present itself as replacing legal, tax, investment, insurance, or financial planning professionals.

## Product Thesis

Affluent Christian households often have complexity spread across businesses, practices, real estate, accounts, entities, documents, estate plans, tax conversations, professional advisors, family goals, and generosity intentions.

They need a single operating layer that brings clarity, order, purpose, and next steps to the whole stewardship picture.

## Core Product Journey

Landing Page -> Create Account -> 5 to 7 minute assessment -> Dashboard Created -> Explore Dashboard -> Complete Financial Analysis -> Unlock Opportunities -> Generate Professional Reports

## Product Principle

The dashboard is the product.

The PDF is a deliverable generated from dashboard data.

The MVP should not behave like a long questionnaire that ends in a static report. The dashboard should become the living source of truth, and reports should be professional exports from that data.

## Assessment v1

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

The first assessment should feel easy and fast. It should create enough signal to generate a useful dashboard without asking users for sensitive financial details too soon.

## Scores

The platform initially uses three scores:

- Stewardship Score
- Financial Readiness Score
- Legacy Impact Score

Scores should communicate direction and priority, not final financial conclusions.

## Stages

The platform uses five stewardship stages:

- Survive
- Stabilize
- Build
- Multiply
- Legacy

Stage language should be encouraging, clear, and free from shame. The stage should help the user understand where to focus next.

## Four Pillars

The product is organized around four pillars:

- Protect what God has entrusted
- Grow your capacity to serve
- Transfer values and resources to future generations
- Impact Kingdom and community

Every recommendation should map to one of these pillars.

## Dashboard Tabs

- Overview
- Protect
- Grow
- Transfer
- Impact
- Reports

## MVP Dashboard Includes

- Stewardship Score
- Stewardship Stage
- Profile Completion %
- Protect / Grow / Transfer / Impact snapshot
- Top 3 priorities
- Next recommended step
- Locked future modules
- CTA to Complete Financial Analysis

## Financial Analysis Role

Financial Analysis begins after the initial dashboard is created. This preserves a fast first experience while giving the product a clear path to deeper data, opportunity identification, and professional reports.

Financial Analysis may later collect financial numbers, documents, account connections, and detailed planning data, but none of that belongs in Assessment v1.

## Recommendation Rules

Recommendations should:

- Use plain language, not advisor jargon.
- Map to Protect, Grow, Transfer, or Impact.
- Be framed as topics worth discussing with your professional team.
- Avoid direct legal, tax, or investment advice.
- Create momentum toward Financial Analysis when deeper data is needed.

## Product Rules

- Never force users through a giant intake form.
- Use progressive onboarding through the dashboard.
- The first assessment should feel easy and fast.
- No financial numbers in Assessment v1.
- Financial data is unlocked after dashboard creation.
- Auto save should be visible in assessment header.
- Users should never fear losing progress.
- Every recommendation should map to Protect, Grow, Transfer, or Impact.
- Use plain language, not advisor jargon.

## Brand Direction

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

## Build Order

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

## MVP Non-Goals

- Do not build full financial planning software in the diagnostic phase.
- Do not require account connections in Assessment v1.
- Do not request uploads in Assessment v1.
- Do not ask for dollar amounts in Assessment v1.
- Do not implement auth until the auth build step is requested.
- Do not create database migrations until the Supabase schema step is requested.
- Do not position the product as an advisor, CPA, wealth manager, generic fintech app, or family office only.

