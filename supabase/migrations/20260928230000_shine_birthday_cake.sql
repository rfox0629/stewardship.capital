-- The Wednesday celebration is cake, not dinner.
--
-- Dinner is its own row; this half hour is Keta's birthday, and the setup
-- line should say the two things somebody has to carry in for it.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  gathering constant uuid := 'e2fb2b50-4d78-5a53-b728-865e475ddfa0';
  setup constant text := 'Keta''s birthday cake and cider';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = gathering
   and s.engagement_id = shine
   and s.day_key = 'wed'
   and s.title = 'Team Gathering and Fun'
   and o.detail ->> 'materials' = 'Dinner supplies, cake, cider';
if touched <> 1 then
  raise exception 'gathering: expected the Wednesday celebration row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{materials}', to_jsonb(setup), true),
       updated_at = now()
 where o.schedule_item_id = gathering;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'gathering setup: % rows', touched; end if;

/* The cake and the cider arrived, the dinner supplies left, and nothing
   else about the half hour moved. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = gathering
     and s.starts_label = '7:00 pm'
     and s.ends_label = '7:30 pm'
     and o.detail ->> 'materials' = setup
     and o.detail ->> 'purpose' = 'We will gather for a celebration.'
     and o.detail ->> 'owner' = 'Full Team'
     and o.detail ->> 'support' = 'Full Team'
) then
  raise exception 'gathering: the row did not come back the way it went in';
end if;

if exists (
  select 1 from public.schedule_item_ops o
   where o.schedule_item_id = gathering and o.detail::text ilike '%dinner supplies%'
) then
  raise exception 'gathering: the dinner supplies are still listed';
end if;

end $migration$;
