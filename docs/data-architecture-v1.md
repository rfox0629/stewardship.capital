# Data Architecture v1

## Purpose

This document defines product-level data architecture for Stewardship Capital before database migrations are created.

Do not create database migrations until explicitly requested.

## Data Principles

- Assessment v1 is a fast diagnostic, not financial intake.
- No dollar amounts in Assessment v1.
- No account connections in Assessment v1.
- No uploads in Assessment v1.
- Auto save and resume later are required.
- Financial data is unlocked after dashboard creation.
- The dashboard is the product.
- The PDF is a deliverable generated from dashboard data.
- Recommendations should map to Protect, Grow, Transfer, or Impact.

## MVP Data Model

The MVP should plan for these core tables or entities:

- profiles
- assessments
- assessment_responses
- scores
- roadmap_items
- dashboard_snapshots
- reports

The exact schema can be defined during the Supabase schema build step.

## MVP Entity Notes

### profiles

Stores user and household-level profile context.

Likely fields:

- id
- user_id
- full_name
- email
- profile_type
- household_name
- created_at
- updated_at

Profile types may include:

- Business owner
- Doctor
- Dentist
- Real estate investor
- Executive
- Retiree
- Affluent Christian family

### assessments

Stores assessment instances and resume state.

Assessment v1 requirements:

- Fast diagnostic, not financial intake
- 25 questions max
- No dollar amounts
- No account connections
- No uploads
- Mostly Yes / No / Not Sure and multiple choice
- Auto save shown at top
- Resume later is required

Likely fields:

- id
- profile_id
- version
- status
- started_at
- last_saved_at
- completed_at

### assessment_responses

Stores individual answers.

Likely fields:

- id
- assessment_id
- question_id
- answer_value
- answer_label
- updated_at

Answer values should support Yes, No, Not Sure, and multiple choice.

### scores

Stores calculated score snapshots.

Locked scores:

- Stewardship Score
- Financial Readiness Score
- Legacy Impact Score

Likely fields:

- id
- profile_id
- assessment_id
- stewardship_score
- financial_readiness_score
- legacy_impact_score
- stewardship_stage
- confidence_label
- created_at

Locked stages:

- Survive
- Stabilize
- Build
- Multiply
- Legacy

### roadmap_items

Stores recommended priorities and next steps.

Likely fields:

- id
- profile_id
- pillar
- title
- description
- rank
- status
- source
- created_at
- updated_at

Every roadmap item should map to one pillar:

- Protect
- Grow
- Transfer
- Impact

Recommendations should be framed as topics worth discussing with the user's professional team.

### dashboard_snapshots

Stores the dashboard state at a point in time.

Likely fields:

- id
- profile_id
- assessment_id
- score_id
- profile_completion_percent
- top_priorities
- pillar_snapshot
- next_recommended_step
- locked_modules
- created_at

The snapshot allows the dashboard and reports to use the same data source.

### reports

Stores generated report metadata.

Likely fields:

- id
- profile_id
- dashboard_snapshot_id
- report_type
- status
- generated_at
- file_path_or_url
- version

Reports are deliverables generated from dashboard data.

## Future Data Model

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

## Future Entity Notes

### assets

Future structured records for real estate, investments, cash, business equity, and other owned assets.

### liabilities

Future structured records for debt, mortgages, business liabilities, and other obligations.

### income_sources

Future records for employment income, business income, practice income, rental income, retirement income, and other recurring sources.

### expenses

Future records for major household, business, debt, tax, or lifestyle obligations.

### businesses

Future records for owned businesses, practices, entities, ownership percentages, succession concerns, and planning context.

### estate_documents

Future records for wills, trusts, powers of attorney, beneficiary designations, and related estate documents.

### insurance_policies

Future records for life, disability, liability, property, long-term care, business, and other protection coverage.

### giving_records

Future records for charitable giving, donor-advised funds, foundation activity, church giving, Kingdom initiatives, and community impact.

### account_connections

Future records for connected financial accounts if account aggregation is added.

### document_uploads

Future records for user-uploaded documents after the MVP diagnostic flow.

### redaction_jobs

Future records for document redaction and sensitive-data processing.

### opportunities

Future records for generated opportunities across Protect, Grow, Transfer, and Impact.

### professional_referrals

Future records for connections to professional advisors, CPAs, attorneys, insurance professionals, investment professionals, or other specialists.

## Data Flow

MVP flow:

1. User creates account.
2. Profile is created.
3. User starts Assessment v1.
4. Responses auto save.
5. User can resume later.
6. Assessment is completed.
7. Scores are calculated.
8. Dashboard snapshot is created.
9. Roadmap items are generated.
10. User is prompted to Complete Financial Analysis.
11. Reports are generated later from dashboard and analysis data.

## Security And Trust Direction

Because Stewardship Capital serves affluent Christian households and high-complexity users, data collection should feel restrained and trustworthy.

Do not ask for sensitive financial details until the product has earned trust through the initial dashboard.

