-- Alice takes Scott's place on the illustration preparation.
--
-- One team line on one Thursday hour. Scott keeps every other row he is on,
-- and the roster the name picker is built from follows along on its own.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  illustration constant uuid := '256343dd-563f-587c-9050-2a0acd94df2e';
  team constant text := 'Alice and Mike';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = illustration
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Illustration preparation'
   and o.detail ->> 'support' = 'Scott and Mike';
if touched <> 1 then
  raise exception 'illustration: expected the Thursday 9:00 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(team), true),
       updated_at = now()
 where o.schedule_item_id = illustration;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'illustration team: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = illustration
     and s.starts_label = '9:00 am'
     and s.ends_label = '10:00 am'
     and o.detail ->> 'owner' = 'Ryan'
     and o.detail ->> 'support' = team
     and o.detail ->> 'materials' = 'Rope, scissors, stakes, Sharpies, two tents, sign'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'illustration: the row did not come back the way it went in';
end if;

if exists (
  select 1 from public.schedule_item_ops o
   where o.schedule_item_id = illustration and o.detail::text like '%Scott%'
) then
  raise exception 'illustration: Scott is still on this row';
end if;

/* Off one hour, not off the weekend. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Scott%';
if touched < 5 then
  raise exception 'roster: Scott is down to % rows, which is not a removal from one', touched;
end if;

end $migration$;
