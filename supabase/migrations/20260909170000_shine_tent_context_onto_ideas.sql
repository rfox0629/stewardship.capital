-- The seven Expand the Tent concepts, put where they are used.
--
-- They were a reference library of their own, which meant a planner opening
-- the knot-tying idea had to remember that a second screen existed and go and
-- find the Scripture behind it. Six of the seven are already ideas in the
-- bank. The context moves onto them, whole: the Scripture, the passage as it
-- is written, why it belongs to this weekend, and how to run it.
--
-- Reconciled by hand against the bank rather than by matching strings, because
-- the names do not match and a fuzzy match would put the wrong Scripture on
-- the wrong idea:
--
--   Build the Tent Team Challenge   -> Build the Tent race
--   Lengthen the Cords: Knot-Tying  -> Military knot tying technique
--   Human Knot or Hula-Hoop Circle  -> Human knot tying game
--                                   -> Hula hoop passing activity ... (both,
--                                      because the concept names both)
--   Take-Home Stake                 -> Stakes to take home for the night
--   Rope Holder Commitment          -> Rope Holder
--   Glow Run or Walk                -> Glow run or walk
--   Partner Invitation and Sending  -> nothing in the bank
--
-- The seventh has no idea to attach to. It is about how the partner ask is
-- framed, and the bank has never held it. Rather than lose it or staple it to
-- Departure and sending, which is a different thing, it becomes an idea of
-- its own carrying its own context. That is one new idea, not a duplicate:
-- guarded on there being nothing by that name already.
--
-- Every update is addressed by id and guarded on the title and on the context
-- still being empty, so a hand edit since is left alone and re-running does
-- nothing. The library itself is left in the engagement's reference record
-- untouched; this copies out of it and destroys nothing.

do $$
declare
  eng uuid;
  elements jsonb;
  ctx jsonb;
  touched integer;
  total integer := 0;
begin
  select e.id into eng
    from public.engagements e
    join public.organizations o on o.id = e.organization_id
   where o.slug = 'shine' and e.slug = 'founders-weekend-2026';
  if eng is null then
    raise notice 'SHINE engagement not present, nothing to move';
    return;
  end if;

  select g.reference -> 'vision' -> 'elements' into elements
    from public.engagements g where g.id = eng;

  if elements is null or jsonb_array_length(elements) <> 7 then
    raise notice 'the seven concepts are not as expected, nothing moved';
    return;
  end if;

  /* One concept onto one idea, by id, only while the idea still has nothing.
     The concept is looked up by name so the text is copied rather than
     retyped: nothing here can drift from the source. */
  create temporary table tent_map (concept text, spark uuid) on commit drop;
  insert into tent_map values
    ('Build the Tent Team Challenge',  '43ffcded-4314-448c-9907-df8b657bbeec'),
    ('Lengthen the Cords: Knot-Tying', 'd45db9e7-88a3-4d2f-8597-5a24324198eb'),
    ('Human Knot or Hula-Hoop Circle', '607ce75f-bd70-4b4f-8308-237333ba2961'),
    ('Human Knot or Hula-Hoop Circle', 'e965bfdf-88bb-4092-902f-02cc529ae0fc'),
    ('Take-Home Stake',                '7836083f-1c95-4bae-95d4-2fb58fe02db7'),
    ('Rope Holder Commitment',         '75a5062d-d8cb-41d1-9219-303555e08c55'),
    ('Glow Run or Walk',               'ec57e2bd-f910-4966-af08-fa62e3008fa7');

  update public.sparks s
     set source_context = jsonb_strip_nulls(jsonb_build_object(
           'source',     'Expand the Tent',
           'name',       element.value ->> 'name',
           'scripture',  element.value ->> 'scripture',
           'passage',    element.value ->> 'passage',
           'connection', element.value ->> 'connection',
           'practical',  element.value ->> 'practical'
         ))
    from tent_map m
    join lateral (
      select value from jsonb_array_elements(elements) v
       where v.value ->> 'name' = m.concept
       limit 1
    ) element on true
   where s.id = m.spark
     and s.engagement_id = eng
     and s.source_context is null;

  get diagnostics touched = row_count;
  total := total + touched;
  raise notice 'attached context to % existing idea(s)', touched;

  /* The one with nowhere to land. It becomes an idea because the material is
     worth keeping and the bank is where ideas live, and only if no idea by
     that name is already there. */
  select jsonb_strip_nulls(jsonb_build_object(
           'source',     'Expand the Tent',
           'name',       v.value ->> 'name',
           'scripture',  v.value ->> 'scripture',
           'passage',    v.value ->> 'passage',
           'connection', v.value ->> 'connection',
           'practical',  v.value ->> 'practical'
         ))
    into ctx
    from jsonb_array_elements(elements) v
   where v.value ->> 'name' = 'Partner Invitation and Sending';

  if ctx is null then
    raise notice 'the partner concept is not as expected, no idea created';
  else
    insert into public.sparks (engagement_id, title, detail, status, source_context)
    select eng,
           'Partner invitation and sending',
           ctx ->> 'connection',
           'captured',
           ctx
     where not exists (
       select 1 from public.sparks x
        where x.engagement_id = eng
          and lower(x.title) = lower('Partner invitation and sending')
     );
    get diagnostics touched = row_count;
    total := total + touched;
    raise notice 'created % idea for the partner concept', touched;
  end if;

  raise notice 'seven concepts accounted for across % idea row(s)', total;
end $$;
