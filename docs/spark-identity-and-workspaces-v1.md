# Spark Identity and Workspaces v1

How someone gets into Spark, and what they can reach once they are in.

This is the layer above the viewer lens model. The two are complementary and use the same role vocabulary:

| Layer | Question it answers |
| --- | --- |
| Identity and workspaces, this document | Are you invited, and which workspace do you belong to? |
| Viewer lens | Given that you are in a workspace, what can you see and change? |

## The philosophy the product is built around

**Capture freely. Discern carefully. Move intentionally.**

A Spark is an idea, not an approval. Ideas have to be easy to write down without anyone having to decide yet whether they should happen. Only after approval does a Spark become operational and create schedule items, budget lines, tasks, run of show cues, and supplies.

That separation is structural in the data model, not a convention. A `Spark` carries a status and a `builds` list. Nothing downstream exists until the spark is approved, and everything that is created keeps a link back to the spark that caused it.

## Invitation only

There is no public signup, and no route returns a list of clients or workspaces.

An address is entered at `/more`. The server decides whether that address has any way in, through either an existing membership or an outstanding invitation:

- **One workspace.** A session is issued and the person is taken straight into it.
- **More than one.** A private selector shows only that person's own workspaces. The choice is made against a short lived signed cookie holding the address, so the second step never has to trust an identity supplied by the browser.
- **None.** "Spark is invitation only. Ask your Stewardship.Capital contact for access."

Invitation links are `/i/<token>`. They take an invited person through authentication and directly into the workspace they were invited to. An unknown token is not told it is unknown; it goes to the front door like anything else, so the route cannot be used to test which tokens exist.

## The guard

Checking access on the sign in screen alone would be decoration, because anyone could type a workspace URL. Every request into Spark is checked in `proxy.ts`:

- No valid session, refused to `/more`.
- A signed in person can only reach the workspace they belong to. Any other path returns them to their own.
- The planner home lists every client on the platform, so it is planner only. A client is returned to their workspace.

Verified: direct workspace URLs, cross client access, the planner home, forged and malformed session cookies, and sign out.

## What this does and does not secure

Stated plainly, because the gap matters.

**It does:** keep the workspace list private, hold client separation at the route rather than in navigation, reject tampered sessions, and give the operating system a real signed in role instead of a preview toggle.

**It does not yet:**

- **Verify that a person owns the address they typed.** Entering a known address is currently enough. This is the single most important gap, and a magic link or one time code closes it. The seam is `checkAccess` in `app/(www)/more/actions.ts`: the identity it establishes is the only thing the rest of the system trusts.
- **Protect the invitation tokens.** The seeded token is static, reusable, and guessable. Real tokens have to be unguessable, single use, and expiring.
- **Hide whether an address is invited.** The refusal message is a membership oracle by design, because the founder direction asks for that wording. Worth revisiting if it ever matters.
- **Sign sessions with a real secret.** `SPARK_SESSION_SECRET` must be set. Without it the code falls back to a development string that is not a secret; `sessionSecretConfigured()` reports the difference rather than hiding it.

## Shape

```
lib/spark/types.ts       roles, workspace, membership, session
lib/spark/directory.ts   who has access, and where Spark is mounted
lib/spark/session.ts     signing and verification, Web Crypto so the guard can use it
app/(www)/more/actions.ts  checkAccess, chooseWorkspace, signOut
app/i/[token]/route.ts   invitation redemption
app/signout/route.ts     leaves Spark
proxy.ts                 the guard
```

`SPARK_BASE` in `directory.ts` is the one place the public site knows where Spark is mounted, so the operating system stays free to move to its own domain.

## Seeded identities, for review

| Address | Reaches |
| --- | --- |
| `ryan@stewardship.capital` | Planner on both workspaces, so it exercises the selector |
| `brooke@stewardship.capital` | Planner on Shine only, straight in |
| `megan@shine.co` | Client on Shine |
| `guest@shine.co` | Guest on Shine |
| `lena@redeemercollective.org` | Planner on Redeemer Collective |
| anything else | Refused |

Invitation link: `/i/inv-shine-2026-a7f3`, which is a pending client invitation for `sam@shine.co`.

`/signout` clears the session.

## The client layer

`/more` is universally Spark and Stewardship.Capital. No client is the default destination. Shine is simply the first row in the directory, and its workspace carries its own campaign name, **Enlarge the Tent**, alongside the client name in the event hero. A future client is a new row plus their own theme, with nothing in the entry screen to change.
