-- Pudding is not a starter, the brisket is not a paragraph, and breakfast
-- opens at half past seven.
--
-- Three corrections a guest reads. The Thursday appetizers keep the savoury
-- things and hand the brownies to a Dessert heading of their own. The Friday
-- brisket and its potatoes are named rather than described: a menu says what
-- is being served, and how it is carved is the kitchen's business.
--
-- And breakfast. The guest card says half past seven to nine on both
-- mornings, while the calendar underneath said eight to a quarter to nine.
-- The card is right, so the calendar moves to it and the two readings agree.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  moved integer;
begin

/* ------------------------------------------- Thursday: appetizers, then pudding */

update public.schedule_items s
   set guest_guide = jsonb_set(
         jsonb_set(s.guest_guide, '{menu}', (
           select jsonb_agg(item order by ordinality)
             from jsonb_array_elements_text(s.guest_guide -> 'menu') with ordinality as t(item, ordinality)
            where item <> 'Brownies'
         )),
         '{dessert}', jsonb_build_array('Brownies'), true)
 where s.engagement_id = shine and s.day_key = 'thu'
   and s.title = 'Welcome appetizers and dessert';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'thu appetizers: % rows', moved; end if;

/* ------------------------------------------------- Friday: the brisket dinner */

update public.schedule_items s
   set guest_guide = jsonb_set(s.guest_guide, '{menu}', (
         select jsonb_agg(
                  case
                    when item like 'Signature smoked brisket%' then 'Signature Smoked Brisket'
                    when item like 'Baked potato%' then 'Garlic baby red potatoes'
                    else item
                  end
                  order by ordinality)
           from jsonb_array_elements_text(s.guest_guide -> 'menu') with ordinality as t(item, ordinality)
       ))
 where s.engagement_id = shine and s.day_key = 'fri' and s.title = 'Dinner';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'fri dinner: % rows', moved; end if;

/* ------------------------------------------------------- breakfast, both days */

update public.schedule_items
   set starts_label = '7:30 am', ends_label = '9:00 am'
 where engagement_id = shine and day_key in ('fri', 'sat')
   and title = 'Breakfast and coffee';
get diagnostics moved = row_count;
if moved <> 2 then raise exception 'breakfast: % rows', moved; end if;

/* ----------------------------------------------------------------- checks */

select count(*) into moved
  from public.schedule_items s, jsonb_array_elements_text(s.guest_guide -> 'menu') item
 where s.engagement_id = shine
   and (item like '%carved by our staff%' or item like 'Baked potato%'
        or (s.day_key = 'thu' and s.title = 'Welcome appetizers and dessert' and item = 'Brownies'));
if moved <> 0 then raise exception 'menus: % items were left as they were', moved; end if;

select count(*) into moved
  from public.schedule_items s
 where s.engagement_id = shine and s.day_key = 'fri' and s.title = 'Dinner'
   and s.guest_guide -> 'menu' @> '["Signature Smoked Brisket", "Garlic baby red potatoes"]'::jsonb
   and jsonb_array_length(s.guest_guide -> 'menu') = 6;
if moved <> 1 then raise exception 'fri dinner: the named items are not both there'; end if;

select count(*) into moved from public.schedule_items
 where engagement_id = shine and title = 'Breakfast and coffee'
   and starts_label = '7:30 am' and ends_label = '9:00 am';
if moved <> 2 then raise exception 'breakfast: % rows at the new time', moved; end if;

end $migration$;
