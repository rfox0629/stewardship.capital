# Spark access

Supabase Auth answers *who are you*. Spark answers *what may you reach*. They
are kept apart on purpose: an identity can outlive an engagement, and taking
someone off an engagement must not require ending their identity.

## The shape of it

| Question | Answered by | Where |
| --- | --- | --- |
| Is this a verified person? | Supabase Auth | the session cookie, verified by PostgREST on every call |
| What may they reach right now? | `public.my_access()` | read fresh on every protected request |
| May this request proceed? | `authorizeSparkPath` | `proxy.ts`, before any screen renders |
| May this row be read or written? | Row level security | the database, underneath everything |

Nothing about engagement access is carried in the identity token. That is the
whole reason revocation is immediate.

## Routes

| Route | Who |
| --- | --- |
| `/spark` | anyone. The front door, and where every refusal lands |
| `/spark/i/<token>` | anyone holding a live invitation |
| `/spark/auth/callback` | anyone completing verification from an emailed link |
| `/spark/signout` | anyone |
| `/spark/platform` | explicit platform staff only |
| `/spark/c/<client>/…` | current members of that engagement, and staff |

`/more` redirects to `/spark`. When Stewardship.Capital has more than one
public product, `/more` becomes the directory of them and `/spark` does not
move.

## Configuration

`.env.local`, and the same four in the Vercel project:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
SPARK_DATABASE_URL
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses row level security. It is used in exactly
one place in the request path, to find an invitation by token hash before
anyone is signed in, and it is never used to decide access.

`SPARK_DATABASE_URL` is only for the migration and verification scripts. The
running application never uses it.

There is no `SPARK_SESSION_SECRET` any more. Spark no longer signs anything of
its own.

### Configuring it in one run

All five production settings are settable through the Management API:

```
npm run auth:configure
```

Needs `SUPABASE_ACCESS_TOKEN` in `.env.local`, a personal access token from
supabase.com/dashboard/account/tokens. With only the token set it applies
four of the five: signup off, site URL and redirect list, the magic link
template with the code, and the verification and OTP request rate limits.
Once the `SPARK_SMTP_*` values are also in `.env.local`, rerunning it
configures the sender and raises the email rate limit. It reads every value
back and refuses to report success unless what it wrote is what is there.

The table below stays as the reference for what correct looks like.

### Supabase dashboard

Correct application code proves nothing about the project it runs against.
Run the audit, which reads back what it can and names what it cannot:

```
npm run audit:auth
```

Everything below was found by that audit or is listed there as unreadable.

**Authentication → Sign In / Providers → Email**

| Setting | Required | Why |
| --- | --- | --- |
| Allow new users to sign up | **Off** | Spark is invitation only. With this on, anyone can create an account straight against the Auth API. They cannot reach a workspace, because that needs membership, but they should not get an account either. |
| Confirm email | On | An address must be proved read before it is an identity. |
| Email OTP Length | **8** | Six digits is a million possibilities, and the verification rate limit has to be raised for shared venue wifi. Lengthen the code first so the higher limit buys a guesser nothing. |
| Email OTP Expiration | **600** seconds | Ten minutes is long enough to walk to a laptop and short enough that a guesser gets few attempts per live code. |

Turning signup off does **not** break invitations. An invited address that has
no account yet is created deliberately with the service role in
`ensureAccountExists`, only when a live invitation for that exact address
exists. Account creation is a consequence of being invited, not a public door.

**Authentication → URL Configuration**

| Setting | Required |
| --- | --- |
| Site URL | The production origin, e.g. `https://stewardship.capital`. The audit found `http://localhost:3000`, which would send every emailed link to a machine that is not there. |
| Redirect URLs | The production origin and any preview origin, each with `/spark/auth/callback`. The allow list already refuses unknown hosts, which is what stops an emailed link carrying a verified session to somebody else's domain. Keep it that way. |

**Authentication → Emails → Magic Link**

The template must contain the code, or nobody can sign in. This serves both
the typed code and the tapped link:

