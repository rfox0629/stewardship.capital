-- Mike transitions into the Thursday teaching, not Ryan.
--
-- The row before it is the tent challenge, which is Mike's, and the handoff
-- note on the worship between them already says Mike. This makes the team
-- line agree with both.
--
-- Only this row. Three others also read "Ryan transition", on the Friday
-- morning word, the Friday impact hour and the Saturday vision message, and
-- they were not part of what was asked for. They are listed here so that
-- whoever reads this next knows they exist and can decide about them
-- deliberately rather than discovering them later.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  teaching constant uuid := 'b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9104';
  team constant text := 'Mike transition; Junior coverage';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = teaching
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Teaching and vision'
   and o.detail ->> 'support' = 'Ryan transition; Junior coverage';
if touched <> 1 then
  raise exception 'teaching: expected the Thursday 7:30 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(team), true),
       updated_at = now()
 where o.schedule_item_id = teaching;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'teaching team: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = teaching
     and s.starts_label = '7:30 pm' and s.ends_label = '8:30 pm'
     and o.detail ->> 'owner' = 'Sammy and Suzanne'
     and o.detail ->> 'support' = team
     and o.detail ->> 'materials' = 'Teaching notes, theme Scripture'
) then
  raise exception 'teaching: the row did not come back the way it went in';
end if;

/* The three that were left alone are still there, unchanged and countable,
   so this migration cannot quietly have caught them. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and (o.detail ->> 'support') like 'Ryan transition%';
if touched <> 3 then
  raise exception 'transitions: expected 3 rows still on Ryan, found %', touched;
end if;

end $migration$;
