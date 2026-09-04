# How this ships

Two paths, deliberately separate. Code deploys itself; the database does not.

## The app

```
push to main  ->  GitHub Actions  ->  Vercel  ->  stewardship.capital
```

`.github/workflows/ci.yml` runs lint, typecheck, tests and a build on every
pull request and every push to `main`. It uses placeholder Supabase values and
never contacts Supabase; it proves the code compiles and behaves, nothing
about the project it will run against.

Vercel deploys from GitHub on its own, through Vercel's GitHub integration.
Every pull request gets a preview; `main` gets production. Its three
production environment variables are set by hand in the Vercel dashboard and
are the only Supabase credentials the running app has:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## The database

```
./scripts/apply-migrations.sh        run by a person, on purpose
```

Migrations live in `supabase/migrations` and are applied over a direct
Postgres connection using `SPARK_DATABASE_URL` from `.env.local`. Each one is
recorded in `supabase_migrations.schema_migrations` so it runs exactly once.
`--dry` lists what would run without running it.

Nothing applies a migration automatically. That is the point: this database
holds a real client's working plan, and a schema change is a decision someone
makes while looking at it, not a side effect of merging a branch.

## Supabase integrations, and why they are off

Spark is project `wyesunnskufforgfaegq` in the **Stewardship.Capital**
organization, on the Free plan.

| Integration | State | Why |
| --- | --- | --- |
| Supabase GitHub deploy | **OFF** | The migration script above is the only path. Both write `supabase_migrations.schema_migrations`, so a second writer means double application or drift. The tenancy migration also creates policies, and `create policy` has no `if not exists`, so a blind re-push fails halfway. |
| Supabase branching | **OFF** | Branches consume the Free plan's project allowance, which is the constraint that made the org move awkward in the first place. Nothing in the code uses a branch. |
| Supabase to Vercel env sync | **OFF** | The three variables above are already set correctly by hand. Installing it puts them under Supabase's management and can overwrite them. |

Turning any of these on is an architecture change, not a convenience. If it is
ever wanted, the Supabase working directory for this repository is `.`, since
`supabase/migrations` sits at the root and there is no `config.toml`.

## Access tokens

One command needs a Supabase personal access token, and only one:
`npm run auth:configure`, which writes Auth settings through the Management
API. Put a current token in `.env.local` as `SUPABASE_ACCESS_TOKEN`, issued by
an account with access to the Stewardship.Capital organization. It is never
committed, and the command explains itself if the token is missing, expired,
or from the wrong organization.

Everything else, including `npm run audit:auth`, uses the project URL and keys
and needs no token at all.
