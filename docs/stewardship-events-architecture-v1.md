# Stewardship Events Architecture v1

Deliverables 1, 2, 3, and 6 of USA-184.

## 1. Architecture recommendation

### Brand and object hierarchy

```
Stewardship Capital          parent company and worldview
  Stewardship Events         product
    Operating System         product category
      Platform               the application itself
        Client               Shine, Redeemer Collective, any future client
          Event              Founders Weekend, Leaders Retreat
            Edition          2025, 2026, 2027
```

Everything operational hangs off **Edition**, never off Event and never off Client. That is the decision that keeps an annual gathering from being rebuilt every year, and it is why the preview already carries two Shine editions and a second client.

### Data model

Implemented in [app/events-os/_lib/types.ts](app/events-os/_lib/types.ts). Every operational record carries `editionId`.

| Entity | Purpose |
| --- | --- |
| `Client` | Owns brand theme and people. |
| `EventDefinition` | The recurring gathering, plus its cadence. |
| `Edition` | One run. Dates, venue, budget total, days, coordinator, emcee, theme, and `reusedFromEditionId`. |
| `Spark` | An idea. Carries status, category, decision, and `builds`. |
| `ScheduleItem` | Day, time, track, location, owner, confirmed or draft. |
| `BudgetLine` | Planned, committed, and actual as three separate numbers. |
| `Task` | Owner, due date, state, area. |
| `Resource` | Vendors and supplies, each with an owner and a secured state. |
| `RunOfShowCue` | Minute level cues attached to a schedule item. |
| `Decision` | The question, who owns it, when it is needed, and the outcome. |
| `MeetingAgenda` | The weekly cadence. Sparks plus decisions. |
| `ImpactReview` | Prepared before the event, completed after, with `carryForward`. |

### The Spark is the spine

`Spark.builds` is a list of `{ kind, refId, label }`. Approving a spark is what creates schedule items, budget lines, tasks, resources, run of show cues, and guest communications, and every one of those keeps a link back to the spark that caused it.

This is the single most important property of the model. Six months later anyone can ask why a budget line exists and get an answer instead of a shrug.

The workflow is enforced by state, not by convention:

```
Spark -> Discuss -> Approve -> Build -> Confirm -> Reflect
captured   discussing  approved/parked/declined   builds   confirmed   review
```

Nothing reaches the confirmed schedule or the committed budget without passing through a decision.

### Simplicity principle in the model

The event home answers four questions and nothing else:

1. What needs attention. Derived in `attentionFor()`, deliberately narrow. Blocked tasks and open decisions are urgent. Draft schedule items, unsecured resources, and uncommitted budget are watch items.
2. What are we deciding this week. Open decisions plus the next meeting agenda.
3. What is confirmed. The first day of the schedule, in full.
4. Are schedule and budget on track. Two numbers and one meter.

Everything else is a focused view reachable from the nav. If the attention list ever gets long, the surface is wrong, not the list.

## 2. Information architecture

```
/events-os                                              Planner, every edition and client
/events-os/c/{client}                                   Client home, events and editions
/events-os/c/{client}/e/{event}/{edition}               Event home
                                            /sparks     Sparks board and quick add
                                   /sparks/{sparkId}    Spark detail and conversion
                                            /meeting    Weekly meeting and decisions
                                            /plan       Event plan
                                            /schedule   Confirmed schedule
                                            /budget     Budget
                                            /tasks      Tasks and owners
                                            /run-of-show Run of show cues
                                            /resources  Vendors and supplies
                                            /review     Impact review and next edition reuse
```

The URL is the hierarchy. `c` and `e` keep client and event slugs in their own namespaces so a client named `sparks` or an event named `budget` can never collide with a section route.

Nothing is hard coded to Shine, to Founders Weekend, or to `/shine`.

## 3. Reusable visual system

Three layers, applied in this order.

### Layer 1, the neutral operating system shell

Defined on `.eo-frame` in [app/events-os/events-os.css](app/events-os/events-os.css). Cool light gray ground, white surfaces, a single neutral accent, tabular numerals, and dense but readable rows. This is what makes budget, schedule, tasks, and run of show fast to read.

### Layer 2, the client brand layer

A `Client` supplies three values: `accent`, `accentSoft`, `onAccent`. They are applied as CSS custom properties on a wrapper element, so the same shell renders in Shine copper or Redeemer indigo with no component changes.

### Layer 3, the event layer

An `Edition` supplies five values: `canopy`, `water`, `ember`, `bark`, `mist`. `EventScene` draws a lake, a treeline, a cabin, a bonfire, and its reflection entirely from those five colors. Founders Weekend gets the woodsy fall lakefront. Leaders Retreat gets a spring chapel palette from the same component.

The event layer only dresses the event home hero and the edition chrome. Operational screens stay on Layer 1 on purpose.

**Photography.** `EventScene` stands in for real imagery. When the 2025 lake, cabin, bonfire, fall, and family photographs are available, replace the component with an image and keep the scrim. The scrim is already tuned for photography, not just for the drawn scene.

## 4. Repository and deployment boundary

### Recommendation

| Surface | Lives at | Repository |
| --- | --- | --- |
| Stewardship Capital homepage | `stewardship.capital` | `rfox0629/stewardship.capital` |
| Stewardship Events marketing | `stewardship.capital/events` | `rfox0629/stewardship.capital` |
| Stewardship Events operating system | its own domain, for example `app.stewardshipevents.com` | a dedicated repository |
| Stewardship Capital Operating System | `stewardship.capital` behind auth | `rfox0629/stewardship.capital` |

Event client records must never share a datastore with family or financial stewardship records. Different data sensitivity, different access model, likely different customers.

### How the preview stays portable

The operating system is built as a **self contained folder**, `app/events-os`, with three properties that make the move cheap:

1. **Every link goes through `paths.ts`.** `EVENTS_OS_BASE` is the only place a route prefix is written. Set it to `""`, move the folder to the root of the new application, and every link is correct.
2. **No shared imports.** Nothing under `app/events-os` imports from the Stewardship Capital site, the dashboard, the assessment, `lib/`, or Supabase. The only shared things are the two font variables in `sc-tokens.css`, which are two lines to replace.
3. **Data access is behind one module.** Every screen reads through `_lib/store.ts`. Swapping seeded data for a real datastore means rewriting that one file, not the fourteen screens.

The `@events/*` TypeScript alias in `tsconfig.json` also moves with the folder. In a new repository, point it at the new location or convert to relative imports.

### What to do next, in order

1. Founder review of this preview.
2. Decide the domain and register it.
3. Create the dedicated repository and move `app/events-os` into it.
4. Choose the datastore and implement `_lib/store.ts` against it.
5. Add auth and per client access control.
6. Replace `EventScene` with real Founders Weekend photography.
7. Keep `stewardship.capital/events` as the marketing surface, linking out to the application.

## 5. What this preview does not do

Stated plainly so nothing reads as more finished than it is.

- Nothing persists. The Sparks quick add is real interaction but session only.
- There is no auth and no access control.
- There is no datastore. All data is seeded in `_lib/platform-data.ts`.
- No sensitive financial data was created or migrated, per the brief.
- Guest communications are represented as tasks rather than as a mail surface.
- People other than Brooke Fox and Ryan Fox are invented seed names.
