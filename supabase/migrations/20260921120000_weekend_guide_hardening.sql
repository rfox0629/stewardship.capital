-- The team's detail is not the public's to ask for.
--
-- Supabase's default privileges grant every new public table to anon as well
-- as authenticated. Row level security already returns nothing to a signed
-- out caller, but a table that holds owners, internal notes and setup detail
-- should refuse at the table, not only at the row. Guests read the weekend
-- through weekend_guide(), which never touches this table.

revoke all on public.schedule_item_ops from anon;
