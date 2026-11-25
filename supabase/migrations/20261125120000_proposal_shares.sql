-- Authorized sharing of a client proposal.
--
-- A proposal lives on the platform, behind the staff grant. The people it is
-- for are not staff, so staff issue a share: a random token whose hash is kept
-- here, with who it is for and when it stops working. The link opens the
-- proposal and nothing else. It grants no membership, reaches no workspace,
-- and reads no ministry data; the proposal's demo runs on fixture data in
-- code. Revoking a share ends the link at once.
--
-- The same shape as invitations: only the hash is stored, so reading this
-- table cannot produce a working link.

create table if not exists public.proposal_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  proposal_slug text not null check (proposal_slug ~ '^[a-z][a-z0-9-]{1,63}$'),
  label text not null check (char_length(label) between 1 and 120),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  opened_count integer not null default 0,
  last_opened_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.proposal_shares is
  'Tokenised links that open one client proposal for someone who is not platform staff. Hash only; the raw token is shown once.';

create index if not exists proposal_shares_organization_idx
  on public.proposal_shares (organization_id, proposal_slug, created_at desc);

alter table public.proposal_shares enable row level security;

-- Staff issue, read, and revoke. Nobody else sees the table through the API;
-- the share route finds a row by hash under the service role, as the
-- invitation route does, and never lists.
revoke all on public.proposal_shares from public, anon, authenticated;
grant select on public.proposal_shares to authenticated;
grant insert (organization_id, proposal_slug, label, token_hash, expires_at)
  on public.proposal_shares to authenticated;
grant update (revoked_at) on public.proposal_shares to authenticated;

create policy "proposal_shares_select_staff"
  on public.proposal_shares for select
  to authenticated
  using (public.is_platform_staff());

create policy "proposal_shares_insert_staff"
  on public.proposal_shares for insert
  to authenticated
  with check (public.is_platform_staff() and created_by = (select auth.uid()));

create policy "proposal_shares_revoke_staff"
  on public.proposal_shares for update
  to authenticated
  using (public.is_platform_staff())
  with check (public.is_platform_staff());
