-- Questions in the product's own words, and answers that survive.
--
-- Two problems, both visible to the team.
--
-- The questions still spoke about where they came from. A planning tool
-- should not talk about the spreadsheet it was seeded from, so each one is
-- rewritten as the question a person would actually ask, with the condition
-- or caveat moved into the idea's description. The intent is unchanged and
-- nothing is answered here.
--
-- And an answered question simply vanished, taking the reasoning with it.
-- An answer now has somewhere to live, so clearing a question records what
-- was decided instead of forgetting it.

alter table public.sparks
  add column if not exists question_answer text;

comment on column public.sparks.question_answer is
  'What was decided about open_question. Kept after the question is cleared, '
  'so the reasoning outlives the flag.';

do $$
declare
  eng uuid;
begin
  select e.id into eng
  from public.engagements e
  join public.organizations o on o.id = e.organization_id
  where o.slug = 'shine' and e.slug = 'founders-weekend-2026';

  if eng is null then return; end if;

  -- The questions, as a person would ask them. Context that is a condition
  -- rather than a question moves to the description where it belongs.
  update public.sparks set
    open_question = 'What time should guests arrive on Thursday?',
    detail = coalesce(detail, 'Currently thinking somewhere between 6 and 7 PM.')
  where engagement_id = eng and title = 'Guests arrive between approximately 6 to 7 PM?';

  update public.sparks set
    open_question = 'Should we put flowers in the pool?',
    detail = coalesce(detail, 'Weather permitting.')
  where engagement_id = eng and title = 'Flowers in the pool?';

  update public.sparks set
    open_question = 'Is it $25 per tent?',
    detail = coalesce(detail, 'The cost per tent is not confirmed.')
  where engagement_id = eng and title = 'Build the Tent race';

  update public.sparks set
    open_question = 'Whose favorite things is this, and what should it be called?'
  where engagement_id = eng and title = 'Bingo of Waypoint/Waymani''s favorite things';

  update public.sparks set
    open_question = 'What is this, and what should it be called?'
  where engagement_id = eng and title = '$1 Billion Balloon Decor';

  -- Everywhere else the seeding showed through.
  update public.budget_lines
  set note = 'Amount still to be determined.'
  where engagement_id = eng and note ~* '(sheet|spreadsheet|source)';

  update public.sparks
  set detail = 'Sunday carries no program.'
  where engagement_id = eng and title = 'Sunday programming';

  update public.schedule_items
  set note = null
  where engagement_id = eng and note ~* '(sheet|spreadsheet|source)';

  update public.resources
  set detail = null
  where engagement_id = eng and detail ~* '(sheet|spreadsheet|source)';
end $$;
