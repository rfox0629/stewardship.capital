-- The guest card stops telling guests to serve the meal.
--
-- "Serve breakfast and provide relaxed connection time" is an instruction to
-- the catering team, and it was sitting under the word Breakfast on a
-- guest's phone. Same for "Serve lunch and encourage table conversation" and
-- "Serve brisket dinner and dessert". A guest opening a meal wants the menu,
-- which is right underneath, so the line goes rather than being reworded
-- into something a card does not need.
--
-- Only the guest copy. Each of these rows keeps its own What happens on the
-- team side, in exactly those words, because that is who the instruction was
-- written for. The migration asserts that.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  meals constant uuid[] := array[
    '98992a00-9a21-48ec-8b68-9a14aac8e3ff',  -- fri Breakfast
    '8c658bb2-d05c-4db9-b514-babc9bfdc251',  -- fri Lunch
    '761ace4d-76eb-41c1-a90c-7687d0783737',  -- fri Dinner
    '514d14f4-14ec-423f-acba-e6da7d1df9c3',  -- sat Breakfast
    'ebb5c598-57ce-4c1e-be22-fd23ddfb5b86'   -- sat Lunch
  ]::uuid[];
  kept text[];
  touched integer;
begin

/* All five are meals a guest can open, all five carry a menu, and all five
   open with a line written for the people serving it. */
select count(*) into touched
  from public.schedule_items s
 where s.id = any (meals)
   and s.engagement_id = shine
   and s.audience = 'everyone'
   and s.guest_guide ? 'menu'
   and (s.guest_guide ->> 'summary') ~* '^(serve|celebrate god)';
if touched <> 5 then
  raise exception 'meals: expected 5 guest summaries in the serving voice, matched %', touched;
end if;

/* What the team is left holding, captured before the guest copy changes so
   the check afterwards cannot be fooled by the update itself. */
select array_agg(o.detail ->> 'purpose' order by s.id) into kept
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = any (meals);
if array_length(kept, 1) <> 5 or array_position(kept, null) is not null then
  raise exception 'meals: a row has no What happens of its own to keep';
end if;

update public.schedule_items
   set guest_guide = guest_guide - 'summary'
 where id = any (meals);
get diagnostics touched = row_count;
if touched <> 5 then raise exception 'meals: % rows', touched; end if;

/* Gone from the card. */
select count(*) into touched
  from public.schedule_items s
 where s.id = any (meals) and s.guest_guide ? 'summary';
if touched <> 0 then raise exception 'meals: % guest summaries survived', touched; end if;

/* Every menu is untouched, which is the whole point of still tapping them. */
select count(*) into touched
  from public.schedule_items s
 where s.id = any (meals) and jsonb_array_length(s.guest_guide -> 'menu') > 0;
if touched <> 5 then raise exception 'meals: % menus survived', touched; end if;

/* And the team still reads exactly what it read before. */
if kept is distinct from (
  select array_agg(o.detail ->> 'purpose' order by s.id)
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = any (meals)
) then
  raise exception 'meals: the team lost its What happens';
end if;

/* No guest line anywhere on the card now opens in the serving voice. */
select count(*) into touched
  from public.engagements e
  cross join lateral jsonb_array_elements(e.reference -> 'guide' -> 'schedule') line
  join public.schedule_items s on s.id = (line ->> 'momentId')::uuid
 where e.id = shine and (s.guest_guide ->> 'summary') ~* '^serve ';
if touched <> 0 then raise exception 'card: % lines still tell a guest to serve', touched; end if;

end $migration$;
