#!/usr/bin/env bash
# Proves the Spark isolation model against the real database, without ever
# writing to a real client's rows.
#
# REPOSITORY RULE, permanent: SHINE Founders Weekend is real client data.
# Automated tests never mutate it, never seed rows into it, and never rely on
# any production table being empty. Every test row lives inside organizations
# this run creates, is stamped with this run's id, and is removed by id. Real
# client data may be read for verification only, and this suite fingerprints
# the SHINE engagement before it starts and proves the fingerprint unchanged
# after it finishes. If isolation cannot be established, the suite refuses to
# assert anything at all.
#
# Method note, learned the hard way: row level security filters UPDATE and
# DELETE silently rather than raising, so "no error" is not "refused". Every
# assertion measures rows visible or rows affected.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/spark-db.sh"

SUPABASE_URL="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' "$ROOT/.env.local" | cut -d= -f2-)"
SRK="$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$ROOT/.env.local" | cut -d= -f2-)"

# Everything this run creates carries this stamp, and teardown deletes only
# what carries it.
RUN="rlsrun$(date +%s)$RANDOM"
TEST_DOMAIN="$RUN.invalid"

api() { curl -s -H "apikey: $SRK" -H "Authorization: Bearer $SRK" -H "Content-Type: application/json" "$@"; }

make_user() {
  api -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -d "{\"email\":\"$1@$TEST_DOMAIN\",\"email_confirm\":true}" |
    python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))"
}

shine_fingerprint() { "$ROOT/scripts/shine-fingerprint.sh"; }

ALPHA_ORG=""; BETA_ORG=""
FINGERPRINT_BEFORE=""

cleanup() {
  local status=$?
  echo
  echo "Cleaning up..."
  # Only rows this run created: the two organizations by captured id, which
  # cascade to their engagements, memberships, invitations, and content.
  if [ -n "$ALPHA_ORG$BETA_ORG" ]; then
    spark_psql -q -c "delete from public.organizations where id in (
      $( [ -n "$ALPHA_ORG" ] && echo "'$ALPHA_ORG'" || echo "null" ),
      $( [ -n "$BETA_ORG" ] && echo "'$BETA_ORG'" || echo "null" )
    );" >/dev/null 2>&1 || true
  fi
  for id in ${CREATED_IDS:-}; do
    api -X DELETE "$SUPABASE_URL/auth/v1/admin/users/$id" >/dev/null 2>&1 || true
  done
  echo "  removed this run's organizations and identities, by id"

  if [ -n "$FINGERPRINT_BEFORE" ]; then
    local after
    after="$(shine_fingerprint)"
    if [ "$after" = "$FINGERPRINT_BEFORE" ]; then
      echo "  SHINE fingerprint unchanged: $after"
    else
      echo "  SHINE FINGERPRINT CHANGED"
      echo "    before: $FINGERPRINT_BEFORE"
      echo "    after:  $after"
      echo "    Real client data was modified. Investigate before anything else."
      exit 1
    fi
  fi
  exit $status
}
trap cleanup EXIT

echo "Fingerprinting the real SHINE engagement (read only)..."
FINGERPRINT_BEFORE="$(shine_fingerprint)"
[ -n "$FINGERPRINT_BEFORE" ] || { echo "could not fingerprint SHINE"; exit 1; }
echo "  $FINGERPRINT_BEFORE"

echo "Creating test identities for run $RUN..."
STAFF=$(make_user staff); CLIENT=$(make_user client)
GUEST=$(make_user guest);  OTHER=$(make_user other)
OUTSIDER=$(make_user outsider)
CREATED_IDS="$STAFF $CLIENT $GUEST $OTHER $OUTSIDER"
for id in $CREATED_IDS; do [ -n "$id" ] || { echo "user creation failed; refusing to continue"; exit 1; }; done
echo "  five identities created"

