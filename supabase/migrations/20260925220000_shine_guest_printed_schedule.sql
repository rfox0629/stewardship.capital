-- What the guest card says, and nothing more.
--
-- A guest is handed a printed card with three days and fifteen lines on it.
-- Until now the guide showed them every public row of the working calendar,
-- which is true but is not what they were given: the devotional, the rope prep
-- and the bingo are how the weekend is run, not how it is experienced.
--
-- So the guest reading becomes a written thing rather than a derived one. It
-- lives on the engagement, beside the activities and the coffee menu already
-- written there, and it says exactly what the card says. A line may point at a
-- row of the real calendar, which is how a meal keeps its menu: the line
-- carries the food, while the time and the title come from the card.
--
-- One calendar still. These lines own nothing the team or the planner sees,
-- and the working calendar is untouched.

do $migration$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  moved integer;
  lines jsonb;
begin

with card (day_key, starts_label, ends_label, title, source_day, source_title) as (
  values
    /* Thursday. Arrival, food, and the evening, in the card's own words. */
    ('thu', '4:00 pm',  '6:00 pm',  'Arrival', null, null),
    ('thu', '6:00 pm',  '7:00 pm',  'Appetizers and Fellowship',
       'thu', 'Welcome appetizers and dessert'),
    ('thu', '7:00 pm',  '8:00 pm',  'Worship and Vision', null, null),

    /* Friday. */
    ('fri', '7:30 am',  '9:00 am',  'Breakfast and Coffee', 'fri', 'Breakfast and coffee'),
    ('fri', '9:00 am',  '12:00 pm', 'Time with Shine', null, null),
    ('fri', '12:00 pm', '1:00 pm',  'Lunch', 'fri', 'Lunch'),
    ('fri', '1:00 pm',  '5:00 pm',  'Free Time and Activities', 'fri', 'Free time'),
    ('fri', '5:30 pm',  '6:30 pm',  'Dinner', 'fri', 'Dinner'),
    ('fri', '7:00 pm',  '8:30 pm',  'Worship and Stories from the Field', null, null),

    /* Saturday. */
    ('sat', '7:30 am',  '9:00 am',  'Breakfast and Coffee', 'sat', 'Breakfast and coffee'),
    ('sat', '9:00 am',  '12:00 pm', 'Time with Shine', null, null),
    ('sat', '12:00 pm', '1:00 pm',  'Lunch', 'sat', 'Lunch'),
    ('sat', '1:00 pm',  '5:00 pm',  'Free Time and Activities', 'sat', 'Free time'),
    ('sat', '5:30 pm',  '6:30 pm',  'Dinner', 'sat', 'Celebration dinner'),
    ('sat', '7:00 pm',  '8:30 pm',  'Celebration and Fun', null, null)
)
select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
         'day', c.day_key,
         'starts', c.starts_label,
         'ends', c.ends_label,
         'title', c.title,
         'momentId', s.id
       )) order by c.day_key, s.id nulls last)
  into lines
  from card c
  left join public.schedule_items s
    on s.engagement_id = shine
   and s.day_key = c.source_day
   and s.title = c.source_title;

if jsonb_array_length(lines) <> 15 then
  raise exception 'card: expected 15 lines, built %', jsonb_array_length(lines);
end if;

/* Every line that names a row of the calendar found one. A line that lost its
   row would be a meal with no menu, which is the one thing the card has to
   keep. */
select count(*) into moved
  from jsonb_array_elements(lines) line
 where line ? 'momentId';
if moved <> 9 then
  raise exception 'card: expected 9 linked lines, found %', moved;
end if;

update public.engagements
   set reference = jsonb_set(
         coalesce(reference, '{}'::jsonb),
         '{guide,schedule}',
         lines,
         true)
 where id = shine;
get diagnostics moved = row_count;
if moved <> 1 then raise exception 'engagement: % rows', moved; end if;

end $migration$;
