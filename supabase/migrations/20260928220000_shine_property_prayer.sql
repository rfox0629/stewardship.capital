-- The property prayer comes back, on the row that actually holds it.
--
-- The Wednesday used to open with a row for the early arrival and the prayer
-- over the property, which duplicated the setup huddle and was removed. The
-- prayer was not a duplicate, and it belongs to the walkthrough: the team
-- prays over the property and then walks it, sector by sector. So the row
-- says both, in its name and in what happens, and the prayer leads.
--
-- The duty task carries the same name, because the planner's own list reads
-- tasks.title rather than the row underneath it.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  sector constant uuid := 'b889ba40-20e3-4d37-b43f-656fdc3b1c5f';
  renamed constant text := 'Property Prayer and Sector Assignments';
  happens constant text :=
    'We will gather to pray together as a team over the property. '
    'Create a sector assignment and complete a walkthrough with the team.';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
 where s.id = sector
   and s.engagement_id = shine
   and s.day_key = 'wed'
   and s.title = 'Sector Assignment';
if touched <> 1 then
  raise exception 'sector: expected the Wednesday sector row, matched %', touched;
end if;

update public.schedule_items
   set title = renamed
 where id = sector;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'sector title: % rows', touched; end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{purpose}', to_jsonb(happens), true),
       updated_at = now()
 where o.schedule_item_id = sector;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'sector purpose: % rows', touched; end if;

/* The checkbox is a task of its own, with its own copy of the name. */
update public.tasks
   set title = renamed
 where schedule_item_id = sector and engagement_id = shine;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'sector duty: % rows', touched; end if;

/* The times, the lead and the team are not what changed. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = sector
     and s.starts_label = '6:30 pm'
     and s.ends_label = '7:00 pm'
     and s.status = 'confirmed'
     and o.detail ->> 'owner' = 'Mike or Brooke'
     and o.detail ->> 'support' = 'As assigned'
     and o.detail ->> 'purpose' = happens
     and (o.detail ->> 'duty')::boolean
) then
  raise exception 'sector: the row did not come back the way it went in';
end if;

/* One row wears the name, and the old one is gone from the weekend. */
select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.title = renamed;
if touched <> 1 then raise exception 'sector: % rows named it', touched; end if;

select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.title = 'Sector Assignment';
if touched <> 0 then raise exception 'sector: % rows still carry the old name', touched; end if;

end $migration$;
