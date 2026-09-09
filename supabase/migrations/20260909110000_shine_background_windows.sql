-- The four stretches of this weekend that other things happen during.
--
-- Wednesday's arrival runs from ten until quarter past two while vans are
-- unloaded and rooms assigned. Thursday's setup runs all day up to the moment
-- guests appear. Friday and Saturday keep an afternoon open on purpose, and
-- the bingo already sitting inside Friday's is not a clash with it.
--
-- Each is addressed by id and guarded on the title and the hours it is
-- expected to be holding, so a hand edit since leaves it alone rather than
-- being overwritten. Nothing else is touched: the brief named these four, and
-- deciding that anything else is a window is a planning judgement.

do $$
declare
  eng uuid;
  changed integer;
begin
  select e.id into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = 'shine' and e.slug = 'founders-weekend-2026';
  if eng is null then
    raise notice 'SHINE engagement not present, nothing to mark';
    return;
  end if;

  update public.schedule_items set display_mode = 'background'
   where engagement_id = eng
     and display_mode = 'normal'
     and (
       (id = 'b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9201'  -- Wednesday
        and title = 'Team Arrival'
        and starts_label = '10:00 am' and ends_label = '2:15 pm')
    or (id = 'b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9101'  -- Thursday
        and title = 'Final setup and guest arrival preparation'
        and starts_label = '7:00 am' and ends_label = '6:00 pm')
    or (id = '98dc6592-07ac-4a22-bc56-e3c414be1a9b'  -- Friday
        and title = 'Free time'
        and starts_label = '1:00 pm' and ends_label = '4:00 pm')
    or (id = '56aa5c99-767d-4281-988c-8be40de8e17e'  -- Saturday
        and title = 'Free time'
        and starts_label = '1:00 pm' and ends_label = '4:00 pm')
     );

  get diagnostics changed = row_count;
  raise notice 'marked % moment(s) as background windows', changed;
end $$;
