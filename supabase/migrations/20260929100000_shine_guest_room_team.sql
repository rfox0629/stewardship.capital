-- Johnny takes Keta's place on the Thursday guest-room setup.
--
-- The team line on a row is also the roster: the name picker on the team
-- guide is read off the leads and teams written here, so adding Johnny to
-- this hour is what puts Johnny in the list of people who can choose their
-- own schedule. Keta stays on every other row she is on.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  guestroom constant uuid := 'c620dd1c-d2f3-59d9-ba21-da70c1c8bbac';
  team constant text := 'Brooke, Emma, Johnny';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = guestroom
   and s.engagement_id = shine
   and s.day_key = 'thu'
   and s.title = 'Guest-room and arrival setup'
   and o.detail ->> 'support' = 'Brooke, Keta, Emma';
if touched <> 1 then
  raise exception 'guest room: expected the Thursday 9:00 row, matched %', touched;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{support}', to_jsonb(team), true),
       updated_at = now()
 where o.schedule_item_id = guestroom;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'guest room team: % rows', touched; end if;

/* The lead, the times and the rest of the row did not move with the team. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = guestroom
     and s.starts_label = '9:00 am'
     and s.ends_label = '10:00 am'
     and o.detail ->> 'owner' = 'Brooke'
     and o.detail ->> 'support' = team
     and o.detail ->> 'materials' = 'Room presents, baskets, check-in supplies'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'guest room: the row did not come back the way it went in';
end if;

/* Keta is off this hour and still on the rest of her weekend. */
if exists (
  select 1 from public.schedule_item_ops o
   where o.schedule_item_id = guestroom and o.detail::text like '%Keta%'
) then
  raise exception 'guest room: Keta is still on this row';
end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and o.detail::text like '%Keta%';
if touched < 5 then
  raise exception 'roster: Keta is down to % rows, which is not a removal from one', touched;
end if;

end $migration$;
