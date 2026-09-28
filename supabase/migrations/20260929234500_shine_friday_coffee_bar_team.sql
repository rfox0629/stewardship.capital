-- Ryan runs the Friday coffee bar; Parker and Oakley are on it.
--
-- Parker moves off the lead line and onto the team line, and Oakley joins
-- the weekend here. Brooke comes off this hour.
--
-- Only the Friday bar. Saturday's 4:00 bar has the same lead pair and the
-- same Brooke on it and was not part of what was asked for; it is asserted
-- untouched below.
--
-- This row is one of the two windows the published coffee bar hours are read
-- from, so its times are load bearing on both guides. They are asserted.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  bar constant uuid := 'b541af80-0cb2-478a-b6a3-135c1b140058';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = bar
   and s.engagement_id = shine
   and s.day_key = 'fri'
   and s.title = 'Free time and open coffee bar'
   and o.detail ->> 'owner' = 'Ryan and Parker'
   and o.detail ->> 'support' = 'Brooke';
if touched <> 1 then
  raise exception 'bar: expected the Friday 4:00 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{owner}', to_jsonb('Ryan'::text), true),
                          '{support}', to_jsonb('Parker and Oakley'::text), true),
       updated_at = now()
 where o.schedule_item_id = bar;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'bar team: % rows', touched; end if;

/* The window, and the mark that publishes it as coffee bar hours, are not
   what changed. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = bar
     and s.starts_label = '4:00 pm' and s.ends_label = '5:00 pm'
     and s.audience = 'everyone'
     and s.guest_guide -> 'opens' ? 'coffee'
     and o.detail ->> 'owner' = 'Ryan'
     and o.detail ->> 'support' = 'Parker and Oakley'
     and o.detail ->> 'materials' = 'Espresso and snack supplies'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'bar: the row did not come back the way it went in';
end if;

/* Saturday's bar is untouched. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.engagement_id = shine and s.day_key = 'sat' and s.title = 'Open coffee bar'
     and o.detail ->> 'owner' = 'Ryan and Parker'
     and o.detail ->> 'support' = 'Brooke'
) then
  raise exception 'bar: the Saturday row moved';
end if;

/* Still four published coffee windows, unchanged. */
select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.status = 'confirmed' and s.audience = 'everyone'
   and (s.guest_guide -> 'opens' ? 'coffee' or (s.guest_guide ->> 'kind') = 'coffee');
if touched <> 4 then raise exception 'coffee hours: % windows', touched; end if;

/* Brooke is off this hour, not off the weekend. */
select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Brooke%';
if touched < 10 then
  raise exception 'roster: Brooke is down to % rows, which is not a removal from one', touched;
end if;

end $migration$;
