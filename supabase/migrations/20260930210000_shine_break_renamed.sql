-- The Saturday break says what it is: the coffee bar.
--
-- Friday's twin is titled "Coffee break and rope prep" and this one was just
-- "Break and message reset", though it is one of the two morning windows the
-- guides publish coffee bar hours from. The header now names it.
--
-- The guest card still calls it "Break", which is what a guest wants on a
-- printed line, and is not touched.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  brk constant uuid := '1d8a351a-a33e-481c-9f51-3027e5b06364';
  renamed constant text := 'Coffee bar and message reset';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
 where s.id = brk and s.engagement_id = shine and s.day_key = 'sat'
   and s.title = 'Break and message reset';
if touched <> 1 then
  raise exception 'break: expected the Saturday 10:15 row, matched %', touched;
end if;

update public.schedule_items set title = renamed where id = brk;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'break title: % rows', touched; end if;

/* The checkbox carries its own copy of the name. */
update public.tasks set title = renamed
 where schedule_item_id = brk and engagement_id = shine;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'break duty: % rows', touched; end if;

/* The window, the coffee mark and the guest's own word for it are not what
   changed, and the published hours still come from four rows. */
if not exists (
  select 1 from public.schedule_items s
   where s.id = brk
     and s.starts_label = '10:15 am' and s.ends_label = '10:30 am'
     and s.audience = 'everyone'
     and s.guest_guide -> 'opens' ? 'coffee'
     and s.guest_guide ->> 'title' = 'Break'
) then
  raise exception 'break: the row did not come back the way it went in';
end if;

select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.status = 'confirmed' and s.audience = 'everyone'
   and (s.guest_guide -> 'opens' ? 'coffee' or (s.guest_guide ->> 'kind') = 'coffee');
if touched <> 4 then raise exception 'coffee hours: % windows', touched; end if;

end $migration$;
