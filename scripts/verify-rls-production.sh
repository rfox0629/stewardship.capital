#!/usr/bin/env bash
# Proves the Spark isolation model against the real database.
#
# Creates throwaway identities through the Supabase admin API, seeds a second
# client alongside the SHINE seed, asserts what each role can see and change,
# then removes everything it created. The SHINE seed is left untouched.
#
# Method note, learned the hard way: row level security filters UPDATE and
# DELETE silently rather than raising, so "no error" is not "refused". Every
# assertion measures rows visible or rows affected.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/spark-db.sh"

SUPABASE_URL="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ROOT/.env.local" | cut -d= -f2-)"
SRK="$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$ROOT/.env.local" | cut -d= -f2-)"
TEST_DOMAIN="rls-check.invalid"

api() { curl -s -H "apikey: $SRK" -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" "$@"; }

make_user() {
  api -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -d "{\"email\":\"$1@$TEST_DOMAIN\",\"email_confirm\":true}" |
    python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))"
}

cleanup() {
  echo
  echo "Cleaning up..."
  spark_psql -q -c "
    delete from public.engagements e using public.organizations o
      where e.organization_id=o.id and o.slug='rls-check-client';
    delete from public.organizations where slug='rls-check-client';
    delete from public.platform_staff where user_id in (
      select id from auth.users where email like '%@$TEST_DOMAIN');
    delete from public.workspace_members where user_id in (
      select id from auth.users where email like '%@$TEST_DOMAIN');
    delete from public.sparks where title like 'rlscheck%';
    delete from public.budget_lines where label like 'rlscheck%';
    delete from public.schedule_items where title like 'rlscheck%';
    delete from public.invitations where email like '%@$TEST_DOMAIN';
  " >/dev/null 2>&1 || true
  for id in ${CREATED_IDS:-}; do
    api -X DELETE "$SUPABASE_URL/auth/v1/admin/users/$id" >/dev/null 2>&1 || true
  done
  echo "  removed test identities and test client. SHINE seed untouched."
}
trap cleanup EXIT

echo "Creating test identities..."
STAFF=$(make_user staff); CLIENT=$(make_user client)
GUEST=$(make_user guest);  OTHER=$(make_user other)
OUTSIDER=$(make_user outsider)
CREATED_IDS="$STAFF $CLIENT $GUEST $OTHER $OUTSIDER"
for id in $CREATED_IDS; do [ -n "$id" ] || { echo "user creation failed"; exit 1; }; done
echo "  five identities created"

echo "Seeding a second client and test data..."
spark_psql -q <<SQL
insert into public.organizations (slug, name) values ('rls-check-client','RLS Check Client');

insert into public.engagements (organization_id, slug, name, series_slug, edition_label, status)
select id,'check-2027','Check Retreat 2027','check','2027','planning'
from public.organizations where slug='rls-check-client';

insert into public.platform_staff (user_id) values ('$STAFF');

insert into public.workspace_members (engagement_id, user_id, role)
select id,'$STAFF','planner' from public.engagements where slug='founders-weekend-2026';
insert into public.workspace_members (engagement_id, user_id, role)
select id,'$CLIENT','client' from public.engagements where slug='founders-weekend-2026';
insert into public.workspace_members (engagement_id, user_id, role)
select id,'$GUEST','stakeholder' from public.engagements where slug='founders-weekend-2026';
insert into public.workspace_members (engagement_id, user_id, role)
select id,'$OTHER','planner' from public.engagements where slug='check-2027';

insert into public.sparks (engagement_id, title, category, status)
select id,'rlscheck '||slug,'Experience','captured' from public.engagements;

insert into public.budget_lines (engagement_id, category, label, planned_cents)
select id,'Venue and lodging','rlscheck '||slug, 1000000 from public.engagements;

insert into public.schedule_items (engagement_id, day_key, starts_label, title, track, status)
select id,'thu','3:00 pm','rlscheck confirmed','Hospitality','confirmed'
from public.engagements where slug='founders-weekend-2026';
insert into public.schedule_items (engagement_id, day_key, starts_label, title, track, status)
select id,'fri','8:45 am','rlscheck draft','Program','draft'
from public.engagements where slug='founders-weekend-2026';

