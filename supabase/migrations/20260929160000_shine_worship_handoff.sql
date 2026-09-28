-- Mike hands off into worship, not Ryan.
--
-- Mike leads the Build the Tent challenge in the quarter hour before it, so
-- Mike is the one holding the room when worship starts.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  worship constant uuid := 'b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9103';
  handoff constant text := 'Mike hands off from the tent illustration and introduces worship.';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = worship
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Worship'
   and o.detail ->> 'notes' = 'Ryan hands off from the tent illustration and introduces worship.';
if touched <> 1 then
  raise exception 'worship: expected the Thursday 7:15 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{notes}', to_jsonb(handoff), true),
       updated_at = now()
 where o.schedule_item_id = worship;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'worship note: % rows', touched; end if;

/* The lead and the team are not what changed. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = worship
     and s.starts_label = '7:15 pm' and s.ends_label = '7:30 pm'
     and o.detail ->> 'owner' = 'JonCarlos'
     and o.detail ->> 'support' = 'Scott audio; Junior AV and coverage'
     and o.detail ->> 'notes' = handoff
) then
  raise exception 'worship: the row did not come back the way it went in';
end if;

/* And the row it hands off from is still Mike's. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.engagement_id = shine
     and s.title = 'Build the Tent challenge'
     and o.detail ->> 'owner' = 'Mike'
) then
  raise exception 'worship: the tent challenge is not led by Mike';
end if;

end $migration$;
