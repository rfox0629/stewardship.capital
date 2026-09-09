-- Two questions, and they are not the same question.
--
-- Yesterday's model had one field, ledger, doing the work of both, and it was
-- wrong in a way that only shows up on the second example. Whether something
-- counts against the sixty thousand dollars this weekend has to spend, and
-- whether SHINE still owns it in January, are independent. Food counts and is
-- gone. An espresso machine counts and is kept. A speaker paid for from
-- somewhere else does not count and is kept. Deriving either from the other
-- gets one of those four wrong.
--
-- So: counts_toward_budget and reusable, separately, neither implying the
-- other. Nothing infers one from the other anywhere.
--
-- kind is the third, and it is about what a row is rather than how it is
-- counted. An allocation is an amount set aside. A purchase is a thing
-- somebody has to go and buy, which is why it carries a vendor, a link, an
-- owner and its own standing words. Either can count against the budget and
-- either can be kept.
--
-- parent_id is the structural fix. A $750 machine named inside an existing
-- $1,500 allocation is detail about money already counted, not another $750
-- of spending. A line whose ancestor already counts is never counted again,
-- and the same rule keeps reusable value from being doubled when a kept thing
-- sits inside a kept thing. That is one rule applied three times rather than
-- three subtly different sums, and it is tested.
--
-- ledger and review_of go. They encoded the rule this migration corrects, and
-- leaving a second contradictory representation in the table is how the next
-- version of this bug gets written. Both were introduced yesterday, nothing
-- else reads them, and no person has typed a value into either.

alter table public.budget_lines
  add column if not exists kind text not null default 'allocation';

alter table public.budget_lines
  add column if not exists counts_toward_budget boolean not null default true;

alter table public.budget_lines
  add column if not exists reusable boolean not null default false;

alter table public.budget_lines
  add column if not exists reuse_note text;

alter table public.budget_lines
  add column if not exists parent_id uuid references public.budget_lines(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.budget_lines'::regclass
       and conname = 'budget_lines_kind_check'
  ) then
    alter table public.budget_lines
      add constraint budget_lines_kind_check check (kind in ('allocation', 'purchase'));
  end if;
end $$;

comment on column public.budget_lines.kind is
  'What the row is. ''allocation'' is an amount set aside; ''purchase'' is a '
  'thing somebody has to buy, and carries a vendor, a link and an owner. It '
  'says nothing about whether the money counts or whether the thing is kept.';

comment on column public.budget_lines.counts_toward_budget is
  'Whether this spends the engagement''s budget. Independent of reusable: '
  'food counts and is gone, an espresso machine counts and is kept, a speaker '
  'funded from elsewhere does not count and is kept.';

comment on column public.budget_lines.reusable is
  'Whether the thing outlives the event. A planning and stewardship signal, '
  'not accounting: no depreciation, no useful life, no saving against renting. '
  'Independent of counts_toward_budget.';

comment on column public.budget_lines.reuse_note is
  'Where a kept thing goes afterwards, in the planner''s own words. Optional, '
  'and never filled in on their behalf.';

comment on column public.budget_lines.parent_id is
  'This line is detail about money already counted on that one. A line whose '
  'ancestor already counts toward the budget adds nothing further to it, and a '
  'kept line inside a kept line is not kept twice. Without this a $750 machine '
  'named inside a $1,500 allocation would read as $2,250 of spending.';

-- Carry the old field's meaning across exactly, so this migration on its own
-- changes no number anywhere. Equipment was outside the budget yesterday, so
-- it stays outside here; the correction to that is a separate, deliberate step.
update public.budget_lines
   set kind = 'purchase', counts_toward_budget = false
 where ledger = 'equipment' and kind = 'allocation';

do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.budget_lines'::regclass
       and conname = 'budget_lines_ledger_check'
  ) then
    alter table public.budget_lines drop constraint budget_lines_ledger_check;
  end if;
end $$;

drop index if exists public.budget_lines_review_of_idx;

alter table public.budget_lines drop column if exists review_of;
alter table public.budget_lines drop column if exists ledger;

do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'budget_lines_parent_id_idx'
  ) then
    create index budget_lines_parent_id_idx on public.budget_lines (parent_id)
      where parent_id is not null;
  end if;
end $$;
