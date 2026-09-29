-- Four people who could not choose their own name.
--
-- The name picker on the team guide is read off the Lead column, because the
-- Lead column names people cleanly. Johnny, Oakley, Gunner and Axel joined
-- the weekend on team lines only, so each of them had a schedule and no way
-- to ask for it.
--
-- The team column cannot simply be parsed for names: it also says "Junior AV
-- and coverage", "Catering Team" and "As assigned", and the picker would
-- offer "coverage" as somebody to be. So the four are written down once, on
-- the engagement, and the picker offers a written name wherever the rows in
-- front of it actually mention that person.
--
-- weekend_team_guide() hands the list to whoever it already hands the team
-- guide to, and to nobody else. It is the function as it stood with one key
-- added; the guest function is not touched, so no name reaches a page that
-- needs no code to open.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  named constant text[] := array['Johnny', 'Oakley', 'Gunner', 'Axel'];
  person text;
  touched integer;
begin

/* Each of them is on the weekend, and none of them leads anything: that is
   the whole reason they need writing down. */
foreach person in array named loop
  select count(*) into touched
    from public.schedule_item_ops o
   where o.engagement_id = shine and (o.detail ->> 'support') ~ ('(^|[^[:alpha:]])' || person || '([^[:alpha:]]|$)');
  if touched < 1 then raise exception 'roster: % is on no team line', person; end if;

  select count(*) into touched
    from public.schedule_item_ops o
   where o.engagement_id = shine and (o.detail ->> 'owner') ~ ('(^|[^[:alpha:]])' || person || '([^[:alpha:]]|$)');
  if touched <> 0 then raise exception 'roster: % already leads a row', person; end if;
end loop;

update public.engagements
   set reference = jsonb_set(reference, '{guide,roster}', to_jsonb(named), true)
 where id = shine;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'roster: % rows', touched; end if;

if (select reference -> 'guide' -> 'roster' from public.engagements where id = shine)
   is distinct from to_jsonb(named) then
  raise exception 'roster: the list did not come back the way it went in';
end if;

end $migration$;

create or replace function public.weekend_team_guide(
  p_client text,
  p_series text,
  p_edition text,
  p_token_hash text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  engagement uuid;
  by_code boolean;
begin
  engagement := public.event_engagement(p_client, p_series, p_edition);
  if engagement is null then
    return null;
  end if;

  by_code := p_token_hash is not null and exists (
    select 1 from public.event_sessions s
     where s.token_hash = p_token_hash
       and s.expires_at > now()
       and s.engagement_id = engagement
  );

  if not by_code
     and not public.is_platform_staff()
     and not exists (
       select 1 from public.workspace_members m
        where m.engagement_id = engagement
          and m.user_id = auth.uid()
          and m.role in ('planner', 'client')
     )
  then
    return null;
  end if;

  return jsonb_build_object(
    'moments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id,
               'day', s.day_key,
               'starts', s.starts_label,
               'ends', s.ends_label,
               'title', s.title,
               'location', s.location,
               'window', s.display_mode = 'background',
               'teamOnly', s.audience = 'planner',
               'guide', s.guest_guide,
               'ops', o.detail
             ) order by s.position)
        from public.schedule_items s
        left join public.schedule_item_ops o on o.schedule_item_id = s.id
       where s.engagement_id = engagement
         and s.status = 'confirmed'
    ), '[]'::jsonb),
    'duties', coalesce((
      select jsonb_agg(jsonb_build_object(
               'taskId', t.id,
               'momentId', t.schedule_item_id,
               'status', t.status))
        from public.tasks t
       where t.engagement_id = engagement
         and t.schedule_item_id is not null
         and coalesce((t.duty ->> 'fromMaster')::boolean, false)
    ), '[]'::jsonb),
    'prep', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id,
               'title', t.title,
               'owner', t.owner_name,
               'status', t.status,
               'when', t.duty ->> 'when',
               'notes', t.duty ->> 'notes',
               'order', coalesce((t.duty ->> 'order')::integer, 999))
             order by coalesce((t.duty ->> 'order')::integer, 999))
        from public.tasks t
       where t.engagement_id = engagement
         and (t.duty ->> 'phase') = 'before'
    ), '[]'::jsonb),
    /* People the engagement has named who lead nothing, so the name picker
       can offer them. Names only, and only to somebody already entitled to
       the team guide: this is past both checks above. */
    'roster', coalesce((
      select e.reference -> 'guide' -> 'roster'
        from public.engagements e
       where e.id = engagement
         and jsonb_typeof(e.reference -> 'guide' -> 'roster') = 'array'
    ), '[]'::jsonb),
    /* A code opens the guide. Editing the weekend stays with the planners. */
    'canEdit', not by_code and (public.is_platform_staff() or exists (
      select 1 from public.workspace_members m
       where m.engagement_id = engagement
         and m.user_id = auth.uid()
         and m.role = 'planner'
    ))
  );
end;
$$;

revoke all on function public.weekend_team_guide(text, text, text, text) from public;
grant execute on function public.weekend_team_guide(text, text, text, text) to anon, authenticated;

/* The guest's function still knows nothing about the roster. */
do $check$
begin
  if public.weekend_guide('shine', 'founders-weekend', '2026') ? 'roster' then
    raise exception 'roster: the guest guide is carrying team names';
  end if;
  /* And nobody without a code or a membership is handed it. */
  if public.weekend_team_guide('shine', 'founders-weekend', '2026', 'not-a-session') is not null then
    raise exception 'roster: the team guide answered a stranger';
  end if;
end $check$;
