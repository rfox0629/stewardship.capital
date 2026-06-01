# Supabase Schema Needed v1

Sprint 2 wired Supabase Auth helpers and protected route behavior without creating database schema.

Sprint 6 adds the MVP migration:

`supabase/migrations/20260601000000_create_mvp_stewardship_schema.sql`

## MVP Tables

- `profiles`
- `assessments`
- `assessment_responses`
- `assessment_scores`
- `roadmap_items`
- `dashboard_snapshots`
- `reports`

## Apply Notes

The local environment did not have the Supabase CLI installed when the migration was created. See `docs/supabase-migration-notes-v1.md` for apply instructions.

Keep service-role keys server-only and never expose them to the browser.
