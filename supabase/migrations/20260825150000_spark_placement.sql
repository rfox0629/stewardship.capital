-- Where an idea might happen, independent of whether it will.
--
-- A spark carries two separate answers: the pipeline's "should we do it",
-- and now a tentative placement, "where might it fit": a day of the
-- weekend and roughly when in that day. Placement is a planning gesture,
-- not a commitment; the confirmed schedule remains its own table and its
-- own decision, and nothing here creates or changes schedule rows.
--
-- Additive columns only. Writes ride the existing sparks update policy,
-- which is planner only, so a client can see where an idea is being
-- imagined but cannot move it. Guests never see sparks at all.

alter table public.sparks
  add column if not exists tentative_day text
    check (tentative_day in ('wed', 'thu', 'fri', 'sat', 'sun')),
  add column if not exists tentative_daypart text
    check (tentative_daypart in ('morning', 'afternoon', 'evening', 'anytime'));

-- The working sheet already placed several ideas; carry those placements in,
-- only where no placement exists yet.
do $$
declare
  eng uuid;
begin
  select e.id into eng
  from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026';

  if eng is null then return; end if;

  update public.sparks s set tentative_day = v.day, tentative_daypart = v.part
  from (values
    ('Candles or lanterns lining the drive for arrival', 'thu', 'evening'),
    ('Worship and welcome moment on Thursday', 'thu', 'evening'),
    ('Hors d''oeuvres and dessert on arrival evening', 'thu', 'evening'),
    ('Ice breaker Bible character game', 'thu', 'evening'),
    ('Barista bar with a Shine specialty drink', 'fri', 'morning'),
    ('Tactical sermon illustrations for the morning sessions', 'fri', 'morning'),
    ('Build the Tent relay', 'fri', 'afternoon'),
    ('Knot tying, military technique', 'fri', 'afternoon'),
    ('Human knot tying game', 'fri', 'afternoon'),
    ('Free time bingo of favorite things', 'fri', 'afternoon'),
    ('Late night pie bar on Friday', 'fri', 'evening'),
    ('Friday late evening alternatives', 'fri', 'evening'),
    ('Local coffee roaster pour over bar on Saturday', 'sat', 'morning'),
    ('Rope holder', 'sat', 'morning'),
    ('Boat ride or corn hole tournament with team prizes', 'sat', 'afternoon'),
    ('Live acoustic set at the Saturday bonfire', 'sat', 'evening'),
    ('Celebration glow run and walk', 'sat', 'evening'),
    ('Sunrise pontoon prayer on Saturday', 'sat', 'morning'),
    ('Stakes to take home', 'sat', 'evening'),
    ('Sunday sending liturgy card for the drive home', 'sun', 'morning')
  ) as v(title, day, part)
  where s.engagement_id = eng
    and s.title = v.title
    and s.tentative_day is null;
end $$;
