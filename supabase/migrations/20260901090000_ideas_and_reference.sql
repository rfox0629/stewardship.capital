-- The product simplifies: ideas, a schedule that admits untimed moments, and
-- reference material that belongs to the engagement rather than to the code.
--
-- Every change here is a relaxation or an addition. Nothing is dropped and no
-- existing value is rewritten, so the archive taken alongside this migration
-- stays the only record that needed to be kept.

-- ------------------------------------------------- an idea needs only a name
--
-- Capturing an idea should cost one line of typing. Category stops being
-- required; the rows that already carry one keep it.
alter table public.sparks alter column category drop not null;

-- --------------------------------------- a moment may belong to a part of a day
--
-- The working sheet says "Afternoon: free time" and "Evening: fellowship". That
-- is a real entry with no clock time, and inventing one would be a lie about
-- the plan. An untimed moment carries a daypart instead of a start.
alter table public.schedule_items alter column starts_label drop not null;
alter table public.schedule_items
  add column if not exists daypart text
    check (daypart in ('morning', 'afternoon', 'evening', 'anytime'));

-- A moment must still say when it happens, one way or the other.
alter table public.schedule_items drop constraint if exists schedule_items_when_check;
alter table public.schedule_items
  add constraint schedule_items_when_check
  check (starts_label is not null or daypart is not null);

-- ------------------------------------------------- a budget line's standing
--
-- The sheet marks each line Estimate, Discuss, or Protected, and one line
-- carries no number at all yet. Both facts are worth keeping.
alter table public.budget_lines
  add column if not exists status text
    check (status in ('estimate', 'discuss', 'protected', 'committed')),
  add column if not exists note text;

-- ------------------------------------------------------ reference material
--
-- Vision, venue, and the drink list are reference the team reads, not records
-- it works. They belong to the engagement, so they stay per client and ride
-- the row level security the engagement already has, rather than becoming
-- another table with another policy and another admin screen.
alter table public.engagements
  add column if not exists reference jsonb not null default '{}'::jsonb;
