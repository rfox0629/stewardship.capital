# Spark Access Model v1

Companion to `spark-design-system-v1.md`. That document covers the identity.
This one covers the thing the identity is protecting.

## The principle

From founder direction on USA-184:

> Stewardship Events must remain an expert led event planning service supported
> by a proprietary operating system. Do not design or position this as self
> service event planning software.

A positioning statement is not an architecture. If every screen is reachable by
everyone and only the marketing copy says otherwise, the product is self service
software with a service story attached to it. So access is a first class concept
in the code rather than a permission bolted on later.

## Three lenses

| Lens | Who | What it is for |
| --- | --- | --- |
| `planner` | Brooke and Ryan | The whole engine |
| `client` | SHINE leadership | Submit, review, decide, approve, see what is settled |
| `stakeholder` | Guests and speakers | What concerns them, and nothing else |

One file, `_lib/viewer.ts`, says what each lens can reach. Navigation, route
guards, and the event home all read it, so a section can never appear in the nav
that the same lens is refused at the route.

```
                        planner   client   stakeholder
  Event home               x        x           x
  Sparks                   x        x
  This week                x        x
  Event plan               x
  Schedule                 x        x           x
  Budget                   x        x
  Tasks                    x
  Run of show              x
  Resources                x        x
  Impact review            x        x

  Platform index           x
  Client index             x
```

Ten sections for a planner, seven for a client, two for a guest.

## The rule that makes it a service

**Changes stay proposed until a planner confirms them.** A client can discuss,
weigh in, and approve. No lens other than planner can move something from
proposed to confirmed. The word on the badge changes with the lens for the same
reason: a planner sees `draft`, a client sees `proposed`. The word says who is
holding the pen.

## What each lens does not get, and why

**A client does not get tasks, the event plan, or the run of show.** These are
the planners doing their job. Publishing them teaches the client to plan the
event themselves, which is the failure mode the founder direction named.

**A client does not get budget line detail.** They get every category rollup,
planned, committed, and actual. They do not get vendor terms or line by line
tradeoffs. They can see exactly where the money stands without being handed the
negotiating position.

**A client does not get parked or declined sparks.** That is where the planners'
working reasoning lives. A client who reads every rejection starts relitigating
decisions rather than trusting them. What was decided still reaches them, in the
weekly meeting, from a person.

**A guest gets confirmed items only.** No drafts, no money, no owner names.
Someone arriving on Thursday needs to know when to arrive, where to go, and who
to ask. Everything else on this platform is noise to them.

**Neither gets the platform or client index.** A client team belongs to one
event and a guest belongs to one weekend. Neither has any business seeing a list
of other people's gatherings, so those surfaces are not gated by a check on the
data, they simply are not part of those lenses.

## Where the filtering happens

On the server, always.

The sparks board is a client component. Anything handed to it as a prop is
serialized into the page whether or not it renders, so filtering at render time
would have shipped every declined idea to the browser while showing none of
them. `sparkVisibleTo` is applied in the page before the board is given
anything. This was caught by a smoke test asserting on response bodies rather
than on what the screen looked like, and it is the reason that test exists.

## Refusal reads as a boundary, not a fault

A 404 would be a lie and an error would read as a break. A refused section says
the true thing: it exists, the planners work in it, and it is not part of this
view. The service showing its shape rather than hiding it.

## The lens control

Under the section nav, in a strip marked as preview, sits a Planner / Client
team / Guest control.

**This does not ship.** In the real product who you are is settled at sign in
and you never see the other lenses. It exists because a founder review has to be
able to walk the same event three ways, and reading three descriptions of an
access model is not the same as looking through it.

It sits in the preview strip rather than in Spark's top bar deliberately, so the
bar in this preview is the bar that ships and the one thing that does not ship
is in a strip that says so. It is a form posting to a server action, so the lens
resolves before anything renders and no screen ever flashes content the current
lens is not entitled to.

## What this is not yet

No auth. The lens is a cookie, not an identity. Adding real per client access
control means replacing `readViewer` with a session lookup and nothing else:
every guard already calls through it.

Nothing persists. Seeded preview data only, and no sensitive financial data was
created or migrated.
