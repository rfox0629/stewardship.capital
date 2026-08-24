-- Cross client isolation, asserted rather than eyeballed.
--
-- Method matters here. Row level security filters UPDATE and DELETE silently
-- rather than raising, so "no error" is not "refused". Every assertion below
-- measures what actually happened: rows visible, or rows affected.

\set ON_ERROR_STOP on
\set QUIET on
\pset pager off

create temporary table results (name text, expected text, actual text);

create or replace function pg_temp.as_user(uid text, sql text)
returns text language plpgsql as $$
declare out text;
begin
  execute format('set local role authenticated');
  execute format('set local request.jwt.claims = %L', json_build_object('sub', uid)::text);
  execute sql into out;
  execute 'set local role postgres';
  execute 'set local request.jwt.claims = ' || quote_literal('{}');
  return coalesce(out, '(null)');
end $$;

do $$
declare
  ryan  text := '11111111-1111-1111-1111-111111111111';
  megan text := '22222222-2222-2222-2222-222222222222';
  guest text := '33333333-3333-3333-3333-333333333333';
  lena  text := '44444444-4444-4444-4444-444444444444';
  nobody text := '55555555-5555-5555-5555-555555555555';
begin
  insert into results values
    ('staff sees every engagement','2', pg_temp.as_user(ryan,'select count(*)::text from public.engagements')),
    ('client sees only their own engagement','1', pg_temp.as_user(megan,'select count(*)::text from public.engagements')),
    ('other client sees only theirs','1', pg_temp.as_user(lena,'select count(*)::text from public.engagements')),
    ('non member sees no engagement','0', pg_temp.as_user(nobody,'select count(*)::text from public.engagements')),

    ('staff sees sparks in both tenants','2', pg_temp.as_user(ryan,'select count(*)::text from public.sparks')),
    ('client sees only their tenant sparks','1', pg_temp.as_user(megan,'select count(*)::text from public.sparks')),
    ('guest sees no sparks','0', pg_temp.as_user(guest,'select count(*)::text from public.sparks')),
    ('non member sees no sparks','0', pg_temp.as_user(nobody,'select count(*)::text from public.sparks')),

    ('client sees only their tenant budget','1', pg_temp.as_user(megan,'select count(*)::text from public.budget_lines')),
    ('guest sees no budget','0', pg_temp.as_user(guest,'select count(*)::text from public.budget_lines')),

    ('client sees draft and confirmed schedule','2', pg_temp.as_user(megan,'select count(*)::text from public.schedule_items')),
    ('guest sees confirmed schedule only','1', pg_temp.as_user(guest,'select count(*)::text from public.schedule_items')),

    ('planner sees invitations','1', pg_temp.as_user(ryan,'select count(*)::text from public.invitations')),
    ('client cannot read invitations','0', pg_temp.as_user(megan,'select count(*)::text from public.invitations')),
    ('guest cannot read invitations','0', pg_temp.as_user(guest,'select count(*)::text from public.invitations')),
    ('other tenant planner cannot read them','0', pg_temp.as_user(lena,'select count(*)::text from public.invitations')),

    ('client cannot approve a spark','0', pg_temp.as_user(megan,
      'with u as (update public.sparks set status=''approved'' where true returning 1) select count(*)::text from u')),
    ('planner can approve a spark','2', pg_temp.as_user(ryan,
      'with u as (update public.sparks set status=''approved'' where true returning 1) select count(*)::text from u')),
    ('client cannot promote themselves','0', pg_temp.as_user(megan,
      'with u as (update public.workspace_members set role=''planner'' where true returning 1) select count(*)::text from u')),
    ('client cannot write the schedule','0', pg_temp.as_user(megan,
      'with u as (update public.schedule_items set title=''hijacked'' where true returning 1) select count(*)::text from u')),
    ('client cannot write the budget','0', pg_temp.as_user(megan,
      'with u as (update public.budget_lines set planned_cents=1 where true returning 1) select count(*)::text from u')),
    ('run of show is planner only','0', pg_temp.as_user(megan,'select count(*)::text from public.run_of_show_cues')),
    ('anon sees nothing','0', pg_temp.as_user('00000000-0000-0000-0000-000000000000','select count(*)::text from public.engagements'));
end $$;

select
  case when actual = expected then 'PASS' else 'FAIL' end as result,
  name, expected, actual
from results order by (actual = expected), name;

select case when count(*) = 0 then 'ALL ASSERTIONS PASSED'
            else count(*)||' ASSERTION(S) FAILED' end as summary
from results where actual <> expected;
