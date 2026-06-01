# Persistence QA v1

## Purpose

This document records the verified Sprint 8 persistence milestone for Stewardship Capital.

## Verification Date

June 1, 2026

## Scope Verified

Sprint 8 verified the authenticated assessment persistence path from draft creation through dashboard snapshot readback.

Verified:

- Authenticated assessment creates or resumes an `in_progress` assessment.
- Answers save to `assessment_responses`.
- `percent_complete` persists.
- `last_question_index` persists.
- Resume later works and returns to the correct question.
- Completion writes `assessment_scores`.
- Completion writes `roadmap_items`.
- Completion writes `dashboard_snapshots`.
- Dashboard reads the persisted completed snapshot.

## Tables Verified

- `profiles`
- `assessments`
- `assessment_responses`
- `assessment_scores`
- `roadmap_items`
- `dashboard_snapshots`
- `reports`

RLS was enabled on the MVP tables during schema readiness checks.

## QA Result

The authenticated persistence flow passed using an existing confirmed test account. No credentials are stored in this document.

Observed verification results:

- Draft assessment mode: `supabase`
- Assessment status after draft creation: `in_progress`
- Draft response count after partial save: 4
- Draft `percent_complete`: 20
- Draft `last_question_index`: 4
- Resume `currentIndex`: 4
- Resume answer count: 4
- Completed response count: 20
- `assessment_scores` rows for completed assessment: 1
- `roadmap_items` rows for completed assessment: 3
- `dashboard_snapshots` rows for completed assessment: 1
- Completed `percent_complete`: 100
- Completed `last_question_index`: 19
- Dashboard rendered persisted snapshot and did not show the empty state.

## Verification Commands

These passed after the persistence QA run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Notes

- New signup was previously blocked by Supabase Auth email rate limiting, so final persistence QA used an existing confirmed account.
- No product features were added during the verification step.
- No code fixes were required during the verified persistence run.
