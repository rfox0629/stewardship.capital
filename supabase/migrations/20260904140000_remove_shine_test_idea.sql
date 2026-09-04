-- Removes one idea that was somebody trying the Add button, not planning.
--
-- It was created by hand in production on 2026-09-03 while the Weekend work
-- was in flight, titled TEST and asking DO WE WANT TO DO THIS?, and it is the
-- only reason the live counts read 36 ideas and 6 open questions rather than
-- 35 and 5. Its owner has asked for it to go.
--
-- Addressed by id, and guarded: if it has picked up a scheduled moment, an
-- action, a requirement, a cost, a note or a cue since, it is no longer a
-- stray keystroke and the delete does nothing rather than taking real
-- planning with it.

do $$
declare
  eng uuid;
  gone integer;
begin
  select e.id into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = 'shine' and e.slug = 'founders-weekend-2026';
  if eng is null then
    raise notice 'SHINE engagement not present, nothing to remove';
    return;
  end if;

  create table if not exists archive.shine_20260904_test_idea as
    select * from public.sparks where id = '28735df9-0354-42cb-bcf1-c6e690742daf';

  delete from public.sparks s
   where s.id = '28735df9-0354-42cb-bcf1-c6e690742daf'
     and s.engagement_id = eng
     and s.title = 'TEST'
     and not exists (select 1 from public.schedule_items   t where t.spark_id = s.id)
     and not exists (select 1 from public.tasks            t where t.spark_id = s.id)
     and not exists (select 1 from public.resources        r where r.spark_id = s.id)
     and not exists (select 1 from public.budget_lines     b where b.spark_id = s.id)
     and not exists (select 1 from public.spark_notes      n where n.spark_id = s.id)
     and not exists (select 1 from public.run_of_show_cues c where c.spark_id = s.id);

  get diagnostics gone = row_count;
  raise notice 'test idea removed: % row(s)', gone;
end $$;
