-- A title is what a thing is called. Everything else is description.
--
-- Seven ideas arrived from the sheet carrying their whole menu in the title,
-- which was fine on a spreadsheet row and is not fine on a calendar block:
-- dropping one on the weekend produced a scheduled moment reading "Breakfast:
-- egg bake, yogurt parfait, sausage, fruit" at seven in the morning. The
-- concept becomes the title and the menu becomes the description, which is
-- what both already were.
--
-- Only where the source clearly means a title and a detail. A colon is not
-- the test: "SHINE What's Next: Mike" and "Gusii land recap: Mike, Victor,
-- and Keta" name a session and who is leading it, and are left exactly alone.
-- Nothing is lost here; every word moves, none is dropped.

do $$
declare
  eng uuid;
begin
  select e.id into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = 'shine' and e.slug = 'founders-weekend-2026';
  if eng is null then
    raise notice 'SHINE engagement not present, nothing to split';
    return;
  end if;

  create table if not exists archive.shine_20260904_titles as
    select id, title, detail from public.sparks where engagement_id = eng;

  -- Each one guarded on the title it is expected to be holding, so a hand
  -- edit since would leave it untouched rather than overwritten.
  update public.sparks set title = 'Breakfast',
         detail = 'Egg bake, yogurt parfait, sausage, fruit'
   where engagement_id = eng and id = 'f0a894a7-ce20-42be-92d8-dca4e36ab68b'
     and title = 'Breakfast: egg bake, yogurt parfait, sausage, fruit' and detail is null;

  update public.sparks set title = 'Lunch',
         detail = 'Cold sandwiches, chips, salad, vegetables'
   where engagement_id = eng and id = 'ae422bf7-05da-44af-90e2-045084abdd7a'
     and title = 'Lunch: cold sandwiches, chips, salad, vegetables' and detail is null;

  update public.sparks set title = 'Dinner',
         detail = 'Surf and turf, salmon, steak, Brussels sprouts or asparagus, salad'
   where engagement_id = eng and id = 'f776d7cf-ef32-4a56-89b3-7f1fc5cf811a'
     and title = 'Dinner: surf and turf, salmon, steak, Brussels sprouts or asparagus, salad'
     and detail is null;

  update public.sparks set title = 'Breakfast',
         detail = 'Waffle bar or French toast sticks, fruit, bacon'
   where engagement_id = eng and id = '1e109a57-ba80-4437-8011-743c605303b1'
     and title = 'Breakfast: waffle bar or French toast sticks, fruit, bacon' and detail is null;

  update public.sparks set title = 'Lunch', detail = 'Wood fired pizzas'
   where engagement_id = eng and id = 'd3625837-565e-4bc1-8983-d3be61d879bc'
     and title = 'Lunch: wood fired pizzas' and detail is null;

  update public.sparks set title = 'Dinner',
         detail = 'Brisket, potatoes, salad, dessert'
   where engagement_id = eng and id = '4973c3de-f460-441b-a012-270f17d65f33'
     and title = 'Dinner: brisket, potatoes, salad, dessert' and detail is null;

  -- No colon in this one, so the reading is a judgement rather than a split:
  -- it is Sunday's breakfast, described.
  update public.sparks set title = 'Breakfast',
         detail = 'Oatmeal or French toast bake, egg bites, fruit to go'
   where engagement_id = eng and id = '0ff6f554-7e49-487b-8219-226ef38fc527'
     and title = 'Morning oatmeal or French toast bake, egg bites, fruit to go'
     and detail is null;

  -- The moment that was created from the long title, before there was a short
  -- one to use. The description stays on the idea it points at.
  update public.schedule_items set title = 'Breakfast'
   where engagement_id = eng and id = '98992a00-9a21-48ec-8b68-9a14aac8e3ff'
     and title = 'Breakfast: egg bake, yogurt parfait, sausage, fruit';
end $$;
