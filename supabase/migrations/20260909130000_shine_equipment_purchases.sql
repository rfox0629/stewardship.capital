-- The three things SHINE is buying and keeping.
--
-- Straight off the purchasing sheet: a speaker, microphones, and an espresso
-- machine, all bought online, none assigned to anybody yet, none with a link
-- on the sheet. Nothing here is inferred. Where the sheet says nothing, the
-- column stays null rather than being filled in with something plausible.
--
-- They go in the equipment ledger, so they are planned and tracked without
-- moving the weekend's own numbers: the fourteen event lines, the working
-- total of $55,500 and the $4,500 remaining are all untouched by this.
--
-- The espresso machine is flagged against the existing $1,500 "Barista and
-- espresso equipment" line. That line is not edited and the machine is not
-- taken out of anything. The flag says only that the two may be the same
-- money and that Ryan has to decide which, because the sheet does not say
-- what the event-only barista cost would be without the machine, and
-- inventing that number would be worse than leaving the question open.
--
-- Guarded by label within the equipment ledger, so re-running changes
-- nothing and a hand edit since is left alone.

do $$
declare
  eng uuid;
  barista uuid;
  espresso uuid;
  added integer := 0;
begin
  select e.id into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = 'shine' and e.slug = 'founders-weekend-2026';
  if eng is null then
    raise notice 'SHINE engagement not present, nothing to add';
    return;
  end if;

  insert into public.budget_lines
    (engagement_id, ledger, category, label, planned_cents, status, vendor)
  select eng, 'equipment', 'Equipment', v.label, v.cents, 'to_buy', 'Online'
    from (values
      ('JBL speaker',      70000::bigint),
      ('Microphones',      13000::bigint),
      ('Espresso machine', 75000::bigint)
    ) as v(label, cents)
   where not exists (
     select 1 from public.budget_lines b
      where b.engagement_id = eng and b.ledger = 'equipment' and b.label = v.label
   );

  get diagnostics added = row_count;
  raise notice 'added % equipment line(s)', added;

  /* Raise the overlap, once, and only while both lines are as expected. */
  select id into barista
    from public.budget_lines
   where engagement_id = eng and ledger = 'event'
     and label = 'Barista and espresso equipment' and planned_cents = 150000;

  select id into espresso
    from public.budget_lines
   where engagement_id = eng and ledger = 'equipment' and label = 'Espresso machine';

  if barista is not null and espresso is not null then
    update public.budget_lines
       set review_of = barista
     where id = espresso and review_of is null;
  else
    raise notice 'barista or espresso line not as expected, overlap not flagged';
  end if;
end $$;
