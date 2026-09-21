-- The family's name is Wanyonyi. Two SHINE rows carried it as "Wanyoni":
-- the bingo moment's title and the support line on the Wednesday setup cue.
-- Scoped to the SHINE engagement and to those two rows by id, and each update
-- must touch exactly one row or the whole migration rolls back.

do $$
declare
  shine constant uuid := 'c4c371a6-6378-4f80-9d78-f9a6359ae8db';
  n integer;
begin
  update public.schedule_items
     set title = regexp_replace(title, 'Wanyoni(?!yi)', 'Wanyonyi', 'g')
   where id = '995c6b13-6c34-421a-8c36-d138aeb9459c'
     and engagement_id = shine
     and title ~ 'Wanyoni(?!yi)';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'bingo title: expected 1 row, updated %', n; end if;

  update public.schedule_item_ops
     set detail = jsonb_set(detail, '{support}',
           to_jsonb(regexp_replace(detail->>'support', 'Wanyoni(?!yi)', 'Wanyonyi', 'g'))),
         updated_at = now()
   where schedule_item_id = 'b1f0a5d2-0f4a-4b1e-9c1a-2d5f3a7c9201'
     and engagement_id = shine
     and detail->>'support' ~ 'Wanyoni(?!yi)';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'setup support: expected 1 row, updated %', n; end if;

  if exists (select 1 from public.schedule_items where engagement_id = shine and title ~* 'wanyoni(?!yi)')
     or exists (select 1 from public.schedule_item_ops where engagement_id = shine and detail::text ~* 'wanyoni(?!yi)')
  then raise exception 'a misspelling remains'; end if;
end $$;
