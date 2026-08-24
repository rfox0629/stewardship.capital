#!/usr/bin/env bash
# Verifies the Spark schema directly against the configured database.
#
# Checks structure and grants only. Isolation behaviour is exercised
# separately, because proving it needs test identities in auth.users.
set -euo pipefail

source "$(dirname "${BASH_SOURCE[0]}")/spark-db.sh"

section() { printf "\n== %s\n" "$1"; }

section "Server"
spark_psql -tAc "select '  '||current_database()||' on PostgreSQL '||split_part(version(),' ',2)"

section "Migrations recorded"
spark_psql -A -F'  ' -c "select version, name from supabase_migrations.schema_migrations where version like '20260824%' order by version"

section "Spark tables and row level security"
spark_psql -A -F'  ' -c "
select c.relname as table, c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p where p.tablename = c.relname) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relkind='r'
  and c.relname in ('organizations','engagements','workspace_members','platform_staff',
                    'invitations','sparks','schedule_items','budget_lines','tasks',
                    'resources','run_of_show_cues','decisions')
order by c.relname"

section "Any Spark table missing RLS (must be empty)"
spark_psql -tAc "
select coalesce(string_agg('  '||relname, e'\n'), '  (none)')
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
  and c.relname in ('organizations','engagements','workspace_members','platform_staff',
                    'invitations','sparks','schedule_items','budget_lines','tasks',
                    'resources','run_of_show_cues','decisions')"

section "Security definer helpers (search_path must be pinned empty)"
spark_psql -A -F'  ' -c "
select p.proname, p.prosecdef as security_definer,
       coalesce(array_to_string(p.proconfig,','),'(none)') as config
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('is_platform_staff','engagement_role','is_engagement_member','is_engagement_planner')
order by p.proname"

section "anon table privileges on Spark tables (must be none)"
spark_psql -tAc "
select coalesce(string_agg('  '||table_name||' '||privilege_type, e'\n'),'  (none)')
from information_schema.role_table_grants
where grantee='anon' and table_schema='public'
  and table_name in ('organizations','engagements','workspace_members','platform_staff',
                     'invitations','sparks','schedule_items','budget_lines','tasks',
                     'resources','run_of_show_cues','decisions')"

section "Foreign keys and indexes"
spark_psql -tAc "
select '  '||count(*)||' foreign keys' from pg_constraint c
join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
where n.nspname='public' and c.contype='f'"
spark_psql -tAc "select '  '||count(*)||' indexes' from pg_indexes where schemaname='public'"

section "Seed data"
spark_psql -A -F'  ' -c "
select o.slug, o.name, e.slug, e.name, e.campaign, e.series_slug, e.edition_label,
       e.budget_total_cents, e.guests_expected, e.starts_on, e.ends_on
from public.engagements e join public.organizations o on o.id = e.organization_id
order by o.slug, e.slug"

printf "\n"
