# Stewardship.Capital

Two products share this repository: the public site with Spark, the private
event planning platform, under `/spark`, and a preserved legacy financial
platform under `/dashboard`. `docs/spark-access.md` is the operating manual
for Spark's access model, tests, and dashboard configuration.

## Permanent rules

**Real client data is never touched by automated tests.** The SHINE Founders
Weekend engagement in the production database is a real client's working
planning data. Any test that runs against production must create its own
organizations and engagements stamped with a per run id, write only inside
them, tear down by captured id, and never rely on any production table being
empty. Reading real rows for verification is acceptable; mutating them never
is. Both production suites fingerprint the SHINE engagement before starting
(`scripts/shine-fingerprint.sh`) and fail if the fingerprint changed by the
end. A new production test must follow the same pattern or not exist.

**Mutations are judged by rows affected, never by absence of an error.** Row
level security filters UPDATE and DELETE silently.

**No em dashes in public copy.** Grep before handoff.

**The orange node is Spark's.** Client and event themes set `--ev-*`
variables only; Spark core tokens are structurally out of a theme's reach.

**Push with an explicit source.** `git push origin HEAD:<branch>`. This
worktree's local branch name differs from its remote branch, and a
name-matched push once merged a stale tip. Verify ancestry with
`git merge-base --is-ancestor` before reporting any merge complete.

## Test suites

```
npm test              # pure authorization decisions, no network
npm run test:auth     # full HTTP flow against a local build and production schema
npm run test:rls:prod # RLS isolation, in throwaway per run organizations
npm run audit:auth    # reads back the Supabase Auth project configuration
```
