-- The card's lines say only what the card says.
--
-- A line borrowing a calendar row was borrowing its sentence too, so the
-- appetizers read "A warm, informal opening meal." under a card that says
-- "Appetizers and Fellowship" and nothing else. The borrowed copy keeps the
-- menu and the tabs it opens, and leaves the prose behind.

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
                          /* Only what makes the line tappable: the menu, and
                             the tabs it opens. The card carries no sentences,
                             so neither does the guide that copies it. */
                          else (s.guest_guide - 'title' - 'summary') end
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
