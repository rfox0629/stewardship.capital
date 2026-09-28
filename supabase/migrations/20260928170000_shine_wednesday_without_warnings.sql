-- Wednesday loses a duplicate arrival, and the weekend loses its warnings.
--
-- Two things, both about what the team should be reading on a phone.
--
-- The early arrival row and the setup huddle both start at 6:00 pm on the
-- Wednesday and both describe the same people walking in. One of them goes.
-- Its duty goes with it: tasks.schedule_item_id is set null on delete, so a
-- row deleted without its task would leave a duty attached to nothing, still
-- counted and still tickable on the Volunteer duties tab.
--
-- The other is the confirm flag. It drew a warning banner inside every row
-- that carried it, which is the wrong place for it: the team guide is what
-- somebody opens to find out what is happening, not a list of what the two
-- source documents disagreed about. Sector Assignment keeps its lead, its
-- team, its times and its checkbox, and loses the sentence saying the
-- calendar named two people. Notes is rendered only when there is a note, so
-- the heading goes with the text.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  arrival constant uuid := 'f18fcb33-6c73-5569-8ebc-15d7811d0f02';
  sector constant uuid := 'b889ba40-20e3-4d37-b43f-656fdc3b1c5f';
  touched integer;
begin

/* The row is addressed by id and checked by name, so a renamed or already
   removed row fails here rather than taking the wrong Wednesday entry. */
select count(*) into touched
  from public.schedule_items
 where id = arrival
   and engagement_id = shine
   and day_key = 'wed'
   and title = 'Early team arrival and property prayer';
if touched <> 1 then
  raise exception 'arrival: expected the 6:00 pm early arrival row, matched %', touched;
end if;

delete from public.tasks where schedule_item_id = arrival;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'arrival duty: % rows', touched; end if;

/* ops cascades; the item is the row the schedule and the duties both read. */
delete from public.schedule_items where id = arrival;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'arrival: % rows', touched; end if;

select count(*) into touched
  from public.schedule_items
 where engagement_id = shine and day_key = 'wed';
if touched <> 6 then raise exception 'wednesday: expected 6 rows, found %', touched; end if;

if not exists (
  select 1 from public.schedule_items
   where engagement_id = shine and day_key = 'wed'
     and title = 'Full setup team arrival and huddle'
) then
  raise exception 'wednesday: the setup huddle is gone';
end if;

/* The flag that drew the banner, and the note it repeated. */
update public.schedule_item_ops o
   set detail = o.detail - 'confirm',
       updated_at = now()
 where o.engagement_id = shine and o.detail ? 'confirm';
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'confirm: expected 1 row, updated %', touched; end if;

update public.schedule_item_ops o
   set detail = o.detail - 'notes',
       updated_at = now()
 where o.schedule_item_id = sector;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'sector notes: % rows', touched; end if;

select count(*) into touched
  from public.schedule_item_ops o
 where o.engagement_id = shine and (o.detail ? 'confirm');
if touched <> 0 then raise exception 'confirm: % rows still flagged', touched; end if;

if exists (
  select 1 from public.schedule_item_ops o
   where o.engagement_id = shine and o.detail::text ilike '%does not settle%'
) then
  raise exception 'sector: the note is still there';
end if;

/* Nothing about who leads what changed. */
if (select o.detail ->> 'owner' from public.schedule_item_ops o where o.schedule_item_id = sector)
   is distinct from 'Mike or Brooke' then
  raise exception 'sector: the lead changed';
end if;

end $migration$;
