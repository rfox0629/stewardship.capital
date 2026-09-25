-- The master calendar as of September 25: nine corrections, no new rows.
--
-- A field by field comparison of the five day sheets against what is live.
-- Friday and Saturday matched exactly. Wednesday gained the people who were
-- missing from four of its rows, Thursday's welcome appetizers moved from the
-- hospitality team to the catering team, and Sunday did the same for its two
-- breakfast rows.
--
-- Sunday's closing walkthrough is the interesting one: it read 9:30 AM to
-- 10:00 PM, which this schedule has carried as an open question since the
-- first import. The new sheet says 9:30 to 10:00 AM, so the question is
-- answered and the flag that carried it goes with the answer.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  moved integer;
begin

/* ------------------------------------------------------------- Wednesday */

/* The room walk is Sammy and Suzanne's, with Mike. */
update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('support', 'Sammy, Suzanne and Mike'),
       updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'wed' and s.title = 'Room assignments and setup';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'wed rooms: % rows', moved; end if;

/* The sector walkthrough has a team now, even if it is not named yet. The
   lead is still two people with an "or" between them, so that stays flagged. */
update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('support', 'As assigned'), updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'wed' and s.title = 'Sector Assignment';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'wed sector: % rows', moved; end if;

/* Both evening blocks are the whole team, which the sheet now says outright. */
update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('owner', 'Full Team', 'support', 'Full Team'),
       updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'wed' and s.title in ('Team Gathering and Fun', 'Fellowship and Relax');
get diagnostics moved = row_count;
if moved <> 2 then raise exception 'wed evening: % rows', moved; end if;

update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('purpose', 'Hangout and have fun!'), updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'wed' and s.title = 'Fellowship and Relax';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'wed fellowship: % rows', moved; end if;

/* The sheet's own wording for the lighting check. */
update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object(
         'purpose', 'Will determine appropriate light settings for night time.'),
       updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'wed' and s.title = 'Lights';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'wed lights: % rows', moved; end if;

/* -------------------------------------------------- Thursday and Sunday */

update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('support', 'Catering Team'), updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'thu' and s.title = 'Welcome appetizers and dessert';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'thu appetizers: % rows', moved; end if;

update public.schedule_item_ops o
   set detail = o.detail || jsonb_build_object('support', 'Catering team'), updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'sun'
   and s.title in ('Departure morning readiness', 'Grab-and-go breakfast');
get diagnostics moved = row_count;
if moved <> 2 then raise exception 'sun breakfast: % rows', moved; end if;

/* The walkthrough ends in the morning, as everything around it does. */
update public.schedule_items
   set ends_label = '10:00 am'
 where engagement_id = shine and day_key = 'sun'
   and title = 'Final property walkthrough and team departure';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'sun walkthrough time: % rows', moved; end if;

update public.schedule_item_ops o
   set detail = o.detail - 'confirm' - 'notes', updated_at = now()
  from public.schedule_items s
 where s.id = o.schedule_item_id and s.engagement_id = shine
   and s.day_key = 'sun' and s.title = 'Final property walkthrough and team departure';
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'sun walkthrough flag: % rows', moved; end if;

/* Nothing was added or removed. */
select count(*) into moved from public.schedule_items where engagement_id = shine;
if moved <> 83 then raise exception 'rows: expected 83, found %', moved; end if;

end $migration$;