```html
<p>Your Spark code is <strong>{{ .Token }}</strong></p>
<p>
  Or <a href="{{ .SiteURL }}/spark/auth/callback?token_hash={{ .TokenHash }}&type=magiclink">open Spark directly</a>.
</p>
```

**Authentication → Rate Limits**

The defaults are per IP, and roughly fifty six people on one venue's wifi are
one IP. These are sized for that, not disabled for it.

| Limit | Default | Set to | Why |
| --- | --- | --- | --- |
| Token verifications | 30 / 5 min | **150 / 5 min** | Every code entry. Fifty six guests signing in at the opening session, allowing a couple of attempts each. With an eight digit code, 1800 attempts an hour against a code that lives ten minutes is about a three in ten million chance of a hit. |
| Sign in / sign up (OTP requests) | 30 / 5 min | **100 / 5 min** | Every request for a code, including the ones people ask for twice. |
| Token refresh | 1800 / hour | leave | One refresh per person per hour of use. Nowhere near it. |
| Emails | 2 / hour | **100 / hour**, after SMTP below | Only meaningful once a real sender is configured. |

**Project → Authentication → SMTP Settings**

The built in sender allows two emails an hour across the whole project and is
explicitly not for production. Nothing in Spark works at event scale without a
real sender.

| Field | Value |
| --- | --- |
| Enable Custom SMTP | On |
| Sender email | An address on a domain you control, e.g. `spark@stewardship.capital` |
| Sender name | Spark |
| Host / Port | Your provider's, 587 with STARTTLS |
| Username / Password | The provider's API credentials |

Then raise the email rate limit above. **No application change is required**;
Spark already sends every email through Supabase, so configuring SMTP is
entirely a dashboard change.

Before the first real invitation, verify the sending domain with SPF, DKIM and
DMARC records at your DNS provider. An invitation that lands in spam is an
invitation that did not arrive.

## Required before the first real invitation

The four findings from the independent architecture review are resolved:

| # | Finding | Resolution |
| --- | --- | --- |
| F1 | The route triple was derived but nothing made it unique | `engagements_route_triple_idx`, a unique index on the derived triple, applied to production |
| F2 | Legacy `/dashboard` admitted any Spark identity | Parked behind the explicit `platform_staff` grant in the proxy |
| F3 | `/spark/signout` aliased GET to POST | Alias removed; signing out is a POST only |
| F4 | The front door answered fast for unknown addresses and slow for known ones | The send is awaited so failures are honest, and every response is padded to the same floor, so a refusal and a slow SMTP handoff are indistinguishable from outside |

What still gates the first invitation is the dashboard configuration above:
signup off, the production site URL, the email template, rate limits, and SMTP.

One permanent rule, learned the expensive way: the production RLS suite once
ran a planner mutation scoped to the whole engagement, which was harmless
while the engagement was empty and flattened fourteen real spark statuses the
day it was not. SHINE Founders Weekend is real client data now. Automated
tests never write into it, never seed rows into it, and never rely on any
production table being empty: every production suite creates its own
organizations stamped with a per run id, mutates only inside them, tears down
by captured id, and proves the SHINE fingerprint
(`scripts/shine-fingerprint.sh`) unchanged before it may pass. Isolation that
cannot be established is a refusal to run, not a fallback.

## Inviting someone

```
npm run spark:invite -- sam@shine.co shine founders-weekend-2026 client
```

Prints the link once. Only the hash is stored, so that output is the only copy
that will ever exist; losing it means minting another, not looking it up.

Roles are `planner`, `client`, `stakeholder`. A planner runs one engagement.
Reaching across clients is `platform_staff`, granted deliberately in the
database and never implied by a role.

## Checking it still holds

```
npm test              # the pure authorization decision, no network
npm run test:rls:prod # isolation, against the real schema
npm run test:auth     # the whole flow, against the real app over HTTP
```

`test:auth` builds, starts the production server on its own port, creates
throwaway identities, asserts, and removes everything it made.

One rule those suites keep, learned the hard way: row level security filters
`UPDATE` and `DELETE` silently rather than raising. A call that returns no
error has not necessarily written anything. Every mutation assertion measures
rows actually affected.
