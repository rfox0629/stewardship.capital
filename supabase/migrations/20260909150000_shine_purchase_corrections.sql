-- What Ryan actually meant, applied to the three purchases.
--
-- The espresso machine is inside the Founders Weekend budget. The reason it
-- is worth naming as equipment is not that it sits outside the money; it is
-- that the weekend's money buys SHINE something it keeps and uses afterwards
-- instead of renting a machine for four days. So it counts, and it is kept.
--
-- It does not, however, add $750 to the weekend. The sheet already holds
-- $1,500 for "Barista and espresso equipment", and that allocation is what
-- contemplated the coffee setup. The machine becomes detail inside it: named,
-- kept, and counted once. What the remaining $750 of that allocation is for
-- is not established anywhere, so nothing here says. It stays $1,500 and the
-- machine stays $750 inside it.
--
-- The equipment that is outside the budget is the PA: the speaker and the
-- microphones, $830 between them. They stay in Spark because they are bought
-- for this weekend and SHINE keeps them, which is exactly the case the two
-- separate fields exist to describe.
--
-- Guarded on id, label and amount, so a hand edit since is left alone rather
-- than overwritten, and re-running changes nothing.

do $$
declare
  eng uuid;
  barista uuid;
  changed integer;
begin
  select e.id into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = 'shine' and e.slug = 'founders-weekend-2026';
  if eng is null then
    raise notice 'SHINE engagement not present, nothing to correct';
    return;
  end if;

  select id into barista
    from public.budget_lines
   where engagement_id = eng
     and label = 'Barista and espresso equipment'
     and planned_cents = 150000
     and parent_id is null;

  if barista is null then
    raise notice 'the $1,500 barista allocation is not as expected, nothing corrected';
    return;
  end if;

  /* Inside the budget, inside that allocation, and kept afterwards. */
  update public.budget_lines
     set counts_toward_budget = true,
         reusable = true,
         parent_id = barista,
         reuse_note = coalesce(reuse_note, 'SHINE office and future events')
   where engagement_id = eng
     and label = 'Espresso machine'
     and planned_cents = 75000
     and parent_id is null;
  get diagnostics changed = row_count;
  raise notice 'espresso machine: % row(s) placed inside the barista allocation', changed;

  /* Outside the budget, kept afterwards, and still bought for this weekend. */
  update public.budget_lines
     set counts_toward_budget = false,
         reusable = true,
         reuse_note = coalesce(reuse_note, 'SHINE office and future events')
   where engagement_id = eng
     and label in ('JBL speaker', 'Microphones')
     and reusable = false;
  get diagnostics changed = row_count;
  raise notice 'PA equipment: % row(s) marked kept and outside the budget', changed;
end $$;
