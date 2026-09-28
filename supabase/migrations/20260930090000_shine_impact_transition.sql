-- Mike transitions into the Friday impact hour, not Ryan.
--
-- Third of the four rows that read "Ryan transition" to move. One is left,
-- the Saturday big vision message, and it is counted below so it cannot be
-- caught by accident and cannot be forgotten either.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  impact constant uuid := '752801c2-1d94-4ecd-9358-b479f14e3ff5';
  team constant text := 'Mike transition; Junior AV and coverage';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = impact
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Impact with Rev. Canana and videos'
   and o.detail ->> 'support' = 'Ryan transition; Junior AV and coverage';
if touched <> 1 then
  raise exception 'impact: expected the Friday 7:50 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(team), true),
       updated_at = now()
 where o.schedule_item_id = impact;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'impact team: % rows', touched; end if;

if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = impact
     and s.starts_label = '7:50 pm' and s.ends_label = '8:30 pm'
     and o.detail ->> 'owner' = 'Rev. Canana'
     and o.detail ->> 'support' = team
     and o.detail ->> 'notes' = 'Move into fellowship.'
) then
  raise exception 'impact: the row did not come back the way it went in';
end if;

/* One row still reads "Ryan transition": the Saturday vision message. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and (o.detail ->> 'support') like 'Ryan transition%';
if touched <> 1 then
  raise exception 'transitions: expected 1 row still on Ryan, found %', touched;
end if;

end $migration$;
