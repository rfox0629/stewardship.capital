-- Free time says what is scheduled in it.
--
-- Each day's "Free Time and Activities" line on the guest card now names the
-- activities planned inside it: the bingo on Friday, the prayer walk and the
-- cornhole tournament on Saturday. The card does not copy them. It points at
-- the rows the team already runs, so a time changed on the working calendar
-- is changed in the guest's guide too, and the guide lists each one with its
-- own day and times on the block and at the top of the Activities tab.
--
-- weekend_guide() returns, per card line, an id, a day, two times and a name
-- for each activity it names, and only for rows that are confirmed and public.
-- Setup, cleanup, who runs it and the notes on those rows stay on the team's
-- side: none of those columns is read here, and the planner-only prep and
-- cleanup rows cannot be named at all.
--
-- The card names two of them in its own voice, the way it already writes
-- "Free Time and Activities": Prayer Walk and Cornhole Tournament. The bingo
-- keeps the guest name its row already has. The free time rows, their 1:00 to
-- 5:00 card window, and every other line are untouched.

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
                          else (s.guest_guide - 'title') end,
                 /* What is scheduled inside the line, each read off its own
                    public row: the card may name it, the row keeps its day
                    and times. Five fields, and nothing a planner-only row or
                    a row's operating detail could add. */
                 'activities', coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'id', a.id,
                            'day', a.day_key,
                            'starts', a.starts_label,
                            'ends', a.ends_label,
                            'title', coalesce(nullif(pick ->> 'title', ''),
                                              nullif(a.guest_guide ->> 'title', ''),
                                              a.title))
                          order by pick_order)
                     from jsonb_array_elements(
                            case when jsonb_typeof(line -> 'activities') = 'array'
                                 then line -> 'activities' else '[]'::jsonb end
                          ) with ordinality as picks(pick, pick_order)
                     join public.schedule_items a
                       on a.id = (pick ->> 'momentId')::uuid
                      and a.engagement_id = eng.id
                      and a.status = 'confirmed'
                      and a.audience = 'everyone'
                 ), '[]'::jsonb)
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

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  fri_free constant text := '98dc6592-07ac-4a22-bc56-e3c414be1a9b';
  sat_free constant text := '56aa5c99-767d-4281-988c-8be40de8e17e';
  bingo constant uuid := '995c6b13-6c34-421a-8c36-d138aeb9459c';
  walk constant uuid := '9958510d-4084-5e71-a153-53934a27b3b8';
  cornhole constant uuid := '851edeef-b4db-4c29-9001-a6bc677151f9';
  lines jsonb;
  before_count integer;
  touched integer;
begin

/* The three rows are the ones the team runs, where the team has them. */
select count(*) into touched
  from public.schedule_items s
 where s.engagement_id = shine and s.status = 'confirmed' and s.audience = 'everyone'
   and ((s.id = bingo and s.day_key = 'fri' and s.starts_label = '2:00 pm' and s.ends_label = '4:00 pm'
         and s.guest_guide ->> 'title' = 'Bingo of Wanyonyi''s favorite things')
     or (s.id = walk and s.day_key = 'sat' and s.starts_label = '1:00 pm' and s.ends_label = '2:00 pm'
         and s.title = 'Prayer walk')
     or (s.id = cornhole and s.day_key = 'sat' and s.starts_label = '2:00 pm' and s.ends_label = '4:00 pm'
         and s.title = 'Cornhole tournament'));
if touched <> 3 then
  raise exception 'activities: expected the bingo, prayer walk and cornhole rows, matched %', touched;
end if;

select reference -> 'guide' -> 'schedule' into lines
  from public.engagements where id = shine;
before_count := jsonb_array_length(lines);

/* Each free time line once, as the card has it, and nothing on it yet. */
select count(*) into touched
  from jsonb_array_elements(lines) line
 where line ->> 'title' = 'Free Time and Activities'
   and line ->> 'starts' = '1:00 pm' and line ->> 'ends' = '5:00 pm'
   and not (line ? 'activities')
   and ((line ->> 'day' = 'fri' and line ->> 'momentId' = fri_free)
     or (line ->> 'day' = 'sat' and line ->> 'momentId' = sat_free));
if touched <> 2 then
  raise exception 'card: expected the two free time lines, matched %', touched;
end if;

select jsonb_agg(
         case
           when line ->> 'momentId' = fri_free and line ->> 'title' = 'Free Time and Activities'
             then line || jsonb_build_object('activities', jsonb_build_array(
                    jsonb_build_object('momentId', bingo::text)))
           when line ->> 'momentId' = sat_free and line ->> 'title' = 'Free Time and Activities'
             then line || jsonb_build_object('activities', jsonb_build_array(
                    jsonb_build_object('momentId', walk::text, 'title', 'Prayer Walk'),
                    jsonb_build_object('momentId', cornhole::text, 'title', 'Cornhole Tournament')))
           else line
         end
         order by n)
  into lines
  from jsonb_array_elements(lines) with ordinality as t(line, n);

if jsonb_array_length(lines) <> before_count then
  raise exception 'card: % lines went in, % came out', before_count, jsonb_array_length(lines);
end if;

update public.engagements
   set reference = jsonb_set(reference, '{guide,schedule}', lines, true)
 where id = shine;
get diagnostics touched = row_count;
if touched <> 1 then raise exception 'engagement: % rows', touched; end if;

/* And the guide reads them back: the right names, on the right days, at the
   rows' own times, and nothing else about them. */
select count(*) into touched
  from jsonb_array_elements(public.weekend_guide('shine', 'founders-weekend', '2026') -> 'moments') m,
       jsonb_array_elements(m -> 'activities') a
 where (a ->> 'title', a ->> 'day', a ->> 'starts', a ->> 'ends') in (
         ('Bingo of Wanyonyi''s favorite things', 'fri', '2:00 pm', '4:00 pm'),
         ('Prayer Walk', 'sat', '1:00 pm', '2:00 pm'),
         ('Cornhole Tournament', 'sat', '2:00 pm', '4:00 pm'))
   and (select array_agg(k order by k) from jsonb_object_keys(a) k)
       = array['day', 'ends', 'id', 'starts', 'title'];
if touched <> 3 then
  raise exception 'guide: expected three scheduled activities, read %', touched;
end if;

end $migration$;
