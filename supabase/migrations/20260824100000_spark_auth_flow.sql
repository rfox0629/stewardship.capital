-- Spark authentication and invitation lifecycle.
--
-- Supabase Auth answers who someone is. These two functions answer what that
-- identity may reach, and how an invitation turns into membership.
--
-- Both are security definer so they can read auth.users and cross the
-- membership tables, and both pin search_path empty so a shadowing schema
-- cannot capture them. Neither trusts an argument for identity: the caller is
-- always auth.uid(), never something the application passes in.

-- ------------------------------------------------------------- my_access

-- Everything the request level guard needs, in one round trip.
--
-- Returns only the caller's own memberships, so it is safe to call on every
-- protected request and it can never enumerate the platform. This is what
-- makes revocation immediate: the guard asks the database on each request
-- rather than trusting a claim baked into the identity token.
--
-- It also returns the verified identity, which means the guard needs exactly
-- one round trip. Reaching this function at all proves the access token was
-- signed and unexpired, because PostgREST verified it before the call ran, so
-- a separate identity check would establish nothing this has not already.
create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', (select auth.uid()),
    'email', (select u.email from auth.users u where u.id = (select auth.uid())),
    'staff', public.is_platform_staff(),
    'workspaces', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'engagement_id', e.id,
          'role', m.role,
          'client_slug', o.slug,
          'client_name', o.name,
          'event_slug', coalesce(e.series_slug, e.slug),
          'edition_slug', coalesce(e.edition_label, 'current'),
          'engagement_name', e.name
        )
        order by o.name, e.starts_on nulls last
      )
      from public.workspace_members m
      join public.engagements e on e.id = m.engagement_id
      join public.organizations o on o.id = e.organization_id
      where m.user_id = (select auth.uid())
    ), '[]'::jsonb)
  )
  where (select auth.uid()) is not null;
$$;

-- ----------------------------------------------------- accept_invitation

-- Turns an invitation into membership, once.
--
-- The raw token never reaches the database. The application hashes it and
-- passes the hash, so a row read cannot produce a working link.
--
-- Single use is the UPDATE itself rather than a check followed by a write:
-- only the first caller to flip accepted_at gets a row back, so two
-- simultaneous acceptances cannot both succeed.
--
-- The email predicate is inside that same statement, which means redeeming
-- someone else's invitation does not merely fail, it does not consume the
-- invitation either. The rightful person can still accept it afterwards.
create or replace function public.accept_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_engagement uuid;
  v_role text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  update public.invitations i
     set accepted_at = now(),
         accepted_by = v_uid
   where i.token_hash = p_token_hash
     and i.accepted_at is null
     and i.revoked_at is null
     and i.expires_at > now()
     and lower(i.email::text) = lower(v_email)
  returning i.engagement_id, i.role into v_engagement, v_role;

  -- Unknown, expired, revoked, already accepted, and addressed to someone
  -- else all answer the same way. The caller learns nothing about which.
  if v_engagement is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  insert into public.workspace_members (engagement_id, user_id, role)
  values (v_engagement, v_uid, v_role)
  on conflict (engagement_id, user_id) do update set role = excluded.role;

  return jsonb_build_object(
    'ok', true,
    'engagement_id', v_engagement,
    'role', v_role
  );
end;
$$;

-- ---------------------------------------------------------------- grants

revoke all on function public.my_access() from public;
revoke all on function public.accept_invitation(text) from public;

grant execute on function public.my_access() to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
