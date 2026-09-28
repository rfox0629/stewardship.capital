-- The call to worship becomes a note, and Mike joins the team that makes it.
--
-- "Clear breakfast, tidy common areas, and give a five-minute call to
-- worship (Mike)" was three jobs and a name in a parenthesis on the line
-- that says what the quarter hour is for. The call moves to the notes, where
-- a person's job belongs, and Mike goes on the team line, where he was only
-- ever implied.
--
-- The Saturday row. Friday has the same row with the same sentence, a
-- different team and a note of its own already; it was not part of what was
-- asked for and is asserted untouched below.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  transition constant uuid := '5e61315c-9fff-5efa-814c-0d76565ac36f';
  team constant text := 'Brooke, Alice, Keta, Emma, Scott and Mike';
  happens constant text := 'Clear breakfast and tidy common areas.';
  call constant text := 'Mike gives a five-minute call to worship.';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = transition
   and s.engagement_id = shine
   and s.day_key = 'sat'
   and s.title = 'Breakfast cleanup and worship transition'
   and o.detail ->> 'support' = 'Brooke, Alice, Keta, Emma and Scott'
   and o.detail ->> 'purpose' =
       'Clear breakfast, tidy common areas, and give a five-minute call to worship (Mike).'
   and not (o.detail ? 'notes');
if touched <> 1 then
  raise exception 'transition: expected the Saturday 8:45 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(
                  jsonb_set(
                    jsonb_set(o.detail, '{support}', to_jsonb(team), true),
                    '{purpose}', to_jsonb(happens), true),
                  '{notes}', to_jsonb(call), true),
       updated_at = now()
 where o.schedule_item_id = transition;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'transition: % rows', touched; end if;

/* The call is out of what happens and into the notes exactly once, and the
   window, the lead and the checkbox are not what changed. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = transition
     and s.starts_label = '8:45 am' and s.ends_label = '9:00 am'
     and o.detail ->> 'owner' = 'Keta'
     and o.detail ->> 'support' = team
     and o.detail ->> 'purpose' = happens
     and o.detail ->> 'notes' = call
     and o.detail ->> 'materials' = 'Cleanup supplies'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'transition: the row did not come back the way it went in';
end if;

if (select o.detail ->> 'purpose' from public.schedule_item_ops o where o.schedule_item_id = transition)
   ilike '%call to worship%' then
  raise exception 'transition: the call is still in what happens';
end if;

/* Friday's row still reads the old way, with its own team and its own note. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.engagement_id = shine and s.day_key = 'fri'
     and s.title = 'Breakfast cleanup and worship transition'
     and o.detail ->> 'support' = 'Alice, Keta, Emma and Scott'
     and o.detail ->> 'purpose' ilike '%call to worship%'
) then
  raise exception 'transition: the Friday row moved';
end if;

end $migration$;
