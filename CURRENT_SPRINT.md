# Current Sprint

Goal:
Build the Financial Analysis Onboarding MVP as the next progressive onboarding layer after the dashboard.

Sprint 8 Verified Milestone:
- Authenticated assessment creates or resumes an in-progress assessment.
- Answers save to `assessment_responses`.
- `percent_complete` persists.
- `last_question_index` persists.
- Resume later works.
- Completion writes `assessment_scores`.
- Completion writes `roadmap_items`.
- Completion writes `dashboard_snapshots`.
- `/dashboard` reads the persisted completed snapshot.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed.

Sprint 9 Success Criteria:
- `/dashboard/grow` becomes a clear Financial Analysis onboarding page.
- Cards exist for Connect Accounts, Upload Documents, and Enter Manually.
- Connect Accounts is marked Coming Soon.
- Upload Documents is marked Coming Soon.
- Enter Manually is marked Start Here.
- Manual entry placeholder sections exist for Household Snapshot, Income, Assets, Liabilities, Business, Giving, and Professional Team.
- Dashboard Overview links users to `/dashboard/grow`.
- All future functionality remains clearly marked as onboarding or placeholder unless persisted.
- Lint, typecheck, and build pass.

Reference:
- AGENTS.md
- docs/*
- docs/persistence-qa-v1.md
- docs/mockups/homepage-v1.png when available

Do Not Build Yet:
- Plaid integrations
- Account aggregation
- Document uploads
- OCR or document extraction
- PDF generation
- Opportunity engine
- Professional marketplace
- Real financial calculations
- New Supabase tables unless required for the route/page shell

Stop and ask only if:
- Product ambiguity exists
- Security decision required
- Architecture decision required
