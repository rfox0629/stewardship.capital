-- It is a glow walk. The run comes off.
--
-- Three places said "walk or run" or "walk and run" about the same Saturday
-- evening: the cleanup row's note, the celebration's own what happens, and
-- the line a guest reads on the celebration card. All three now say walk,
-- because a weekend that offers a run in one place and not another has a
-- guest asking which it is.
--
-- The cleanup team also changes: Ryan and Brooke come off, Johnny goes on.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  cleanup constant uuid := '106db345-660d-4c20-addc-0596569499d0';
  evening constant uuid := 'eb513b79-1a91-4c48-9663-c890ce38c3a0';
  team constant text := 'Alice, Keta, Emma, Scott and Johnny';
  touched integer;
begin

/* ------------------------------------------------------------- cleanup */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = cleanup and s.engagement_id = shine and s.day_key = 'sat'
   and s.title = 'Dinner cleanup and celebration setup'
   and o.detail ->> 'support' = 'Alice, Keta, Emma, Scott, Ryan and Brooke'
   and o.detail ->> 'notes' = 'Glow walk and run.';
if touched <> 1 then raise exception 'cleanup: expected the Saturday 6:30 row, matched %', touched; end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{support}', to_jsonb(team), true),
                          '{notes}', to_jsonb('Glow walk.'::text), true),
       updated_at = now()
 where o.schedule_item_id = cleanup;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'cleanup: % rows', touched; end if;

/* ------------------------------------------------------------- evening */

select count(*) into touched
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.id = evening and s.engagement_id = shine and s.day_key = 'sat'
   and s.title = 'Celebration evening'
   and o.detail ->> 'purpose' = 'Bonfires, games, music, desserts, and optional glow walk or run.'
   and s.guest_guide ->> 'tbc' = 'An optional glow walk or run is still to be confirmed.';
if touched <> 1 then raise exception 'evening: expected the Saturday 7:00 row, matched %', touched; end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{purpose}',
                          to_jsonb('Bonfires, games, music, desserts, and an optional glow walk.'::text), true),
       updated_at = now()
 where o.schedule_item_id = evening;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'evening purpose: % rows', touched; end if;

/* The guest's own line, which is the one that would have been read on a
   phone by somebody deciding whether to bring running shoes. */
update public.schedule_items
   set guest_guide = jsonb_set(guest_guide, '{tbc}',
                               to_jsonb('An optional glow walk is still to be confirmed.'::text), true)
 where id = evening;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'evening card: % rows', touched; end if;

/* ------------------------------------------------------------ agreement */

/* Nothing on the weekend offers a run any more, and three places still
   speak of the walk. */
select count(*) into touched
  from public.schedule_items s
  left join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.engagement_id = shine
   and (coalesce(o.detail::text, '') ~* 'glow walk (or|and) run'
     or coalesce(s.guest_guide::text, '') ~* 'glow walk (or|and) run');
if touched <> 0 then raise exception 'glow: % rows still offer a run', touched; end if;

select count(*) into touched
  from public.schedule_items s
  left join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.engagement_id = shine
   and (coalesce(o.detail::text, '') ilike '%glow walk%'
     or coalesce(s.guest_guide::text, '') ilike '%glow walk%');
if touched <> 2 then raise exception 'glow: % rows speak of the walk', touched; end if;

if not exists (
  select 1 from public.schedule_items s join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = cleanup and s.starts_label = '6:30 pm' and s.ends_label = '7:00 pm'
     and o.detail ->> 'owner' = 'Keta and Scott'
     and o.detail ->> 'support' = team
     and o.detail ->> 'materials' = 'Cleanup, fire, dessert, game and glow supplies'
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'cleanup: the row did not come back the way it went in';
end if;

if not exists (
  select 1 from public.schedule_items s join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = evening and s.starts_label = '7:00 pm' and s.ends_label = '10:00 pm'
     and o.detail ->> 'owner' = 'Brooke and Ryan'
     and o.detail ->> 'support' = 'Scott, Keta, Emma, Alice; Junior coverage'
     and s.guest_guide ->> 'tbc' = 'An optional glow walk is still to be confirmed.'
) then
  raise exception 'evening: the row did not come back the way it went in';
end if;

/* Ryan and Brooke are off the cleanup, not off the weekend; they still lead
   the celebration that follows it. */
if not exists (
  select 1 from public.schedule_item_ops o
   where o.schedule_item_id = evening and o.detail ->> 'owner' = 'Brooke and Ryan'
) then
  raise exception 'evening: the lead moved';
end if;

end $migration$;
