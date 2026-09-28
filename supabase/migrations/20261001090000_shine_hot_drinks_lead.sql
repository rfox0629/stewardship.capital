-- Brooke leads the hot tea and coffee, both mornings.
--
-- The half hour before breakfast had no name on it. It has one now, on the
-- Friday row and the Saturday row together, so the pair cannot drift.
--
-- Still no checkbox on either: the row was created without a duty task and
-- is not asked to grow one here, so it reads on the schedule and stays off
-- the operations list. Say the word and it can have one.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  hot constant uuid[] := array[
    'e0d0fcd8-bccc-44dc-9558-4c0afa0fd4c8',  -- fri
    '9810f429-ce4f-4e16-858d-773c53448c45'   -- sat
  ]::uuid[];
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = any (hot)
   and s.engagement_id = shine
   and s.title = 'Hot tea and coffee'
   and s.starts_label = '7:30 am' and s.ends_label = '8:00 am'
   and not (o.detail ? 'owner');
if touched <> 2 then
  raise exception 'hot drinks: expected both unled rows, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{owner}', to_jsonb('Brooke'::text), true),
       updated_at = now()
 where o.schedule_item_id = any (hot);
get diagnostics touched = row_count;
if touched <> 2 then raise exception 'hot drinks lead: % rows', touched; end if;

/* Both mornings read the same, and the window is not what changed. */
select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = any (hot)
   and s.starts_label = '7:30 am' and s.ends_label = '8:00 am'
   and s.audience = 'everyone'
   and o.detail ->> 'owner' = 'Brooke'
   and o.detail ->> 'purpose' = 'Brewed coffee and hot tea out before breakfast.'
   and not (o.detail ->> 'duty')::boolean;
if touched <> 2 then raise exception 'hot drinks: % rows came back whole', touched; end if;

/* The published coffee bar hours are still the bar's, not the kettle's. */
select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.status = 'confirmed' and s.audience = 'everyone'
   and (s.guest_guide -> 'opens' ? 'coffee' or (s.guest_guide ->> 'kind') = 'coffee');
if touched <> 4 then raise exception 'coffee hours: % windows', touched; end if;

end $migration$;
