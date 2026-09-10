-- Where an idea came from, travelling with the idea.
--
-- Some ideas are somebody's thought and carry nothing behind them. Others
-- came out of source material that says what they mean: the Scripture behind
-- a knot-tying illustration, the passage itself, why it belongs to this
-- weekend, and how to actually run it. That context is useless in a library
-- the planner has to go and find. It belongs on the idea, and it should still
-- be there when the idea becomes a moment on the calendar.
--
-- jsonb rather than four columns, because the four fields are what one source
-- happens to carry. A different source will carry different ones, and adding
-- them should not be a migration. The interface renders the keys it knows and
-- ignores the rest, so nothing is ever silently dropped from the record.
--
-- Additive and nullable. An idea with nothing behind it stays exactly as it
-- is, which is most of them.

alter table public.sparks
  add column if not exists source_context jsonb;

comment on column public.sparks.source_context is
  'The material this idea came out of, kept on the idea rather than in a '
  'library somebody has to go and open. Shape follows the source: the Expand '
  'the Tent concepts carry scripture, passage, connection and practical. '
  'Read only in the product; it records where an idea came from and is never '
  'a second place to plan.';
