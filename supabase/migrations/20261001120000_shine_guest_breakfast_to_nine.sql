-- The guest card says breakfast runs to nine. The team's calendar does not.
--
-- These two are allowed to disagree, and here they are meant to. A guest is
-- told the hour the room is theirs: come down at eight, nobody is moving you
-- along, worship is at nine. The team is told the quarter hour that is
-- actually different, because the cleanup and the worship transition start
-- at 8:45 and somebody has to be clearing while the last guests finish.
--
-- So this changes the card only. The calendar rows stay 8:00 to 8:45 and are
-- asserted to, in case a later hand sees the gap and tidies it away: the gap
-- is the point.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  friday constant uuid := '98992a00-9a21-48ec-8b68-9a14aac8e3ff';
  saturday constant uuid := '514d14f4-14ec-423f-acba-e6da7d1df9c3';
  moved jsonb;
  others jsonb;
  touched integer;
begin

select count(*) into touched
  from public.engagements e, jsonb_array_elements(e.reference -> 'guide' -> 'schedule') line
 where e.id = shine
   and line ->> 'momentId' in (friday::text, saturday::text)
   and line ->> 'starts' = '8:00 am' and line ->> 'ends' = '8:45 am';
if touched <> 2 then
  raise exception 'card: expected both breakfast lines at 8:45, matched %', touched;
end if;

/* Every other line, captured before the change so the check afterwards is
   against what was there rather than against what this wrote. */
select jsonb_agg(line order by ordinality) into others
  from public.engagements e,
       jsonb_array_elements(e.reference -> 'guide' -> 'schedule') with ordinality as t(line, ordinality)
 where e.id = shine
   and coalesce(line ->> 'momentId', '') not in (friday::text, saturday::text);

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

/* The guest reads eight to nine. */
select count(*) into touched
  from public.engagements e, jsonb_array_elements(e.reference -> 'guide' -> 'schedule') line
 where e.id = shine
   and line ->> 'momentId' in (friday::text, saturday::text)
   and line ->> 'starts' = '8:00 am' and line ->> 'ends' = '9:00 am';
if touched <> 2 then raise exception 'card: % breakfast lines read 8:00 to 9:00', touched; end if;

/* The team still reads eight to a quarter to, and the cleanup that overlaps
   the last fifteen minutes of a guest's breakfast has not moved either. */
select count(*) into touched
  from public.schedule_items s
 where s.id in (friday, saturday)
   and s.starts_label = '8:00 am' and s.ends_label = '8:45 am';
if touched <> 2 then raise exception 'calendar: % breakfast rows read 8:00 to 8:45', touched; end if;

select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine
   and s.title = 'Breakfast cleanup and worship transition'
   and s.starts_label = '8:45 am' and s.ends_label = '9:00 am';
if touched <> 2 then raise exception 'calendar: % cleanups at 8:45', touched; end if;

/* Nothing else on the card moved. Sunday's packing already ended at nine
   and is expected to still. */
if others is distinct from (
  select jsonb_agg(line order by ordinality)
    from public.engagements e,
         jsonb_array_elements(e.reference -> 'guide' -> 'schedule') with ordinality as t(line, ordinality)
   where e.id = shine
     and coalesce(line ->> 'momentId', '') not in (friday::text, saturday::text)
) then
  raise exception 'card: a line other than breakfast changed';
end if;

end $migration$;
