-- The coffee bar says when it is open.
--
-- The hours were being derived on the page from the moments it had been
-- handed, which for a guest is the printed card. The card has no coffee bar
-- line on it: the afternoon sits inside "Free Time and Activities" and the
-- morning breaks are not on the card at all. So the block that was meant to
-- say when the bar is open had nothing to say, in either guide.
--
-- weekend_guide() now answers the question itself, off the working calendar,
-- which is the only place the hours are written. A row counts when its guest
-- copy opens the coffee menu, the same mark the schedule uses to link a row
-- to the Coffee tab, so the hours and the weekend cannot disagree. Only the
-- day and the two times come back. Nothing else about those rows does, and
-- nothing about the schedule changed to make this work.

create or replace function public.weekend_guide(
  p_client text, p_series text, p_edition text
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  eng record;
begin
  select e.id, e.name, e.starts_on, e.ends_on, e.location, e.venue,
         e.theme, e.reference, o.name as organization_name, o.theme as organization_theme
    into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = p_client
     and e.series_slug = p_series
     and e.edition_label = p_edition;

  if eng.id is null then
    return null;
  end if;

  /* Published, or read by someone who already belongs to the engagement:
     members can see the guide before it goes out. */
  if not (
    coalesce((eng.reference -> 'guide' ->> 'public') = 'true', false)
    or public.is_engagement_member(eng.id)
    or public.is_platform_staff()
  ) then
    return null;
  end if;

  return jsonb_build_object(
    'name', eng.name,
    'organization', eng.organization_name,
    'startsOn', eng.starts_on,
    'endsOn', eng.ends_on,
    'location', eng.location,
    'venue', eng.venue,
    'theme', eng.theme,
    'organizationTheme', jsonb_build_object('images',
      jsonb_build_object('organizationLogo', eng.organization_theme -> 'images' -> 'organizationLogo')),
    'activities', coalesce(eng.reference -> 'guide' -> 'activities', '[]'::jsonb),
    'coffee', coalesce(eng.reference -> 'guide' -> 'coffee', '[]'::jsonb),
    /* When the bar is actually open, read off the calendar rather than
       written down twice. A row counts when its guest copy opens the coffee
       menu, which is the same mark that makes a row link there from the
       schedule, so the hours cannot say one thing while the weekend says
       another. Three fields: a day and two times. Who is pouring, and what
       else is happening in that window, stays on the team's side. */
    'coffeeHours', coalesce((
      select jsonb_agg(jsonb_build_object(
               'day', s.day_key,
               'starts', s.starts_label,
               'ends', s.ends_label)
             order by case s.day_key
                        when 'thu' then 1 when 'fri' then 2
                        when 'sat' then 3 when 'sun' then 4 else 5 end,
                      s.position)
        from public.schedule_items s
       where s.engagement_id = eng.id
         and s.status = 'confirmed'
         and s.audience = 'everyone'
         and s.starts_label is not null
         and (s.guest_guide -> 'opens' ? 'coffee'
              or (s.guest_guide ->> 'kind') = 'coffee')
    ), '[]'::jsonb),
    'published', coalesce((eng.reference -> 'guide' ->> 'public') = 'true', false),
    /* Every column named. Nothing here can grow a field by accident. */
    /* What the guest was handed.
     *
     * When the engagement has a written guest schedule, that is the guide:
     * the card's own days, times and words, with each line free to borrow the
     * guest copy of a row on the working calendar, which is how a meal keeps
     * its menu. Without one, the guide is still every public row, which is
     * what an engagement that has not written a card yet should see. */
    'moments', case
      when jsonb_typeof(eng.reference -> 'guide' -> 'schedule') = 'array'
       and jsonb_array_length(eng.reference -> 'guide' -> 'schedule') > 0
      then coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', coalesce(line ->> 'momentId', md5(line::text)),
                 'day', line ->> 'day',
                 'starts', line ->> 'starts',
                 'ends', line ->> 'ends',
                 'daypart', line ->> 'daypart',
                 'title', line ->> 'title',
                 'location', null,
                 'window', false,
                 /* The borrowed copy, without its title: the card names the
                    line, and the row underneath only lends its detail. */
                 'guide', case when s.id is null then null
                          else (s.guest_guide - 'title') end
               ))
          from jsonb_array_elements(eng.reference -> 'guide' -> 'schedule') line
          left join public.schedule_items s
            on s.id = (line ->> 'momentId')::uuid
           and s.engagement_id = eng.id
           and s.status = 'confirmed'
           and s.audience = 'everyone'
      ), '[]'::jsonb)
      else coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', s.id,
                 'day', s.day_key,
                 'starts', s.starts_label,
                 'ends', s.ends_label,
                 'daypart', s.daypart,
                 'title', coalesce(nullif(s.guest_guide ->> 'title', ''), s.title),
                 'location', s.location,
                 'window', s.display_mode = 'background',
                 'guide', s.guest_guide
               ))
          from public.schedule_items s
         where s.engagement_id = eng.id
           and s.status = 'confirmed'
           and s.audience = 'everyone'
           and s.day_key in ('thu', 'fri', 'sat', 'sun')
      ), '[]'::jsonb)
    end
  );
end;
$$;

revoke all on function public.weekend_guide(text, text, text) from public;
grant execute on function public.weekend_guide(text, text, text) to anon, authenticated;
