-- Attendance is not a duty, and a volunteer may tick one off.
--
-- Two things, both of them about who is responsible for what.
--
-- First: being at a meal is not a job. The import made a duty of every
-- operations row, so breakfast, free time and the bonfire each grew a
-- checkbox that nobody owns. Those sixteen rows stay on the schedule and lose
-- their task. In their place, the program rows where somebody has an actual
-- job (speaking, leading worship, running AV, handing over) become duties, so
-- a person checking their own list does not miss that they are also teaching.
--
-- Second: completing a duty is not editing the calendar. Ticking a box was
-- planner only, which left the volunteers who do the work unable to record
-- it. set_duty_done() lets any working member mark a duty of their own
-- engagement done or not done, and nothing else: it cannot retitle a task,
-- reassign it, or touch a row that is not a duty from the master calendar.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  attendance constant text[][] := array[
    ['wed', 'Team dinner and birthday celebration'],
    ['thu', 'Breakfast'],
    ['thu', 'Team lunch and progress check'],
    ['thu', 'Welcome appetizers and dessert'],
    ['thu', 'Fellowship'],
    ['fri', 'Breakfast and coffee'],
    ['fri', 'Lunch'],
    ['fri', 'Free time'],
    ['fri', 'Dinner'],
    ['fri', 'Fellowship, bonfire and movies'],
    ['sat', 'Breakfast and coffee'],
    ['sat', 'Lunch'],
    ['sat', 'Free time'],
    ['sat', 'Celebration dinner'],
    ['sat', 'Celebration evening'],
    ['sun', 'Grab-and-go breakfast']
  ];
  found integer;
begin

create temporary table attendance_rows on commit drop as
select s.id
  from public.schedule_items s
  join unnest(attendance) with ordinality as pair(value, position) on true
 where false;

/* unnest of a 2D array flattens, so the pairs are rebuilt by position. */
insert into attendance_rows (id)
select s.id
  from public.schedule_items s
 where s.engagement_id = shine
   and exists (
     select 1
       from generate_subscripts(attendance, 1) as i
      where attendance[i][1] = s.day_key
        and attendance[i][2] = s.title
   );

select count(*) into found from attendance_rows;
if found <> 16 then
  raise exception 'attendance: expected 16 rows, matched %', found;
end if;

update public.schedule_item_ops o
   set detail = jsonb_set(o.detail, '{duty}', to_jsonb(not exists (
         select 1 from attendance_rows a where a.id = o.schedule_item_id))),
       updated_at = now()
 where o.engagement_id = shine;

/* The checkbox goes away with the duty. A tick anyone has already made is
   left alone rather than silently discarded. */
delete from public.tasks t
 where t.engagement_id = shine
   and t.status <> 'done'
   and t.schedule_item_id in (select id from attendance_rows);

/* Every remaining duty row has exactly one task, including the program rows
   that now carry one. Existing tasks keep their id and their completion. */
insert into public.tasks
  (engagement_id, title, status, owner_name, schedule_item_id, duty)
select shine, s.title, 'todo', o.detail->>'owner', s.id,
       jsonb_build_object('phase', s.day_key, 'order', s.position,
                          'when', s.starts_label, 'fromMaster', true)
  from public.schedule_items s
  join public.schedule_item_ops o on o.schedule_item_id = s.id
 where s.engagement_id = shine
   and (o.detail->>'duty') = 'true'
   and not exists (
     select 1 from public.tasks t
      where t.engagement_id = shine and t.schedule_item_id = s.id
   );

select count(*) into found
  from public.tasks t
  join public.schedule_item_ops o on o.schedule_item_id = t.schedule_item_id
 where t.engagement_id = shine and (o.detail->>'duty') = 'true';
if found <> 61 then
  raise exception 'duties: expected 61, found %', found;
end if;

end $migration$;

/**
 * Mark a duty done, or not done, as the person doing it.
 *
 * Security definer because the tasks table is planner only for writes, and
 * widening that would hand every volunteer the rest of the planner's surface.
 * The function checks membership itself, changes nothing but the status, and
 * refuses any task that is not a duty generated from the master calendar.
 */
create or replace function public.set_duty_done(p_task uuid, p_done boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_engagement uuid;
begin
  select t.engagement_id into owner_engagement
    from public.tasks t
   where t.id = p_task
     and coalesce((t.duty ->> 'fromMaster')::boolean, false);

  if owner_engagement is null then
    return false;
  end if;

  if not (public.is_platform_staff()
          or exists (
            select 1
              from public.workspace_members m
             where m.engagement_id = owner_engagement
               and m.user_id = auth.uid()
               and m.role in ('planner', 'client')
          )) then
    return false;
  end if;

  update public.tasks
     set status = case when p_done then 'done' else 'todo' end
   where id = p_task;

  return true;
end;
$$;

revoke all on function public.set_duty_done(uuid, boolean) from public, anon;
grant execute on function public.set_duty_done(uuid, boolean) to authenticated;

comment on function public.set_duty_done(uuid, boolean) is
  'Marks a master calendar duty done or not done for any working member of '
  'its engagement. Status only: it cannot retitle, reassign, or reach a task '
  'that is not a duty, so completing work never becomes editing the weekend.';
