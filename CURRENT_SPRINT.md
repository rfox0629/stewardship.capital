# Current Sprint

Goal:
Complete Sprint 3 by adding the static Assessment MVP engine without creating schema or persisted assessment records.

Success Criteria:
- `/assessment` route exists.
- Assessment is one-question-at-a-time and mobile first.
- Assessment has 25 questions max.
- No dollar amounts, uploads, or account connections are requested.
- Sticky auto-save indicator is visible at the top.
- Progress, Back, Next, and Resume later placeholder UI exist.
- Draft state is local only until real persistence is added.
- Completion navigates to `/dashboard`.
- Lint, typecheck, and build pass.

Reference:
- AGENTS.md
- docs/*
- docs/mockups/homepage-v1.png when available

Do Not Build Yet:
- Supabase schema
- Persisted assessment responses
- Scoring
- PDF reports
- Opportunity engine
- Plaid integrations
- Document uploads

Stop and ask only if:
- Product ambiguity exists
- Security decision required
- Architecture decision required
