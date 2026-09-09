-- Some moments are windows, not appointments.
--
-- Team arrival runs from ten until quarter past two, and things happen during
-- it: vehicles unload, rooms get assigned, the kitchen gets set up. Free time
-- runs three hours and the bingo inside it is not a conflict. Drawn as an
-- ordinary block, a window like that either buries what happens during it or
-- gets buried by it, and the calendar reads as a collision when it is really
-- a context.
--
-- This is presentation, not identity. It is the same schedule_item, with the
-- same id, spark, cues, actions, requirements and costs, drawn behind rather
-- than among. Nothing about a window's relationships is implied by it: a
-- moment sitting over one is simply a moment at that hour, and moving either
-- leaves the other alone.
--
-- Additive and defaulted, so every existing row keeps behaving exactly as it
-- does today until somebody says otherwise.

alter table public.schedule_items
  add column if not exists display_mode text not null default 'normal';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.schedule_items'::regclass
       and conname = 'schedule_items_display_mode_check'
  ) then
    alter table public.schedule_items
      add constraint schedule_items_display_mode_check
      check (display_mode in ('normal', 'background'));
  end if;
end $$;

comment on column public.schedule_items.display_mode is
  'How the moment is drawn, never what it is. ''background'' means a window '
  'of the day that other moments happen during, drawn behind them and never '
  'capturing their clicks. It implies no parent relationship: what sits over '
  'a window is related to it only by the clock.';
