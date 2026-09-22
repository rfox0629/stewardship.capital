-- The guest reading returns guest wording.
--
-- The master calendar titles rows for the team: "Dinner preparation and
-- personal reset", "Meal cleanup and worship reset". Guests already saw the
-- friendlier override on screen; now the payload carries it too, so the
-- operational phrasing does not travel any further than the team.

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
    'moments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id,
               'day', s.day_key,
               'starts', s.starts_label,
               'ends', s.ends_label,
               'daypart', s.daypart,
               /* The guest facing name, when the calendar's own is written
                  for the team. A guest reading the payload by hand sees the
                  same words as a guest reading the page. */
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
  );
end;
$$;


revoke all on function public.weekend_guide(text, text, text) from public;
grant execute on function public.weekend_guide(text, text, text) to anon, authenticated;
