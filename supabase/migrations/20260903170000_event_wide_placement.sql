-- Unplaced and event-wide are not the same thing.
--
-- An idea with no placement is one nobody has decided about yet: the coffee
-- experience, at the moment it is captured, belongs to no day because the
-- question is still whether to rent or buy a machine at all. An event-wide
-- idea is the opposite; it has been thought about and it genuinely spans the
-- weekend. Treating both as "no day" hid that difference.
--
-- Nothing needs migrating. A null tentative_day already reads as unplaced,
-- and exactly one idea holds one. Event-wide only needs a value the column
-- is allowed to take, so the check widens by one and nothing else changes.

alter table public.sparks drop constraint if exists sparks_tentative_day_check;
alter table public.sparks
  add constraint sparks_tentative_day_check
  check (tentative_day in ('all', 'wed', 'thu', 'fri', 'sat', 'sun'));

comment on column public.sparks.tentative_day is
  'Rough placement, never a schedule. null is unplaced, ''all'' spans the '
  'event, and a day means we think it belongs around then. Only a schedule '
  'item gives an idea a real time, and an idea may have several.';
