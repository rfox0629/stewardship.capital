#!/usr/bin/env bash
# Prints a fingerprint of the real SHINE Founders Weekend engagement: a digest
# of ordered content plus a row count across every table an automated suite
# could conceivably touch. Read only.
#
# Both production suites capture this before they start and refuse to pass if
# it changed by the end, which is what makes "tests never mutate real client
# data" a checked property instead of a hope.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/spark-db.sh"

spark_psql -tA <<'SQL'
with eng as (
  select e.id from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026'
)
select md5(string_agg(part, '|' order by part)) || ':' || count(*) from (
  select 'spark:' || title || ':' || status || ':' || coalesce(decision,'') as part
    from public.sparks where engagement_id in (select id from eng)
  union all
  select 'sched:' || title || ':' || status || ':' || day_key || ':' || starts_label
    from public.schedule_items where engagement_id in (select id from eng)
  union all
  select 'budget:' || label || ':' || planned_cents || ':' || committed_cents || ':' || actual_cents
    from public.budget_lines where engagement_id in (select id from eng)
  union all
  select 'task:' || title || ':' || status from public.tasks where engagement_id in (select id from eng)
  union all
  select 'res:' || name || ':' || status from public.resources where engagement_id in (select id from eng)
  union all
  select 'dec:' || question || ':' || status || ':' || coalesce(outcome,'')
    from public.decisions where engagement_id in (select id from eng)
  union all
  select 'cue:' || cue || ':' || at_label from public.run_of_show_cues where engagement_id in (select id from eng)
  union all
  select 'member:' || user_id::text || ':' || role from public.workspace_members where engagement_id in (select id from eng)
  union all
  select 'snote:' || body from public.spark_notes where engagement_id in (select id from eng)
  union all
  select 'eng:' || name || ':' || coalesce(campaign,'') || ':' || budget_total_cents || ':' || guests_expected
    from public.engagements where id in (select id from eng)
) parts;
SQL
