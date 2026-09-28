-- Breakfast starts at eight on the Friday and the Saturday.
--
-- Two places hold that time, and both have to move or the guides disagree
-- with each other: the row on the working calendar, which is what the team
-- reads, and the line on the printed guest card, which is what a guest
-- reads. The card borrows the row's menu but keeps its own clock.
--
-- A welcome side effect: morning readiness runs 7:30 to 8:00 on both days,
-- and used to start inside breakfast. Now it finishes as breakfast begins.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  friday constant uuid := '98992a00-9a21-48ec-8b68-9a14aac8e3ff';
  saturday constant uuid := '514d14f4-14ec-423f-acba-e6da7d1df9c3';
  moved jsonb;
  touched integer;
begin

/* ------------------------------------------------ the working calendar */

select count(*) into touched
  from public.schedule_items s
 where s.id in (friday, saturday)
   and s.engagement_id = shine
   and s.title = 'Breakfast and coffee'
   and s.starts_label = '7:30 am'
   and s.ends_label = '9:00 am';
if touched <> 2 then
  raise exception 'breakfast: expected both 7:30 rows, matched %', touched;
end if;

update public.schedule_items
   set starts_label = '8:00 am'
 where id in (friday, saturday);
get diagnostics touched = row_count;
if touched <> 2 then raise exception 'breakfast rows: % rows', touched; end if;

/* ------------------------------------------------- the printed guest card */

select jsonb_agg(
         case when line ->> 'momentId' in (friday::text, saturday::text)
              then jsonb_set(line, '{starts}', to_jsonb('8:00 am'::text), true)
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

/* ------------------------------------------------------------- agreement */

/* Both readings say eight, on both days, and nothing else moved to 8:00. */
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

/* The Sunday grab-and-go was not part of this and still starts at 7:30. */
if not exists (
  select 1 from public.schedule_items s
   where s.engagement_id = shine and s.day_key = 'sun'
     and s.title = 'Grab-and-go breakfast' and s.starts_label = '7:30 am'
) then
  raise exception 'sunday: the grab-and-go moved';
end if;

/* And the readiness that used to start inside breakfast now ends at it. */
select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine
   and s.title = 'Morning readiness'
   and s.starts_label = '7:30 am' and s.ends_label = '8:00 am';
if touched <> 2 then
  raise exception 'readiness: expected 2 rows before breakfast, found %', touched;
end if;

end $migration$;