insert into public.invitations (engagement_id, email, role, token_hash, expires_at)
select id,'invited@$TEST_DOMAIN','client','rlscheck-hash', now() + interval '14 days'
from public.engagements where slug='founders-weekend-2026';
SQL
echo "  seeded"
echo

spark_psql -X -A -F' | ' <<SQL
create temporary table results (name text, expected text, actual text);

create or replace function pg_temp.as_user(uid text, sql text) returns text
language plpgsql as \$\$
declare out text;
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L', json_build_object('sub', uid)::text);
  execute sql into out;
  execute 'set local role postgres';
  execute 'set local request.jwt.claims = ' || quote_literal('{}');
  return coalesce(out,'(null)');
end \$\$;

do \$\$
begin
  insert into results values
   ('anonymous sees nothing','0', pg_temp.as_user('00000000-0000-0000-0000-000000000000','select count(*)::text from public.engagements')),
   ('unauthorized known identity sees nothing','0', pg_temp.as_user('$OUTSIDER','select count(*)::text from public.engagements')),
   ('staff sees both clients','2', pg_temp.as_user('$STAFF','select count(*)::text from public.engagements')),
   ('client sees only their engagement','1', pg_temp.as_user('$CLIENT','select count(*)::text from public.engagements')),
   ('other client sees only theirs','1', pg_temp.as_user('$OTHER','select count(*)::text from public.engagements')),

   ('client sees only their sparks','1', pg_temp.as_user('$CLIENT','select count(*)::text from public.sparks')),
   ('guest sees no sparks','0', pg_temp.as_user('$GUEST','select count(*)::text from public.sparks')),
   ('cross client spark read blocked','1', pg_temp.as_user('$OTHER','select count(*)::text from public.sparks')),

   ('client sees only their budget','1', pg_temp.as_user('$CLIENT','select count(*)::text from public.budget_lines')),
   ('guest sees no budget','0', pg_temp.as_user('$GUEST','select count(*)::text from public.budget_lines')),

   ('client sees draft and confirmed schedule','2', pg_temp.as_user('$CLIENT','select count(*)::text from public.schedule_items')),
   ('guest sees confirmed schedule only','1', pg_temp.as_user('$GUEST','select count(*)::text from public.schedule_items')),

   ('planner sees invitations','1', pg_temp.as_user('$STAFF','select count(*)::text from public.invitations')),
   ('client cannot read invitations','0', pg_temp.as_user('$CLIENT','select count(*)::text from public.invitations')),
   ('other client cannot read invitations','0', pg_temp.as_user('$OTHER','select count(*)::text from public.invitations')),

   ('client cannot approve a spark','0', pg_temp.as_user('$CLIENT',
     'with u as (update public.sparks set status=''approved'' where true returning 1) select count(*)::text from u')),
   ('client cannot write the schedule','0', pg_temp.as_user('$CLIENT',
     'with u as (update public.schedule_items set title=''hijacked'' where true returning 1) select count(*)::text from u')),
   ('client cannot write the budget','0', pg_temp.as_user('$CLIENT',
     'with u as (update public.budget_lines set planned_cents=1 where true returning 1) select count(*)::text from u')),
   ('client cannot promote themselves','0', pg_temp.as_user('$CLIENT',
     'with u as (update public.workspace_members set role=''planner'' where true returning 1) select count(*)::text from u')),
   ('planner can approve a spark','1', pg_temp.as_user('$STAFF',
     'with u as (update public.sparks set status=''approved'' where engagement_id=(select id from public.engagements where slug=''founders-weekend-2026'') returning 1) select count(*)::text from u')),
   ('run of show is planner only','0', pg_temp.as_user('$CLIENT','select count(*)::text from public.run_of_show_cues'));
end \$\$;

select case when actual=expected then 'PASS' else 'FAIL' end as result, name, expected, actual
from results order by (actual=expected), name;

select case when count(*)=0 then 'ALL PRODUCTION ASSERTIONS PASSED'
            else count(*)||' PRODUCTION ASSERTION(S) FAILED' end as summary
from results where actual<>expected;
SQL
