-- The prayer walk explanation moves to the free time it explains.
--
-- It was on the Saturday lunch, twice: once in what happens and once in the
-- notes. It belongs on the hours it is about, so it moves whole to the free
-- time row, and Mike goes on that row's team line, where he had only been
-- named in a sentence.
--
-- Lunch keeps what lunch is: serve it, let people talk, and Sammy still
-- decides who blesses the meal.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  lunch constant uuid := 'ebb5c598-57ce-4c1e-be22-fd23ddfb5b86';
  freetime constant uuid := '56aa5c99-767d-4281-988c-8be40de8e17e';
  walk constant text := 'Mike explains the prayer walk.';
  touched integer;
begin

/* ------------------------------------------------------------- the lunch */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = lunch
   and s.engagement_id = shine
   and s.day_key = 'sat'
   and s.title = 'Lunch'
   and o.detail ->> 'purpose' =
       'Serve lunch and allow conversation after the response. Mike explains the prayer walk.'
   and o.detail ->> 'notes' =
       'Explain prayer walk and free time. Sammy to determine who will bless the meal.';
if touched <> 1 then
  raise exception 'lunch: expected the Saturday noon row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(
                  jsonb_set(o.detail, '{purpose}',
                            to_jsonb('Serve lunch and allow conversation after the response.'::text), true),
                  '{notes}', to_jsonb('Sammy to determine who will bless the meal.'::text), true),
       updated_at = now()
 where o.schedule_item_id = lunch;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'lunch: % rows', touched; end if;

/* --------------------------------------------------------- the free time */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = freetime
   and s.engagement_id = shine
   and s.day_key = 'sat'
   and s.title = 'Free time'
   and o.detail ->> 'support' = 'As needed'
   and not (o.detail ? 'notes');
if touched <> 1 then
  raise exception 'free time: expected the Saturday 1:00 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{support}', to_jsonb('Mike'::text), true),
                          '{notes}', to_jsonb(walk), true),
       updated_at = now()
 where o.schedule_item_id = freetime;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'free time: % rows', touched; end if;

/* ------------------------------------------------------------- it moved */

/* Gone from the lunch. Two rows still speak of it and both should: the free
   time it is explained in, and the prayer walk itself, which is its own row
   at one o'clock and is not touched here. */
if (select o.detail::text from public.schedule_item_ops o where o.schedule_item_id = lunch)
   ilike '%prayer walk%' then
  raise exception 'lunch: the prayer walk is still on this row';
end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text ilike '%prayer walk%';
if touched <> 2 then raise exception 'prayer walk: % rows mention it', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.engagement_id = shine and s.day_key = 'sat' and s.title = 'Prayer walk'
     and s.starts_label = '1:00 pm'
     and o.detail ->> 'owner' = 'Scott'
) then
  raise exception 'prayer walk: its own row moved';
end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = freetime
     and s.starts_label = '1:00 pm' and s.ends_label = '4:00 pm'
     and o.detail ->> 'owner' = 'Brooke and Ryan'
     and o.detail ->> 'support' = 'Mike'
     and o.detail ->> 'notes' = walk
) then
  raise exception 'free time: the row did not come back the way it went in';
end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = lunch
     and s.starts_label = '12:00 pm' and s.ends_label = '1:00 pm'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'notes' = 'Sammy to determine who will bless the meal.'
     and jsonb_array_length(s.guest_guide -> 'menu') = 4
) then
  raise exception 'lunch: the row did not come back the way it went in';
end if;

/* Friday's pair, which says free-time options rather than a prayer walk,
   was no part of this. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.engagement_id = shine and s.day_key = 'fri' and s.title = 'Free time'
     and o.detail ->> 'support' = 'As needed'
) then
  raise exception 'free time: the Friday row moved';
end if;

end $migration$;
