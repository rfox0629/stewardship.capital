-- Johnny takes the Saturday bathrooms too.
--
-- The twin of the Friday row that moved earlier. Both days now read the
-- same, and the migration asserts it, so the pair cannot drift apart again.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  bathrooms constant uuid := '182f2cc0-f08a-5465-abf3-a25689e7ab90';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = bathrooms
   and s.engagement_id = shine
   and s.day_key = 'sat'
   and s.title = 'Morning bathroom cleaning (during session)'
   and o.detail ->> 'support' = 'Scott';
if touched <> 1 then
  raise exception 'bathrooms: expected the Saturday 11:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb('Johnny'::text), true),
       updated_at = now()
 where o.schedule_item_id = bathrooms;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'bathrooms: % rows', touched; end if;

/* Both mornings now read the same: Alice leading, Johnny on it. */
select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.engagement_id = shine
   and s.title = 'Morning bathroom cleaning (during session)'
   and s.starts_label = '11:30 am' and s.ends_label = '12:00 pm'
   and o.detail ->> 'owner' = 'Alice'
   and o.detail ->> 'support' = 'Johnny';
if touched <> 2 then
  raise exception 'bathrooms: expected both mornings on Johnny, found %', touched;
end if;

/* Scott is off these rows, not off the weekend. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Scott%';
if touched < 4 then
  raise exception 'roster: Scott is down to % rows, which is not a removal from one', touched;
end if;

end $migration$;
