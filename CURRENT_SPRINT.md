# Current Sprint

Goal:
Complete Sprint 8 by verifying real Supabase persistence for authenticated assessment drafts, assessment completion, and dashboard snapshots.

Success Criteria:
- `.env.local` includes the public Supabase URL and publishable key.
- The MVP migration is applied in the connected Supabase project.
- Signup and login work with a test account.
- Authenticated `/assessment` creates or resumes an in-progress assessment.
- Answers persist to `assessment_responses`.
- Assessment progress updates `percent_complete` and `last_question_index`.
- Completion writes `assessment_scores`, `roadmap_items`, and `dashboard_snapshots`.
- `/dashboard` reads the persisted completed snapshot.
- Logout works and unauthenticated `/dashboard` redirects to `/login`.
- Resume returns users to saved assessment progress.
- Lint, typecheck, and build pass.

Current Status:
- Public Supabase env vars are present.
- Typecheck, lint, and build pass.
- Dev server starts.
- Unauthenticated `/dashboard` redirects to `/login`.
- Auth redirect handling was fixed so expected redirects are not caught as errors.
- Connected Supabase project does not currently show the MVP migration or public MVP tables.
- New signup is currently blocked by Supabase email rate limiting.
- `.env.example` is restored to placeholder values only.

Manual Supabase SQL Editor Step:
1. Open the Supabase dashboard for the connected project.
2. Go to SQL Editor and create a new query.
3. Paste the full contents of `supabase/migrations/20260601000000_create_mvp_stewardship_schema.sql`.
4. Run the query once.
5. Confirm these public tables exist: `profiles`, `assessments`, `assessment_responses`, `assessment_scores`, `roadmap_items`, `dashboard_snapshots`, and `reports`.
6. Rerun Sprint 8 persistence QA after the email rate limit clears or an existing confirmed test account is available.

Reference:
- AGENTS.md
- docs/*
- docs/mockups/homepage-v1.png when available

Do Not Build Yet:
- New product schema beyond the approved MVP migration
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
