-- Two clients and five people, so isolation can be observed rather than assumed.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','ryan@stewardship.capital'),
  ('22222222-2222-2222-2222-222222222222','megan@shine.co'),
  ('33333333-3333-3333-3333-333333333333','guest@shine.co'),
  ('44444444-4444-4444-4444-444444444444','lena@redeemercollective.org'),
  ('55555555-5555-5555-5555-555555555555','nobody@example.com')
on conflict do nothing;

insert into public.organizations (slug, name) values ('redeemer-collective','Redeemer Collective')
on conflict (slug) do nothing;

insert into public.engagements (organization_id, slug, name, series_slug, edition_label, status)
select id,'leaders-retreat-2027','Leaders Retreat 2027','leaders-retreat','2027','planning'
from public.organizations where slug='redeemer-collective'
on conflict (organization_id, slug) do nothing;

insert into public.platform_staff (user_id) values ('11111111-1111-1111-1111-111111111111')
on conflict do nothing;

insert into public.workspace_members (engagement_id, user_id, role)
select e.id, v.uid::uuid, v.role from public.engagements e
join (values
  ('founders-weekend-2026','11111111-1111-1111-1111-111111111111','planner'),
  ('founders-weekend-2026','22222222-2222-2222-2222-222222222222','client'),
  ('founders-weekend-2026','33333333-3333-3333-3333-333333333333','stakeholder'),
  ('leaders-retreat-2027','44444444-4444-4444-4444-444444444444','planner')
) as v(slug, uid, role) on v.slug = e.slug
on conflict (engagement_id, user_id) do nothing;

insert into public.sparks (engagement_id, title, category, status)
select id, initcap(split_part(slug,'-',1))||' spark','Experience','captured' from public.engagements;

insert into public.budget_lines (engagement_id, category, label, planned_cents)
select id,'Venue and lodging', initcap(split_part(slug,'-',1))||' venue', 1000000 from public.engagements;

insert into public.schedule_items (engagement_id, day_key, starts_label, title, track, status)
select id,'thu','3:00 pm','Confirmed arrival','Hospitality','confirmed' from public.engagements where slug='founders-weekend-2026';
insert into public.schedule_items (engagement_id, day_key, starts_label, title, track, status)
select id,'fri','8:45 am','Draft devotional','Program','draft' from public.engagements where slug='founders-weekend-2026';

insert into public.invitations (engagement_id, email, role, token_hash, expires_at)
select id,'sam@shine.co','client','hash-abc', now() + interval '14 days'
from public.engagements where slug='founders-weekend-2026';
