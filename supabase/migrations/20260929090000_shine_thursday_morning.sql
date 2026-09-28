-- The Thursday morning, in its own words.
--
-- Breakfast had its food in What happens, which is the line that says what
-- the half hour is for, not what is on the table. The food moves to a menu,
-- the way every other meal this weekend carries one, and gains the bagels
-- and the eggs. What happens says what happens.
--
-- And the devotional leads with the devotional. Its setup is a Bible; the
-- prayer prompts are not a thing anybody is bringing.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  breakfast constant uuid := '583e5bf6-aee2-5e46-95d2-ec8c7a4d05b5';
  devotional constant uuid := '629c15d8-ae61-5296-b4e3-54d4f7809250';
  card constant jsonb := jsonb_build_object(
    'kind', 'meal',
    'title', 'Breakfast',
    'menu', jsonb_build_array('Yogurt and granola', 'Bagels', 'Eggs'));
  serving constant text := 'Breakfast for the team before the day starts.';
  devotion constant text :=
    'Share a devotional, pray over guests, speakers, worship, and the weekend.';
  touched integer;
begin

/* ------------------------------------------------------------- breakfast */

select count(*) into touched
  from public.schedule_items s
 where s.id = breakfast
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.starts_label = '8:00 am'
   and s.title = 'Breakfast';
if touched <> 1 then
  raise exception 'breakfast: expected the Thursday 8:00 row, matched %', touched;
end if;

update public.schedule_items
   set guest_guide = card
 where id = breakfast;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'breakfast menu: % rows', touched; end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{purpose}', to_jsonb(serving), true),
       updated_at = now()
 where o.schedule_item_id = breakfast;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'breakfast purpose: % rows', touched; end if;

if not exists (
  select 1 from public.schedule_items s
   where s.id = breakfast
     and jsonb_array_length(s.guest_guide -> 'menu') = 3
     and s.guest_guide -> 'menu' ? 'Bagels'
     and s.guest_guide -> 'menu' ? 'Eggs'
     and s.guest_guide -> 'menu' ? 'Yogurt and granola'
     /* Team only, as it was: this is the team's breakfast, not a guest's. */
     and s.audience = 'planner'
) then
  raise exception 'breakfast: the menu did not come back whole';
end if;

/* ------------------------------------------------------------ devotional */

select count(*) into touched
  from public.schedule_items s
 where s.id = devotional
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Team devotional and prayer';
if touched <> 1 then
  raise exception 'devotional: expected the Thursday row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{purpose}', to_jsonb(devotion), true),
                          '{materials}', to_jsonb('Bible'::text), true),
       updated_at = now()
 where o.schedule_item_id = devotional;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'devotional: % rows', touched; end if;

if exists (
  select 1 from public.schedule_item_ops o
   where o.schedule_item_id = devotional and o.detail::text ilike '%prayer prompt%'
) then
  raise exception 'devotional: the prayer prompts are still listed';
end if;

/* Times, lead, team and the checkbox are not what changed. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = devotional
     and s.starts_label = '8:00 am'
     and s.ends_label = '8:30 am'
     and o.detail ->> 'owner' = 'Ryan and Parker'
     and o.detail ->> 'support' = 'Full team'
     and o.detail ->> 'materials' = 'Bible'
     and o.detail ->> 'purpose' = devotion
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'devotional: the row did not come back the way it went in';
end if;

end $migration$;
