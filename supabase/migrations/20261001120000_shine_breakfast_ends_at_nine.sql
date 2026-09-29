-- Breakfast runs until 9:00 on the Friday and the Saturday.
--
-- The reverse of 20260930110000, asked for by the planner: 8:00 to 9:00
-- rather than 8:00 to 8:45. Same two places, for the same reason: the row on
-- the working calendar that the team reads, and the line on the guest card
-- that a guest reads, move together or the guides disagree about one meal.
--
-- What does not move: breakfast cleanup and the worship transition stay at
-- 8:45 to 9:00, so on the team's calendar they again begin with a quarter of
-- an hour of breakfast still going, as they did before 20260930110000. Hot
-- tea and coffee at 7:30 and the Sunday grab-and-go were no part of this and
-- are asserted untouched.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  friday constant uuid := '98992a00-9a21-48ec-8b68-9a14aac8e3ff';
  saturday constant uuid := '514d14f4-14ec-423f-acba-e6da7d1df9c3';
  moved jsonb;
  touched integer;
begin

/* ------------------------------------------------- the working calendar */

select count(*) into touched
  from public.schedule_items s
 where s.id in (friday, saturday)
   and s.engagement_id = shine
   and s.title = 'Breakfast'
   and s.starts_label = '8:00 am'
   and s.ends_label = '8:45 am';
if touched <> 2 then
  raise exception 'breakfast: expected both 8:00 to 8:45 rows, matched %', touched;
end if;

update public.schedule_items
   set ends_label = '9:00 am'
 where id in (friday, saturday);
get diagnostics touched = row_count;
if touched <> 2 then raise exception 'breakfast rows: % rows', touched; end if;

/* ---------------------------------------------------- the guest card */

select count(*) into touched
  from public.engagements e, jsonb_array_elements(e.reference -> 'guide' -> 'schedule') line
 where e.id = shine
   and line ->> 'momentId' in (friday::text, saturday::text)
   and line ->> 'starts' = '8:00 am'
   and line ->> 'ends' = '8:45 am';
if touched <> 2 then
  raise exception 'card: expected both 8:00 to 8:45 lines, matched %', touched;
end if;

select jsonb_agg(
         case when line ->> 'momentId' in (friday::text, saturday::text)
              then jsonb_set(line, '{ends}', to_jsonb('9:00 am'::text), true)
              else line end
         order by ordinality)
  into moved
  from public.engagements e,
       jsonb_array_elements(e.reference -> 'guide' -> 'schedule') with ordinality as t(line, ordinality)
 where e.id = shine;

if moved is null or jsonb_array_length(moved) <> (
  select jsonb_array_length(reference -> 'guide' -> 'schedule') from public.engagements where id = shine
) then
  raise exception 'card: the rebuilt schedule is the wrong length';
end if;

update public.engagements
   set reference = jsonb_set(reference, '{guide,schedule}', moved, true)
 where id = shine;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'card: % rows', touched; end if;

/* ------------------------------------------------------------ agreement */

select count(*) into touched
  from public.schedule_items s
 where s.id in (friday, saturday)
   and s.starts_label = '8:00 am' and s.ends_label = '9:00 am';
if touched <> 2 then raise exception 'breakfast: % rows read 8:00 to 9:00', touched; end if;

select count(*) into touched
  from public.engagements e, jsonb_array_elements(e.reference -> 'guide' -> 'schedule') line
 where e.id = shine
   and line ->> 'momentId' in (friday::text, saturday::text)
   and line ->> 'starts' = '8:00 am'
   and line ->> 'ends' = '9:00 am';
if touched <> 2 then raise exception 'card: % lines read 8:00 to 9:00', touched; end if;

/* Nothing else in the morning moved. */
select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine
   and s.title = 'Breakfast cleanup and worship transition'
   and s.starts_label = '8:45 am' and s.ends_label = '9:00 am';
if touched <> 2 then
  raise exception 'cleanup: expected 2 rows at 8:45, found %', touched;
end if;

select count(*) into touched
  from public.schedule_items s
 where s.id in ('e0d0fcd8-bccc-44dc-9558-4c0afa0fd4c8', '9810f429-ce4f-4e16-858d-773c53448c45')
   and s.engagement_id = shine
   and s.title = 'Hot tea and coffee'
   and s.starts_label = '7:30 am' and s.ends_label = '8:00 am';
if touched <> 2 then
  raise exception 'hot drinks: expected 2 rows at 7:30, found %', touched;
end if;

if not exists (
  select 1 from public.schedule_items s
   where s.engagement_id = shine and s.day_key = 'sun'
     and s.title = 'Grab-and-go breakfast'
     and s.starts_label = '7:30 am' and s.ends_label = '8:30 am'
) then
  raise exception 'sunday: the grab-and-go moved';
end if;

end $migration$;
