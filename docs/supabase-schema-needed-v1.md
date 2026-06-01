# Supabase Schema Needed v1

Sprint 2 wires Supabase Auth helpers and protected route behavior, but it does not create database schema.

## Profiles Table

Create this table before enabling profile persistence:

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  profile_type text,
  household_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Recommended next steps when schema work is approved:

- Enable row level security on `public.profiles`.
- Add policies so users can select, insert, and update only their own profile row.
- Add an auth trigger or server action pattern to create one profile row per new user.
- Keep service-role keys server-only and never expose them to the browser.

No migration has been created yet.
