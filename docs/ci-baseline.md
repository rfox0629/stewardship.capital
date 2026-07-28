# CI Baseline

USA-93 adds the strongest safe baseline currently supported by this repository.

## Required checks

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## CI environment

The build receives dummy non-production Supabase public values so configuration guards can run without exposing credentials.

## Skipped checks

- Unit tests are skipped because this repository does not include a unit test runner or test setup.
- Playwright smoke tests are skipped because this repository does not currently include Playwright.
