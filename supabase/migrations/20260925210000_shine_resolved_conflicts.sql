-- The answers to four open questions, and the two renames that carry them.
--
-- Friday and Saturday were sent back with the disagreements settled rather
-- than explained, so the flags that carried them go too. A flag is a question
-- being kept in front of the person who can answer it; once it is answered it
-- is just clutter on the row.
--
-- The cleaning rows are the clearest of these. One was titled late afternoon
-- and timed at eight in the evening; it is called the evening cleaning now.
-- Saturday's, which really is before dinner, is named the same way, so the
-- two days read alike.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  moved integer;
begin

/* ---------------------------------------------------------------- Friday */

/* The title matches the hour now, so the question about it is answered. */
update public.schedule_items
   set title = 'Evening bathroom cleaning (during session)'
 where engagement_id = shine and day_key = 'fri'
   and title = 'Late-afternoon bathroom cleaning';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'fri cleaning title: % rows', moved; end if;

update public.schedule_item_ops o
   set detail = o.detail - 'confirm' - 'notes', updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'fri' and s.title = 'Evening bathroom cleaning (during session)';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'fri cleaning flag: % rows', moved; end if;

/* The coffee bar no longer claims Keta is cleaning bathrooms during it. */
update public.schedule_item_ops o
   set detail = o.detail - 'confirm' - 'notes', updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'fri' and s.title = 'Free time and open coffee bar';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'fri coffee bar: % rows', moved; end if;

/* The evening ends at ten, so the sweep that follows it no longer overlaps. */
update public.schedule_items
   set ends_label = '10:00 pm'
 where engagement_id = shine and day_key = 'fri' and title = 'Fellowship, bonfire and movies';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'fri fellowship end: % rows', moved; end if;

/* -------------------------------------------------------------- Saturday */

update public.schedule_items
   set title = 'Evening bathroom cleaning'
 where engagement_id = shine and day_key = 'sat'
   and title = 'Late-afternoon bathroom cleaning';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'sat cleaning title: % rows', moved; end if;

/* Tito leads the devotional; the owner is confirmed. */
update public.schedule_item_ops o
   set detail = o.detail - 'confirm' - 'notes', updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'sat' and s.title = 'Devotional';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'sat devotional: % rows', moved; end if;

update public.schedule_items
   set ends_label = '10:00 pm'
 where engagement_id = shine and day_key = 'sat' and title = 'Celebration evening';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'sat celebration end: % rows', moved; end if;

/* A duty carries the name of the row it came from, so the two renamed rows
   rename their checkboxes with them. */
update public.tasks t
   set title = s.title
  from public.schedule_items s
 where s.id = t.schedule_item_id and t.engagement_id = shine
   and coalesce((t.duty ->> 'fromMaster')::boolean, false)
   and t.title <> s.title;
get diagnostics moved = row_count;
if moved <> 2 then raise exception 'renamed duties: expected 2, found %', moved; end if;

select count(*) into moved from public.schedule_items where engagement_id = shine;
if moved <> 83 then raise exception 'rows: expected 83, found %', moved; end if;

/* Nothing on Friday or Saturday is left waiting on an answer. */
select count(*) into moved
  from public.schedule_items s join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.engagement_id = shine and s.day_key in ('fri', 'sat') and o.detail ? 'confirm';
if moved <> 0 then raise exception 'flags left on fri or sat: %', moved; end if;

end $migration$;
