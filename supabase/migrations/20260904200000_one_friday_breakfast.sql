-- Friday had breakfast twice.
--
-- The sheet gave a morning with no clock time, "Breakfast and coffee". Then a
-- planner dropped the Breakfast idea onto seven and gave it an hour, which is
-- the same meal decided properly. Two rows for one thing on one morning.
--
-- The timed one wins because it is the newer decision and because it is the
-- one the idea points at, carrying the menu. The older row is not deleted
-- blind: it is checked for anything hanging off it first, and what it knows
-- that the survivor does not is carried across.

do $$
declare
  eng uuid;
  canonical uuid := '98992a00-9a21-48ec-8b68-9a14aac8e3ff';
  superseded uuid := '7caeb3da-dd4e-47b4-a84c-fdfe8d5bf54c';
  attached integer;
begin
  select e.id into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = 'shine' and e.slug = 'founders-weekend-2026';
  if eng is null then
    raise notice 'SHINE engagement not present, nothing to merge';
    return;
  end if;

  if not exists (select 1 from public.schedule_items
                  where id = superseded and engagement_id = eng
                    and title = 'Breakfast and coffee' and day_key = 'fri') then
    raise notice 'the older Friday breakfast is not where it was; leaving both alone';
    return;
  end if;

  create table if not exists archive.shine_20260904_friday_breakfast as
    select * from public.schedule_items where id in (canonical, superseded);

  /* Everything that can point at a moment. If any of it does, this stops
     rather than dropping a relationship on the floor. */
  select (select count(*) from public.run_of_show_cues where schedule_item_id = superseded)
       + (select count(*) from public.tasks where schedule_item_id = superseded)
       + (select count(*) from public.resources where schedule_item_id = superseded)
    into attached;

  if attached > 0 then
    raise notice 'the older Friday breakfast has % attached record(s); leaving both alone', attached;
    return;
  end if;

  /* It is a meal, which the survivor did not know: a moment made from an idea
     takes a general track, and the row being merged away carries the better
     answer. Its place at the head of the morning comes across too. */
  update public.schedule_items
     set track = 'Meals', position = 1
   where id = canonical and engagement_id = eng and track = 'Experience';

  delete from public.schedule_items where id = superseded and engagement_id = eng;
end $$;
