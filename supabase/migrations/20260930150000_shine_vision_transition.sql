-- The last "Ryan transition" becomes Mike.
--
-- Fourth of four. Thursday's teaching, Friday's word, Friday's impact hour
-- and now Saturday's vision message all hand off through Mike, and the
-- migration asserts none are left, so the set is closed rather than
-- half done.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  vision constant uuid := 'c8d8cc63-b1a4-4ae9-819a-5786a9370f43';
  team constant text := 'Mike transition; Junior AV and coverage';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = vision
   and s.engagement_id = shine
   and s.day_key = 'sat'
   and s.title = 'Sammy big vision message'
   and o.detail ->> 'support' = 'Ryan transition; Junior AV and coverage';
if touched <> 1 then
  raise exception 'vision: expected the Saturday 10:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(team), true),
       updated_at = now()
 where o.schedule_item_id = vision;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'vision team: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = vision
     and s.starts_label = '10:30 am' and s.ends_label = '11:30 am'
     and o.detail ->> 'owner' = 'Sammy'
     and o.detail ->> 'support' = team
     and o.detail ->> 'notes' = 'Move into partner invitation.'
     and o.detail ->> 'materials' = 'Presentation, Scripture, tent and cord visuals'
) then
  raise exception 'vision: the row did not come back the way it went in';
end if;

/* Nothing on the weekend still transitions through Ryan, and four rows
   transition through Mike. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and (o.detail ->> 'support') like 'Ryan transition%';
if touched <> 0 then raise exception 'transitions: % rows still on Ryan', touched; end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and (o.detail ->> 'support') like 'Mike transition%';
if touched <> 4 then raise exception 'transitions: expected 4 on Mike, found %', touched; end if;

end $migration$;
