-- The Build the Tent challenge stops asking for a sign.
--
-- Two tents and a timer is the whole kit.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  challenge constant uuid := '74e88a66-bbbf-54d6-9d69-c26d8e48baba';
  kit constant text := 'Two tents, timer';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = challenge
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Build the Tent challenge'
   and o.detail ->> 'materials' = 'Two tents, timer, Expand the Tent sign';
if touched <> 1 then
  raise exception 'challenge: expected the Thursday 7:00 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{materials}', to_jsonb(kit), true),
       updated_at = now()
 where o.schedule_item_id = challenge;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'challenge setup: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = challenge
     and s.starts_label = '7:00 pm' and s.ends_label = '7:15 pm'
     and o.detail ->> 'owner' = 'Mike'
     and o.detail ->> 'support' = 'Mike, Ryan and Brooke'
     and o.detail ->> 'materials' = kit
) then
  raise exception 'challenge: the row did not come back the way it went in';
end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text ilike '%Expand the Tent sign%';
if touched <> 0 then raise exception 'challenge: % rows still ask for the sign', touched; end if;

end $migration$;
