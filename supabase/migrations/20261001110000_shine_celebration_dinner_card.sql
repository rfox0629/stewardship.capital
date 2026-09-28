-- The celebration dinner card lets the menu speak.
--
-- The last of the six meals a guest can open to still carry a line above
-- its menu. The team keeps its own What happens, in the same words, because
-- that is the row that has to be run.
--
-- Two meal summaries are deliberately left: Thursday's "A warm, informal
-- opening meal" and Sunday's "Grab-and-go while you pack". Both are written
-- to a guest rather than to the kitchen, and the Sunday one says something a
-- menu cannot, which is that this one is taken away. They are counted here
-- so they are a decision rather than an oversight.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  dinner constant uuid := '1b2e2eaa-61e6-464d-9cd3-5193e65af702';
  purpose text;
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
 where s.id = dinner
   and s.engagement_id = shine
   and s.day_key = 'sat'
   and s.guest_guide ->> 'summary' = 'Celebrate God''s faithfulness together over dinner.'
   and s.guest_guide ? 'menu';
if touched <> 1 then
  raise exception 'dinner: expected the Saturday celebration dinner card, matched %', touched;
end if;

select o.detail ->> 'purpose' into purpose
  from public.schedule_item_ops o where o.schedule_item_id = dinner;

update public.schedule_items
   set guest_guide = guest_guide - 'summary'
 where id = dinner;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'dinner: % rows', touched; end if;

if not exists (
  select 1 from public.schedule_items s
   where s.id = dinner
     and not (s.guest_guide ? 'summary')
     and jsonb_array_length(s.guest_guide -> 'menu') = 6
) then
  raise exception 'dinner: the card did not come back the way it went in';
end if;

if (select o.detail ->> 'purpose' from public.schedule_item_ops o where o.schedule_item_id = dinner)
   is distinct from purpose then
  raise exception 'dinner: the team lost its What happens';
end if;

/* Six meal cards with menus and no line above them, and the two that keep
   one on purpose. */
select count(*) into touched
  from public.engagements e
  cross join lateral jsonb_array_elements(e.reference -> 'guide' -> 'schedule') line
  join public.schedule_items s on s.id = (line ->> 'momentId')::uuid
 where e.id = shine and s.guest_guide ? 'menu' and s.guest_guide ? 'summary';
if touched <> 2 then
  raise exception 'card: expected 2 meals keeping a summary, found %', touched;
end if;

end $migration$;
