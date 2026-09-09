-- Two questions the planner could not answer yet, and one it answered twice.
--
-- 1. Who is this for. There will one day be a guest view of this weekend, and
--    the mistake to avoid is building it a calendar of its own. There is one
--    schedule. A moment says who it is for, and the guest view will be that
--    schedule filtered, never a second copy to keep in step.
--
-- 2. Which pot does this come out of. Producing this weekend and buying
--    something SHINE keeps afterwards are different kinds of spending, and
--    counting a retained speaker against a sixty thousand dollar event
--    ceiling makes the ceiling mean less every time somebody buys a durable
--    thing. Same table, same rollup machinery, same row level security: a
--    line simply says which ledger it belongs to, so reclassifying one later
--    is a single field rather than a migration.
--
-- 3. And the same money said twice. An espresso machine bought to keep may
--    already be sitting inside an event line called "Barista and espresso
--    equipment". Nothing here decides that. review_of records that two lines
--    might be the same money and that a person still has to say, which is
--    different from guessing and different from silently rewriting either.
--
-- Everything is additive and defaulted, so every existing row keeps behaving
-- exactly as it does today until somebody says otherwise.

-- ------------------------------------------------------------- who it is for

alter table public.schedule_items
  add column if not exists audience text not null default 'everyone';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.schedule_items'::regclass
       and conname = 'schedule_items_audience_check'
  ) then
    alter table public.schedule_items
      add constraint schedule_items_audience_check
      check (audience in ('everyone', 'planner'));
  end if;
end $$;

comment on column public.schedule_items.audience is
  'Who a moment is for. ''everyone'' belongs on the weekend as guests will '
  'eventually see it; ''planner'' is internal, like setup or a team briefing. '
  'It changes nothing today: every role is already filtered by row level '
  'security and there is no guest view yet. It exists so that when there is '
  'one, it is this schedule filtered rather than a second schedule. An '
  'activity inside a moment follows its moment until it needs its own column.';

-- --------------------------------------------------- which pot it comes from

alter table public.budget_lines
  add column if not exists ledger text not null default 'event';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.budget_lines'::regclass
       and conname = 'budget_lines_ledger_check'
  ) then
    alter table public.budget_lines
      add constraint budget_lines_ledger_check
      check (ledger in ('event', 'equipment'));
  end if;
end $$;

comment on column public.budget_lines.ledger is
  '''event'' is the cost of producing this specific weekend and counts '
  'against the engagement budget. ''equipment'' is a durable thing acquired '
  'for the event and kept afterwards; it is planned and tracked here but is '
  'deliberately outside the event ceiling, because a speaker SHINE still '
  'owns next year is not what this weekend cost. Moving a line between the '
  'two is a planning decision and is exactly this one field.';

-- A durable purchase knows where it is coming from and what to click.
alter table public.budget_lines
  add column if not exists vendor text;

alter table public.budget_lines
  add column if not exists source_url text;

comment on column public.budget_lines.vendor is
  'Where the thing is being bought, in the planner''s own words.';

comment on column public.budget_lines.source_url is
  'The link the purchase came from, when one was supplied. Never guessed.';

-- ------------------------------------------------- the same money, said twice

alter table public.budget_lines
  add column if not exists review_of uuid references public.budget_lines(id) on delete set null;

comment on column public.budget_lines.review_of is
  'This line may already be inside that one, and somebody has to decide. It '
  'is a flag, not an arithmetic rule: neither line is adjusted, neither is '
  'removed from its own total, and clearing it is the planner saying the '
  'question is settled. Generic on purpose, so any overlap can be raised the '
  'same way.';

do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'budget_lines_review_of_idx'
  ) then
    create index budget_lines_review_of_idx on public.budget_lines (review_of)
      where review_of is not null;
  end if;
end $$;
