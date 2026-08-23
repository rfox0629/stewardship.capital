# Spark Design System v1

Spark is a product of Stewardship.Capital. It carries that company's design DNA rather than its homepage. See `design-system-v2.md` for the parent.

## The identity

`Spark.` with the same orange node that ends `Stewardship.Capital`. The shared device is how a person can tell the two are related without either explaining it. The node is painted, not set as punctuation, for the same reason it is in the parent: a period at text size does not register.

## The evolved metaphor

In Stewardship.Capital the node is latent capital that attention activates. In Spark the node gains a lifecycle:

> one point commits, connects, and becomes a run

Idea, Decision, Plan, Experience.

The important decision: **this is the status primitive, not decoration.** `NodeState` renders the state of every spark, task, decision, and attention item across the product. The lifecycle is taught by using it, so no screen has to draw a diagram explaining it.

| Form | Meaning |
| --- | --- |
| hollow graphite ring | latent, captured, nothing owed yet |
| hollow orange ring | open, needs a decision, blocked |
| filled orange node | settled, approved, confirmed, done |
| filled orange node with a run | built, and it created downstream work |
| slashed graphite ring | closed, declined or parked |

Two rules hold it together:

- **Form carries state.** Hollow is open, filled is settled.
- **Accent carries activation.** Only something live or needing attention is orange.

## Three layers

```
1  Spark core     --sp-*       never themed by anyone
2  Client theme   --client-*   organisation identity
3  Event theme    --event-*    emotional identity for one gathering
```

Applied as CSS custom properties on wrapper elements, set from the client and edition records. No component knows about any particular client.

**The rule that stops this becoming a white label builder:** the orange node belongs to Spark. Client and event colours dress identity surfaces only, the workspace hero, the client name, the event name, day markers, imagery. System colour, meaning status, activation, and approval, stays Spark orange in every workspace.

So SHINE feels like SHINE, and the product still unmistakably feels like Spark.

| Surface | Owned by |
| --- | --- |
| Navigation, IA, typography, components, motion, status | Spark |
| Client name, client accent | Client |
| Event name, hero imagery, event accent, dates, location | Event |

## Foundation

Graphite, matching the parent: `#0a0b0d` void, `#0d0f12` base, `#121317` raised, `#1f2229` hairlines, `#fafafa` type, `#8a8f98` secondary, `#ff4d00` signal.

Archivo throughout, tabular numerals on every figure. Operational screens are graphite too, deliberately: a light "documents" mode would have read as two products stitched together.

## Chrome

Three stacked bars became two. The identity bar carries the Spark mark and the client and event as a control rather than a decoration. The section nav sits beneath it. A quiet `Powered by Spark.` closes the workspace.

## First instance

SHINE, Founders Weekend 2026. Copper client accent, lakefront event scene, ember event accent. Redeemer Collective's Leaders Retreat 2027 runs the identical chassis in indigo with a spring palette, which is the proof that nothing is hard coded to SHINE.

## What did not change

The Platform, Client, Event, Edition architecture. The Spark, Discuss, Approve, Build, Confirm, Reflect workflow. The four question event home. The data model and the `_lib/store.ts` boundary. Those were product decisions, and a rebrand should not relitigate them.

## Who is looking

Three lenses, planner, client team, and guest, are now structural rather than a
positioning statement. Nav, route guards, and the event home all read one access
table, and refusal reads as a boundary rather than a fault. See
`spark-access-model-v1.md`.

The event home answers four questions in every lens, but not the same four. A
planner is at work. A client is being asked to decide. A guest is being
welcomed. The emotional layer warms accordingly, from the same components, off a
single `data-sp-lens` attribute on the wrapper.

## Open

- Event imagery is still generated from the edition theme. `EventScene` is a stand in for real photography, and the scrim is already tuned for it.
- The route is still `/events-os`. Moving it to its own domain and repository is unchanged from `stewardship-events-architecture-v1.md`, and `EVENTS_OS_BASE` is still the only place a route prefix is written.
- Nothing persists. Seeded preview data only.
