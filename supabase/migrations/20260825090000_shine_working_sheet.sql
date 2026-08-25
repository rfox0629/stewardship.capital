-- Brooke's handwritten working schedule, mapped into the model it was
-- written for, at the founder's direction.
--
-- The sheet mixes settled intentions, open ideas, and questions. Nothing here
-- pretends otherwise: idea shaped notes become sparks in capture or
-- discernment, open questions become decisions, menu notes attach to the
-- meals they describe, and the team's Wednesday becomes draft schedule items
-- that guests can never see because drafts never leave the database for a
-- stakeholder session. Where the handwriting is unclear the row says so
-- rather than inventing meaning.
--
-- Every insert is guarded by title or question so a rerun cannot duplicate,
-- and every note update fires only where no note exists yet, so nothing the
-- team has since written is overwritten.

do $$
declare
  eng uuid;
begin
  select e.id into eng
  from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026';

  if eng is null then
    raise exception 'the SHINE engagement is missing';
  end if;

  -- ------------------------------------------------- the team's Wednesday
  if not exists (select 1 from public.schedule_items i where i.engagement_id = eng and i.day_key = 'wed') then
    insert into public.schedule_items
      (engagement_id, day_key, starts_label, ends_label, title, track, location, status, note, position)
    values
      (eng, 'wed', '12:00 pm', null, 'Fox team arrives', 'Logistics', 'Whole property', 'draft',
       'Team only. From the working sheet.', 1),
      (eng, 'wed', '1:00 pm', null, 'Set up and unload', 'Logistics', 'Whole property', 'draft',
       'Staging, welcome gifts, signage, supplies.', 2);
  end if;

  -- ------------------------------------------------------------- sparks
  insert into public.sparks (engagement_id, title, detail, category, status, raised_by_name)
  select eng, v.title, v.detail, v.category, v.status, 'Working sheet'
  from (values
    ('Candles or lanterns lining the drive for arrival',
     'Atmosphere for Thursday arrivals. The sheet asks whether guests arrive between 6 and 7.',
     'Experience', 'discussing'),
    ('Bathroom flowers with the SHINE logo and anchor scripture',
     'Small touches in every bathroom.',
     'Hospitality', 'captured'),
    ('Ice breaker Bible character game',
     'Needs printed name tags plus blank tags.',
     'Program', 'discussing'),
    ('Flowers floating in the pool',
     'The sheet asks: what if it is too cold?',
     'Experience', 'captured'),
    ('Hors d''oeuvres and dessert on arrival evening',
     'Alongside or instead of parts of the welcome dinner.',
     'Hospitality', 'captured'),
    ('Black box welcome gift in each room',
     'With a SHINE sticker and scripture. Sits next to the approved handwritten note idea.',
     'Generosity', 'discussing'),
    ('Worship and welcome moment on Thursday',
     'The sheet pairs it with a hula hoop passed around a circle.',
     'Program', 'captured'),
    ('Barista bar with a Shine specialty drink',
     'Friday and Saturday mornings. Overlaps the pour over bar idea already in discernment; combine or choose.',
     'Hospitality', 'discussing'),
    ('Tactical sermon illustrations for the morning sessions',
     'A physical illustration carried through Friday and Saturday teaching.',
     'Program', 'discussing'),
    ('Build the Tent relay',
     'Team relay, about 25 dollars per tent. Ties straight into Enlarge the Tent.',
     'Experience', 'discussing'),
    ('Knot tying, military technique',
     'Skill session concept for Friday.',
     'Experience', 'captured'),
    ('Human knot tying game',
     'Group game pairing with the knot theme.',
     'Experience', 'captured'),
    ('Free time bingo of favorite things',
     'The sheet reads "Bingo of Waymani''s fave things". Confirm the name before anything is printed.',
     'Experience', 'discussing'),
    ('Friday late evening alternatives',
     'Bonfire, or arcade, movie and chill, candy. The fire pit evening is already confirmed; these are alternatives or additions.',
     'Experience', 'captured'),
    ('Rope holder',
     'From the working sheet, Saturday. Meaning unclear, likely part of the knot theme. Clarify before discerning.',
     'Experience', 'captured'),
    ('Boat ride or corn hole tournament with team prizes',
     'Saturday free time. Prizes for first, second, and third place teams.',
     'Experience', 'discussing'),
    ('Stakes to take home',
     'The sheet reads "STAKES, take home for night". Possibly tent stakes as a keepsake for Enlarge the Tent. Clarify.',
     'Generosity', 'captured'),
    ('Celebration glow run and walk',
     'Saturday night after dinner. A lit route through the property as the closing celebration.',
     'Experience', 'discussing')
  ) as v(title, detail, category, status)
  where not exists (
    select 1 from public.sparks s where s.engagement_id = eng and s.title = v.title
  );

  -- ----------------------------------------------------------- decisions
  insert into public.decisions (engagement_id, question, context, owner_name, status, needs_by)
  select eng, v.question, v.context, v.owner_name, 'open', v.needs_by
  from (values
    ('When do guests arrive on Thursday?',
     'The confirmed schedule holds check in from 3 to 6. The working sheet asks about arrivals between 6 and 7, which would move dinner and the opening.',
     'Brooke Fox', date '2026-09-04'),
    ('Who writes and signs the cabin welcome notes?',
     'The approved spark has Brooke writing them. The working sheet says handwritten notes from Sammy and Suzanne.',
     'Brooke Fox', date '2026-09-11')
  ) as v(question, context, owner_name, needs_by)
  where not exists (
    select 1 from public.decisions d where d.engagement_id = eng and d.question = v.question
  );

  -- ------------------------------------------------- menu notes on meals
  -- Working member visible only; guests never receive notes.
  update public.schedule_items i set note = v.note
  from (values
    ('fri', 'Coffee and breakfast', 'Sheet menu: egg bake, yogurt parfait, sausage, fruit.'),
    ('fri', 'Lunch', 'Sheet menu: cold sandwiches, chips, salad, veggies.'),
    ('fri', 'Dinner', 'Sheet menu: surf and turf, salmon and steak, brussels or asparagus, salad.'),
    ('sat', 'Coffee and breakfast', 'Sheet menu: waffle bar or french toast sticks, fruit, bacon.'),
    ('sat', 'Lunch', 'Sheet menu: wood fired pizzas.'),
    ('sat', 'Harvest dinner', 'Sheet menu: brisket, Sammy''s potatoes, salad, dessert.'),
    ('sun', 'Breakfast and packing', 'Sheet menu, 9 am: oatmeal or french toast bake, egg bites, fruit to go.')
  ) as v(day_key, title, note)
  where i.engagement_id = eng
    and i.day_key = v.day_key
    and i.title = v.title
    and i.note is null;
end $$;
