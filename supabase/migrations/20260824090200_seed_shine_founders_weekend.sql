-- The first client, as data rather than as architecture.
--
-- SHINE is an organization. Founders Weekend 2026 is one engagement belonging
-- to it, grouped by a series so a 2027 edition is another row here and nothing
-- more. No membership is seeded: people are granted access through an
-- invitation once they have a Supabase identity.

insert into public.organizations (slug, name, tagline, theme)
values (
  'shine',
  'SHINE',
  'A community of Christian founders learning to hold their companies with open hands.',
  '{"accent": "#c2762c"}'::jsonb
)
on conflict (slug) do nothing;

insert into public.engagements (
  organization_id, slug, name, series_slug, edition_label, campaign, summary,
  status, starts_on, ends_on, location, venue,
  budget_total_cents, guests_expected, theme
)
select
  o.id,
  'founders-weekend-2026',
  'Founders Weekend 2026',
  'founders-weekend',
  '2026',
  'Enlarge the Tent',
  'A long weekend at the lake for founders and their families.',
  'planning',
  date '2026-10-01',
  date '2026-10-04',
  'Spooner, Wisconsin',
  'Northwoods Lodge on Long Lake',
  6000000,
  56,
  '{"canopy": "#1d4034", "water": "#12303c", "ember": "#d8752f", "bark": "#4a3626", "mist": "#e8e2d4"}'::jsonb
from public.organizations o
where o.slug = 'shine'
on conflict (organization_id, slug) do nothing;
