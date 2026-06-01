# Current Sprint

Goal:
Complete Sprint 6 by adding the Supabase MVP schema and moving assessment progress from local/mock state to persisted Supabase drafts when available.

Success Criteria:
- MVP Supabase migration exists for profiles, assessments, assessment responses, assessment scores, roadmap items, dashboard snapshots, and reports.
- RLS is enabled and authenticated users can only access their own records.
- `/assessment` creates or resumes an in-progress assessment for authenticated users.
- Assessment answers, percent complete, and last active question persist to Supabase.
- Local draft fallback remains for unauthenticated users or failed Supabase saves.
- Completing the assessment persists scores, roadmap items, and dashboard snapshot.
- `/dashboard` reads the latest persisted completed dashboard snapshot when available.
- Dashboard shows a starter state with assessment CTA when no completed assessment exists.
- Lint, typecheck, and build pass.

Reference:
- AGENTS.md
- docs/*
- docs/mockups/homepage-v1.png when available

Do Not Build Yet:
- PDF reports
- Opportunity engine
- Plaid integrations
- Document uploads
- OCR or document extraction
- Professional marketplace

Stop and ask only if:
- Product ambiguity exists
- Security decision required
- Architecture decision required
