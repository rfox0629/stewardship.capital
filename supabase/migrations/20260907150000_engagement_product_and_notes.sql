-- Which product, if any, an engagement runs on; and a place to write.
--
-- Stewardship.Capital engagements come in two kinds. Some run on a product,
-- and today the only product is Spark: the engagement has a schedule, a
-- budget, guests, and the workspace screens that go with them. Others are
-- consulting, advisory, or build work with none of that, and they need a
-- plain place for staff to think out loud. The distinction is one nullable
-- column, not a products table. A product is a namespace and a set of
-- screens, and the code already knows where each one lives.

alter table public.engagements
  add column if not exists product_key text
    check (product_key is null or product_key ~ '^[a-z][a-z0-9-]{1,31}$');

comment on column public.engagements.product_key is
  'The product this engagement runs on: spark, or null for a general Stewardship.Capital engagement. Decides which workspace opens.';

-- The one engagement that exists on Spark today.
update public.engagements e
   set product_key = 'spark'
  from public.organizations o
 where o.id = e.organization_id
   and o.slug = 'shine'
   and e.slug = 'founders-weekend-2026'
   and e.product_key is null;

-- ------------------------------------------------------------------ notes
--
-- Chronological, written by platform staff, read by platform staff. Nothing
-- here is visible to a client or to any engagement member: the notes belong
-- to Stewardship.Capital's own thinking about an engagement, not to the
-- engagement's workspace.

create table if not exists public.engagement_notes (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 20000),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists engagement_notes_engagement_idx
  on public.engagement_notes (engagement_id, created_at desc);

alter table public.engagement_notes enable row level security;

-- Staff may read and add. Nobody edits or removes through the API yet: a
-- note is a record of what was thought at the time.
revoke all on public.engagement_notes from public, anon, authenticated;
grant select on public.engagement_notes to authenticated;
grant insert (engagement_id, title, body) on public.engagement_notes to authenticated;

create policy "engagement_notes_select_staff"
  on public.engagement_notes for select
  to authenticated
  using (public.is_platform_staff());

create policy "engagement_notes_insert_staff"
  on public.engagement_notes for insert
  to authenticated
  with check (public.is_platform_staff() and created_by = (select auth.uid()));

-- The author's address, without opening auth.users to anyone. Same shape as
-- membership_trail: a definer function that makes the staff check itself.
create or replace function public.engagement_notes_for(target uuid)
returns table (id uuid, title text, body text, created_at timestamptz, author_email text)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.title, n.body, n.created_at, u.email::text
  from public.engagement_notes n
  left join auth.users u on u.id = n.created_by
  where n.engagement_id = target
    and public.is_platform_staff()
  order by n.created_at desc;
$$;

revoke all on function public.engagement_notes_for(uuid) from public;
revoke all on function public.engagement_notes_for(uuid) from anon;
grant execute on function public.engagement_notes_for(uuid) to authenticated;