echo "Creating this run's own organizations..."
ALPHA_ORG=$(spark_psql -qtA -c "insert into public.organizations (slug, name)
  values ('$RUN-alpha','Isolation Alpha $RUN') returning id;")
BETA_ORG=$(spark_psql -qtA -c "insert into public.organizations (slug, name)
  values ('$RUN-beta','Isolation Beta $RUN') returning id;")
[ -n "$ALPHA_ORG" ] && [ -n "$BETA_ORG" ] || { echo "isolation could not be established; refusing to assert"; exit 1; }

ALPHA_ENG=$(spark_psql -qtA -c "insert into public.engagements (organization_id, slug, name, series_slug, edition_label, status)
  values ('$ALPHA_ORG','$RUN-eng','Alpha Check','${RUN}a','1','planning') returning id;")
BETA_ENG=$(spark_psql -qtA -c "insert into public.engagements (organization_id, slug, name, series_slug, edition_label, status)
  values ('$BETA_ORG','$RUN-eng','Beta Check','${RUN}b','1','planning') returning id;")
[ -n "$ALPHA_ENG" ] && [ -n "$BETA_ENG" ] || { echo "isolation could not be established; refusing to assert"; exit 1; }
echo "  two organizations, two engagements, all stamped $RUN"

echo "Seeding test data inside them..."
spark_psql -q <<SQL
insert into public.platform_staff (user_id) values ('$STAFF');

insert into public.workspace_members (engagement_id, user_id, role) values
  ('$ALPHA_ENG','$STAFF','planner'),
  ('$ALPHA_ENG','$CLIENT','client'),
  ('$ALPHA_ENG','$GUEST','stakeholder'),
  ('$BETA_ENG','$OTHER','planner');

insert into public.sparks (engagement_id, title, category, status) values
  ('$ALPHA_ENG','$RUN spark alpha','Experience','captured'),
  ('$BETA_ENG','$RUN spark beta','Experience','captured');

insert into public.budget_lines (engagement_id, category, label, planned_cents) values
  ('$ALPHA_ENG','Venue and lodging','$RUN line alpha',1000000),
  ('$BETA_ENG','Venue and lodging','$RUN line beta',1000000);

insert into public.schedule_items (engagement_id, day_key, starts_label, title, track, status) values
  ('$ALPHA_ENG','thu','3:00 pm','$RUN confirmed','Hospitality','confirmed'),
  ('$ALPHA_ENG','fri','8:45 am','$RUN draft','Program','draft');

insert into public.run_of_show_cues (engagement_id, schedule_item_id, at_label, cue)
select '$ALPHA_ENG', id, '3:00 pm', '$RUN cue'
from public.schedule_items where engagement_id='$ALPHA_ENG' and status='confirmed';

insert into public.invitations (engagement_id, email, role, token_hash, expires_at)
values ('$ALPHA_ENG','invited@$TEST_DOMAIN','client','$RUN-hash', now() + interval '14 days');
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

-- Every assertion is scoped to this run's engagement ids. Nothing here
-- addresses, or depends on the contents of, any real engagement.
do \$\$
begin
  insert into results values
   ('anonymous sees nothing','0', pg_temp.as_user('00000000-0000-0000-0000-000000000000',
     'select count(*)::text from public.engagements where id in (''$ALPHA_ENG'',''$BETA_ENG'')')),
   ('unauthorized known identity sees nothing','0', pg_temp.as_user('$OUTSIDER',
     'select count(*)::text from public.engagements where id in (''$ALPHA_ENG'',''$BETA_ENG'')')),
   ('staff sees both clients','2', pg_temp.as_user('$STAFF',
     'select count(*)::text from public.engagements where id in (''$ALPHA_ENG'',''$BETA_ENG'')')),
   ('client sees only their engagement','1', pg_temp.as_user('$CLIENT',
     'select count(*)::text from public.engagements where id in (''$ALPHA_ENG'',''$BETA_ENG'')')),
   ('other client sees only theirs','1', pg_temp.as_user('$OTHER',
     'select count(*)::text from public.engagements where id in (''$ALPHA_ENG'',''$BETA_ENG'')')),

   ('client sees only their sparks','1', pg_temp.as_user('$CLIENT',
     'select count(*)::text from public.sparks where engagement_id in (''$ALPHA_ENG'',''$BETA_ENG'')')),
   ('guest sees no sparks','0', pg_temp.as_user('$GUEST',
     'select count(*)::text from public.sparks where engagement_id in (''$ALPHA_ENG'',''$BETA_ENG'')')),
   ('cross client spark read blocked','1', pg_temp.as_user('$OTHER',
     'select count(*)::text from public.sparks where engagement_id in (''$ALPHA_ENG'',''$BETA_ENG'')')),

   ('client sees only their budget','1', pg_temp.as_user('$CLIENT',
     'select count(*)::text from public.budget_lines where engagement_id in (''$ALPHA_ENG'',''$BETA_ENG'')')),
   ('guest sees no budget','0', pg_temp.as_user('$GUEST',
     'select count(*)::text from public.budget_lines where engagement_id in (''$ALPHA_ENG'',''$BETA_ENG'')')),

   ('client sees draft and confirmed schedule','2', pg_temp.as_user('$CLIENT',
     'select count(*)::text from public.schedule_items where engagement_id=''$ALPHA_ENG''')),
   ('guest sees confirmed schedule only','1', pg_temp.as_user('$GUEST',
     'select count(*)::text from public.schedule_items where engagement_id=''$ALPHA_ENG''')),

   ('planner sees invitations','1', pg_temp.as_user('$STAFF',
     'select count(*)::text from public.invitations where engagement_id=''$ALPHA_ENG''')),
   ('client cannot read invitations','0', pg_temp.as_user('$CLIENT',
     'select count(*)::text from public.invitations where engagement_id=''$ALPHA_ENG''')),
   ('other client cannot read invitations','0', pg_temp.as_user('$OTHER',
     'select count(*)::text from public.invitations where engagement_id=''$ALPHA_ENG''')),

   ('client cannot approve a spark','0', pg_temp.as_user('$CLIENT',
     'with u as (update public.sparks set status=''approved'' where engagement_id=''$ALPHA_ENG'' returning 1) select count(*)::text from u')),
   ('client cannot write the schedule','0', pg_temp.as_user('$CLIENT',
     'with u as (update public.schedule_items set title=''$RUN hijack'' where engagement_id=''$ALPHA_ENG'' returning 1) select count(*)::text from u')),
   ('client cannot write the budget','0', pg_temp.as_user('$CLIENT',
     'with u as (update public.budget_lines set planned_cents=1 where engagement_id=''$ALPHA_ENG'' returning 1) select count(*)::text from u')),
   ('client cannot promote themselves','0', pg_temp.as_user('$CLIENT',
     'with u as (update public.workspace_members set role=''planner'' where user_id=''$CLIENT'' and engagement_id=''$ALPHA_ENG'' returning 1) select count(*)::text from u')),
   ('planner can approve a spark','1', pg_temp.as_user('$STAFF',
     'with u as (update public.sparks set status=''approved'' where engagement_id=''$ALPHA_ENG'' returning 1) select count(*)::text from u')),
   ('run of show is planner only','0', pg_temp.as_user('$CLIENT',
     'select count(*)::text from public.run_of_show_cues where engagement_id=''$ALPHA_ENG'''));
end \$\$;

select case when actual=expected then 'PASS' else 'FAIL' end as result, name, expected, actual
from results order by (actual=expected), name;

select case when count(*)=0 then 'ALL PRODUCTION ASSERTIONS PASSED'
            else count(*)||' PRODUCTION ASSERTION(S) FAILED' end as summary
from results where actual<>expected;

do \$\$
begin
  if exists (select 1 from results where actual<>expected) then
    raise exception 'assertions failed';
  end if;
end \$\$;
SQL
