-- A thing you buy has a different standing than a number you estimate.
--
-- The event ledger's four words are about how firm a figure is: an estimate,
-- something to discuss, money held back, money committed. A speaker being
-- bought is not any of those. It has not been bought, or it is on its way, or
-- it is in the room.
--
-- So the check widens rather than splits. One column, one vocabulary per
-- ledger, and which words belong to which ledger is decided in the product
-- where a planner can see both. Widening a check can never fail on existing
-- rows: everything that was allowed still is.

do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'public.budget_lines'::regclass
       and conname = 'budget_lines_status_check'
  ) then
    alter table public.budget_lines drop constraint budget_lines_status_check;
  end if;

  alter table public.budget_lines
    add constraint budget_lines_status_check
    check (status in (
      'estimate', 'discuss', 'protected', 'committed',
      'to_buy', 'ordered', 'received'
    ));
end $$;

comment on column public.budget_lines.status is
  'How firm this line is. The event ledger uses estimate, discuss, protected '
  'and committed, which describe a number. The equipment ledger uses to_buy, '
  'ordered and received, which describe a thing. One column, because a line '
  'moved between ledgers keeps everything else it knows.';
