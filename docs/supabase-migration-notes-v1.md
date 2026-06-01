# Supabase Migration Notes v1

Sprint 6 adds the migration file:

`supabase/migrations/20260601000000_create_mvp_stewardship_schema.sql`

## Tables

- `profiles`
- `assessments`
- `assessment_responses`
- `assessment_scores`
- `roadmap_items`
- `dashboard_snapshots`
- `reports`

## Apply

The Supabase CLI was not installed in the local environment when this migration was created.

Apply the migration with one of these paths:

1. Install and link the Supabase CLI, then run the migration from the project root.
2. Copy the SQL file into the Supabase SQL editor for the target project and run it there.

Use the project environment variables from `.env.local` for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not put service role keys in browser-visible environment variables.

## Security Notes

- RLS is enabled on all MVP user-owned tables.
- Authenticated users can select, insert, update, and delete only their own records.
- `profiles.id` references `auth.users(id)`.
- `assessments.user_id` references `profiles(id)`.
- `assessment_responses.assessment_id` references `assessments(id)`.
- Score, roadmap, dashboard, and report records are tied back to the owning user.
- `authenticated` grants are included so the Data API can access the tables while RLS controls rows.
