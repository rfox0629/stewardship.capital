-- Mike announces the Friday break, not Ryan.
--
-- Mike is on the front of that row already, leading the recap with Victor,
-- so the person calling the break is the person holding the microphone. It
-- was the only note on the weekend naming Ryan, so nothing else follows.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  recap constant uuid := 'ecad74c7-cf11-42b1-b171-05aad9563850';
  announced constant text := 'Mike announces break.';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = recap
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Gusii Land recap'
   and o.detail ->> 'notes' = 'Ryan announces break.';
if touched <> 1 then
  raise exception 'recap: expected the Friday 9:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{notes}', to_jsonb(announced), true),
       updated_at = now()
 where o.schedule_item_id = recap;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'recap note: % rows', touched; end if;

/* The lead, the team and the times are not what changed, and Mike is on the
   row he is now announcing from. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = recap
     and s.starts_label = '9:30 am' and s.ends_label = '10:15 am'
     and o.detail ->> 'owner' = 'Mike and Victor'
     and o.detail ->> 'support' = 'Junior AV and coverage'
     and o.detail ->> 'notes' = announced
) then
  raise exception 'recap: the row did not come back the way it went in';
end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and (o.detail ->> 'notes') ilike '%Ryan%';
if touched <> 0 then raise exception 'notes: % still name Ryan', touched; end if;

end $migration$;
