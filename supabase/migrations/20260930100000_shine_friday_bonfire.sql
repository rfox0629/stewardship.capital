-- Brooke leads the Friday bonfire, setup and evening both.
--
-- The setup splits into its two jobs, written the way the rest of the
-- weekend writes a split assignment: Scott on the fire, Ryan and Brooke on
-- the snacks. The evening that follows it keeps the same people together.
--
-- Note for whoever reads this next: the evening's own note still says
-- "Junior captures selected moments", and Junior has never been on that
-- team line. It was not part of what was asked for and is left as it was.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  setup constant uuid := '9bd57c44-9faf-5ebc-aeec-526563bee931';
  evening constant uuid := 'd951b5ec-e0fa-4279-86e7-be1ddc99ef54';
  touched integer;
begin

/* ----------------------------------------------------------- the setup */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = setup
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Bonfire and fellowship setup'
   and o.detail ->> 'owner' = 'Scott'
   and o.detail ->> 'support' = 'Scott and snack team';
if touched <> 1 then
  raise exception 'setup: expected the Friday 8:15 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{owner}', to_jsonb('Brooke'::text), true),
                          '{support}', to_jsonb('Scott bonfire; Ryan and Brooke snacks'::text), true),
       updated_at = now()
 where o.schedule_item_id = setup;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'setup: % rows', touched; end if;

/* The duty task follows its row's lead, because the planner's list reads
   tasks.owner_name rather than the ops line underneath it. */
update public.tasks
   set owner_name = 'Brooke'
 where schedule_item_id = setup and engagement_id = shine;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'setup duty: % rows', touched; end if;

/* --------------------------------------------------------- the evening */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = evening
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Fellowship, bonfire and movies'
   and o.detail ->> 'owner' = 'Scott and Brooke'
   and o.detail ->> 'support' = 'Emma and Ryan';
if touched <> 1 then
  raise exception 'evening: expected the Friday 8:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{owner}', to_jsonb('Brooke'::text), true),
                          '{support}', to_jsonb('Scott, Ryan and Brooke'::text), true),
       updated_at = now()
 where o.schedule_item_id = evening;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'evening: % rows', touched; end if;

/* ------------------------------------------------------------ agreement */

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = setup
     and s.starts_label = '8:15 pm' and s.ends_label = '8:30 pm'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = 'Scott bonfire; Ryan and Brooke snacks'
     and o.detail ->> 'materials' = 'Fire supplies, movies, candy, snacks'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'setup: the row did not come back the way it went in';
end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = evening
     and s.starts_label = '8:30 pm' and s.ends_label = '10:00 pm'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = 'Scott, Ryan and Brooke'
     and o.detail ->> 'materials' = 'Fire and fellowship supplies'
     and o.detail ->> 'notes' = 'Junior captures selected moments; announce Saturday breakfast.'
) then
  raise exception 'evening: the row did not come back the way it went in';
end if;

/* The vague "snack team" is gone from the weekend, and Emma and Scott are
   off these two rows rather than off the weekend. */
if exists (
  select 1 from public.schedule_item_ops o
   where o.engagement_id = shine and (o.detail ->> 'support') ilike '%snack team%'
) then
  raise exception 'setup: a snack team is still assigned somewhere';
end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Emma%';
if touched < 5 then
  raise exception 'roster: Emma is down to % rows, which is not a removal from one', touched;
end if;

end $migration$;
