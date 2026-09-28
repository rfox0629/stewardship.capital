-- The Saturday evening, and the last of the doubled-up menus.
--
-- Three things.
--
-- The 4:00 coffee bar matches the Friday one: Ryan runs it, Parker and Axel
-- are on it. Axel joins the weekend here.
--
-- The celebration preparation loses the "Catering Team" it shared with five
-- other rows and gains Mike by name, with a note saying what he is there to
-- do. What happens still ends with "and invite guests to get ready (Mike)",
-- which was not part of what was asked for and is left exactly as it is; it
-- now says the same thing as the note, and is worth a look.
--
-- And the five meals that still printed their menu twice stop doing it. The
-- Setup line was a shorthand of the menu underneath: "Chicken dinner and
-- pumpkin cheesecake" over a menu that already lists the chicken and the
-- cheesecake. Four of them held nothing but that shorthand, so the line
-- goes. Thursday's also held plates and drinks, which are real setup and
-- are kept; only the food comes off it.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  bar constant uuid := '74fb6d2a-46ae-4dcf-8061-c923dd6b5e32';
  prep constant uuid := 'a2b853ea-44d7-4dbe-a99b-ca1ae8e38e92';
  appetizers constant uuid := 'b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9102';
  food_only constant uuid[] := array[
    '8c658bb2-d05c-4db9-b514-babc9bfdc251',  -- fri, Lunch
    '761ace4d-76eb-41c1-a90c-7687d0783737',  -- fri, Dinner
    'ebb5c598-57ce-4c1e-be22-fd23ddfb5b86',  -- sat, Lunch
    '1b2e2eaa-61e6-464d-9cd3-5193e65af702'   -- sat, Celebration dinner
  ]::uuid[];
  touched integer;
begin

/* ------------------------------------------------------- the coffee bar */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = bar and s.engagement_id = shine and s.day_key = 'sat'
   and s.title = 'Open coffee bar'
   and o.detail ->> 'owner' = 'Ryan and Parker'
   and o.detail ->> 'support' = 'Brooke';
if touched <> 1 then raise exception 'bar: expected the Saturday 4:00 row, matched %', touched; end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{owner}', to_jsonb('Ryan'::text), true),
                          '{support}', to_jsonb('Parker and Axel'::text), true),
       updated_at = now()
 where o.schedule_item_id = bar;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'bar: % rows', touched; end if;

/* It publishes coffee bar hours, so its window and its mark are checked. */
if not exists (
  select 1 from public.schedule_items s join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = bar and s.starts_label = '4:00 pm' and s.ends_label = '5:00 pm'
     and s.guest_guide -> 'opens' ? 'coffee'
     and o.detail ->> 'owner' = 'Ryan' and o.detail ->> 'support' = 'Parker and Axel'
) then
  raise exception 'bar: the row did not come back the way it went in';
end if;

select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.status = 'confirmed' and s.audience = 'everyone'
   and (s.guest_guide -> 'opens' ? 'coffee' or (s.guest_guide ->> 'kind') = 'coffee');
if touched <> 4 then raise exception 'coffee hours: % windows', touched; end if;

/* --------------------------------------------- the celebration prepared */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = prep and s.engagement_id = shine and s.day_key = 'sat'
   and s.title = 'Celebration preparation and personal reset'
   and o.detail ->> 'support' = 'Catering Team; Scott, Keta, Emma, Alice, Ryan'
   and not (o.detail ? 'notes');
if touched <> 1 then raise exception 'prep: expected the Saturday 5:00 row, matched %', touched; end if;

update public.schedule_item_ops o
   set detail = jsonb_set(
                  jsonb_set(o.detail, '{support}',
                            to_jsonb('Scott, Keta, Emma, Alice, Ryan and Mike'::text), true),
                  '{notes}', to_jsonb('Mike to invite guests to get ready.'::text), true),
       updated_at = now()
 where o.schedule_item_id = prep;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'prep: % rows', touched; end if;

if not exists (
  select 1 from public.schedule_items s join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = prep and s.starts_label = '5:00 pm' and s.ends_label = '5:30 pm'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = 'Scott, Keta, Emma, Alice, Ryan and Mike'
     and o.detail ->> 'notes' = 'Mike to invite guests to get ready.'
     and o.detail ->> 'materials' = 'Table settings, fire and glow celebration setup'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'prep: the row did not come back the way it went in';
end if;

if (select o.detail ->> 'support' from public.schedule_item_ops o where o.schedule_item_id = prep)
   ilike '%catering team%' then
  raise exception 'prep: the catering team is still on this row';
end if;

/* --------------------------------------------- the menus, printed once */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = any (food_only) and s.guest_guide ? 'menu' and o.detail ? 'materials';
if touched <> 4 then
  raise exception 'meals: expected 4 rows with a menu and a food-only setup line, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = o.detail - 'materials',
       updated_at = now()
 where o.schedule_item_id = any (food_only);
get diagnostics touched = row_count;
if touched <> 4 then raise exception 'meals: % rows', touched; end if;

/* Thursday keeps what is not food. */
update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{materials}', to_jsonb('Plates and drinks'::text), true),
       updated_at = now()
 where o.schedule_item_id = appetizers
   and o.detail ->> 'materials' = 'Catered food, plates, drinks';
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'appetizers: % rows', touched; end if;

/* No meal on the weekend now restates its own menu as a setup line. */
select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.engagement_id = shine and s.guest_guide ? 'menu' and o.detail ? 'materials';
if touched <> 1 then
  raise exception 'meals: expected only the appetizers to keep a setup line, found %', touched;
end if;

/* And every menu survived untouched. */
select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and jsonb_array_length(s.guest_guide -> 'menu') > 0;
if touched <> 9 then raise exception 'menus: expected 9, found %', touched; end if;

end $migration$;
