-- One Wednesday evening, seven to eight.
--
-- The celebration and the fellowship after it were two half hour rows for
-- the same room, the same people and the same lead, split at 7:30 for no
-- reason anybody reading the guide would act on. They become one hour. The
-- gathering keeps the row, because it is the one with the cake on it, and
-- takes the fellowship's own words and its note with it. Neither row carries
-- a duty, a cue or a resource, so nothing follows the deleted one out.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  gathering constant uuid := 'e2fb2b50-4d78-5a53-b728-865e475ddfa0';
  fellowship constant uuid := 'aaf51f00-fd53-4d15-8bf1-9aab0fcb858b';
  happens constant text := 'We will gather for a celebration. Hangout and have fun!';
  priorities constant text := 'Brooke will discuss Thursday priorities.';
  touched integer;
begin

select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine
   and s.day_key = 'wed'
   and ((s.id = gathering and s.title = 'Team Gathering and Fun'
         and s.starts_label = '7:00 pm' and s.ends_label = '7:30 pm')
     or (s.id = fellowship and s.title = 'Fellowship and Relax'
         and s.starts_label = '7:30 pm' and s.ends_label = '8:00 pm'));
if touched <> 2 then
  raise exception 'evening: expected both half hours, matched %', touched;
end if;

/* Nothing hangs off the row about to go. */
select count(*) into touched from public.tasks where schedule_item_id = fellowship;
if touched <> 0 then raise exception 'evening: the fellowship row has % tasks', touched; end if;
select count(*) into touched from public.run_of_show_cues where schedule_item_id = fellowship;
if touched <> 0 then raise exception 'evening: the fellowship row has % cues', touched; end if;
select count(*) into touched from public.resources where schedule_item_id = fellowship;
if touched <> 0 then raise exception 'evening: the fellowship row has % resources', touched; end if;

update public.schedule_items
   set ends_label = '8:00 pm'
 where id = gathering;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'evening hour: % rows', touched; end if;

update public.schedule_item_ops o
   set detail = jsonb_set(jsonb_set(o.detail, '{purpose}', to_jsonb(happens), true),
                          '{notes}', to_jsonb(priorities), true),
       updated_at = now()
 where o.schedule_item_id = gathering;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'evening detail: % rows', touched; end if;

delete from public.schedule_items where id = fellowship;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'evening: % rows removed', touched; end if;

/* One hour, with everything both rows were carrying. */
if not exists (
  select 1
    from public.schedule_items s
    join public.schedule_item_ops o on o.schedule_item_id = s.id
   where s.id = gathering
     and s.title = 'Team Gathering and Fun'
     and s.starts_label = '7:00 pm'
     and s.ends_label = '8:00 pm'
     and s.status = 'confirmed'
     and o.detail ->> 'purpose' = happens
     and o.detail ->> 'notes' = priorities
     and o.detail ->> 'materials' = 'Keta''s birthday cake and cider'
     and o.detail ->> 'owner' = 'Full Team'
     and o.detail ->> 'support' = 'Full Team'
) then
  raise exception 'evening: the hour did not come back whole';
end if;

select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.day_key = 'wed';
if touched <> 5 then raise exception 'wednesday: expected 5 rows, found %', touched; end if;

end $migration$;
