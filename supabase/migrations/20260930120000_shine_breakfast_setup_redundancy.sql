-- Breakfast stops listing itself twice.
--
-- Every breakfast row carried its food on the Setup line and again, in full,
-- on the menu underneath it: "Egg and sausage bake, toast, fruit, coffee"
-- above a menu that already says egg and sausage bake, english muffin toast,
-- apple butter, fruit, coffee and juice. The shorthand was the only thing on
-- those Setup lines, so the line goes rather than being trimmed, and Setup
-- renders only when there is something on it, so the heading goes with it.
--
-- Breakfast only, which is what was asked for. Every other meal on the
-- weekend has the same duplication: Thursday's appetizers, both lunches and
-- both dinners each restate their menu as a Setup shorthand. They are
-- counted below rather than changed, so whoever reads this next knows the
-- pattern is still there and can decide about it deliberately.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  breakfasts constant uuid[] := array[
    '98992a00-9a21-48ec-8b68-9a14aac8e3ff',  -- fri, Breakfast and coffee
    '514d14f4-14ec-423f-acba-e6da7d1df9c3',  -- sat, Breakfast and coffee
    '1011d13c-09af-46b0-a9ad-2ea4a6252631'   -- sun, Grab-and-go breakfast
  ]::uuid[];
  touched integer;
begin

/* All three are breakfasts, all three carry a menu, and all three have a
   Setup line to lose. */
select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = any (breakfasts)
   and s.engagement_id = shine
   and s.title ilike '%breakfast%'
   and s.guest_guide ? 'menu'
   and o.detail ? 'materials';
if touched <> 3 then
  raise exception 'breakfast: expected 3 rows with a menu and a setup line, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = o.detail - 'materials',
       updated_at = now()
 where o.schedule_item_id = any (breakfasts);
get diagnostics touched = row_count;
if touched <> 3 then raise exception 'breakfast setup: % rows', touched; end if;

/* The line is gone and the menus are untouched. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.schedule_item_id = any (breakfasts) and o.detail ? 'materials';
if touched <> 0 then raise exception 'breakfast: % rows still carry a setup line', touched; end if;

select count(*) into touched
  from public.schedule_items s
 where s.id = any (breakfasts) and jsonb_array_length(s.guest_guide -> 'menu') > 0;
if touched <> 3 then raise exception 'breakfast: % menus survived', touched; end if;

/* And nothing else about those rows moved. */
if not exists (
  select 1 from public.schedule_items s
   where s.id = '98992a00-9a21-48ec-8b68-9a14aac8e3ff'
     and s.starts_label = '8:00 am' and s.ends_label = '8:45 am'
) or not exists (
  select 1 from public.schedule_items s
   where s.id = '514d14f4-14ec-423f-acba-e6da7d1df9c3'
     and s.starts_label = '8:00 am' and s.ends_label = '8:45 am'
) or not exists (
  select 1 from public.schedule_items s
   where s.id = '1011d13c-09af-46b0-a9ad-2ea4a6252631'
     and s.starts_label = '7:30 am' and s.ends_label = '8:30 am'
) then
  raise exception 'breakfast: a window moved';
end if;

/* The five meals that still say it twice. */
select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.engagement_id = shine
   and s.guest_guide ? 'menu'
   and o.detail ? 'materials';
if touched <> 5 then
  raise exception 'meals: expected 5 rows still doubling up, found %', touched;
end if;

end $migration$;
