# SHINE Founders Weekend: source reconciliation

What the planning information actually is, checked against the sources rather
than against where earlier versions of Spark happened to put it.

Audited 2026-09-04 against production. Every id below is real.

## Sources used

| Source | Where it lives now | Verdict |
| --- | --- | --- |
| 1. Ideas by day | `sparks` | reconciled, see below |
| 2. Tentative schedule | `schedule_items` | authoritative; corrections applied |
| 3. Expand the Tent material | `engagements.reference -> vision` | correct, unchanged |
| 4. Venue amenities | `engagements.reference -> venue.amenities` | correct, unchanged |
| 5. Budget | `budget_lines` | matches line for line, unchanged |
| 6. Drink concepts | `engagements.reference -> drinks.options` | correct, unchanged |
| 7. Venue reviews | `engagements.reference -> venue.takeaway` | correct, unchanged |

## The rule applied

For each record: *what is this actually?* Not: *where is it stored?*

- An **Idea** is under consideration. A menu that has not been chosen is an
  idea; the meal it is for is not.
- A **Schedule Moment** is what the tentative itinerary says is happening.
  It needs no idea behind it. Breakfast was never brainstormed.
- A **Run of Show cue** happens inside a named moment. Where the source does
  not name the parent, the concept stays an idea.
- An **Action** is work for a person. A **Requirement** is something that
  must exist. Money lives only in `budget_lines`. **Reference** informs
  decisions without becoming work.

## Ideas that were actually schedule moments

The tentative schedule says these are happening. They became moments and
stopped being ideas.

| Idea (removed) | Became |
| --- | --- |
| `4fbd8c75` Fox team arrives, Wednesday | Wednesday moment, no clock time |
| `ab79a18f` Set up and unload, Wednesday | Wednesday moment, no clock time |

## Ideas that duplicated a moment already on the calendar

Each of these was the moment itself said twice, carried no detail the moment
does not carry, and had no actions, requirements, costs, cues or notes hanging
off it. The moment is the canonical record; the idea was removed.

| Idea (removed) | Canonical moment kept |
| --- | --- |
| `57a2ddc6` Free time, Friday afternoon | `98dc6592` Free time, Friday afternoon |
| `48ebcf91` Free time, Saturday afternoon | `56aa5c99` Free time, Saturday afternoon |
| `f0d184de` Celebration, Saturday evening | `eb513b79` Celebration: concert, bonfires, games, trivia, desserts |
| `373ef084` Breakfast, Sunday morning | `1011d13c` Grab and go breakfast and coffee |
| `b1341d75` Pack up, Sunday | `8165e90e` Pack, checkout, departures, final cleanup |

## Ideas that stayed ideas, deliberately

The meal is scheduled. The menu is not decided. These are the unresolved
implementation choices inside a scheduled moment, and the distinction is the
point.

- Breakfast: egg bake, yogurt parfait, sausage, fruit (Friday)
- Lunch: cold sandwiches, chips, salad, vegetables (Friday)
- Dinner: surf and turf, salmon, steak, Brussels sprouts or asparagus, salad (Friday)
- Breakfast: waffle bar or French toast sticks, fruit, bacon (Saturday)
- Lunch: wood fired pizzas (Saturday)
- Dinner: brisket, potatoes, salad, dessert (Saturday)
- Morning oatmeal or French toast bake, egg bites, fruit to go (Sunday)
- Hors d'oeuvres and dessert (Thursday)
- Glow run or walk, $1 Billion Balloon Decor (Saturday celebration elements)

No link was written between a menu and its meal. The schema can only say a
moment *came from* an idea, which is not what a menu is, and no source
establishes the relationship. They sit on the same day and read together.

## Sermon illustrations and activities

Knot tying, Take-Home Stake, Rope Holder, Tactical sermon illustration, Build
the Tent, Human knot and hula hoop all remain ideas. No source names the
session any of them belongs inside, so **no run of show cues were created**.
Guessing the parent would have been a planning decision.

Their Scripture and content stay in the reference material rather than being
copied onto the ideas.

## Actions and requirements

No source establishes work for a person, so **no actions were created**. The
count stays at zero, which is honest: nobody has been asked to do anything yet.

One requirement exists, `6ea4d8bd` Spooner Lake Island Oasis, the booked
venue, confirmed. It is a thing that must exist and does. Left alone.

The venue's 30 amenities stay reference. A pontoon existing is not a plan to
use one; using one is the idea, and confirming its price would be an action
once somebody is actually asked.

## Budget

Checked line for line against the source. All fourteen lines, their
categories, amounts and standings match. Working total $55,500 against a
$60,000 ceiling, $4,500 available. **No change.** No money is stored anywhere
else, and no cost is counted twice.

## Reference

- **vision**: theme *Expand the Tent* with the Isaiah 54:2-3 passage, plus
  seven elements. The brief numbers eight items; the first is the weekend
  theme itself, which is stored as the theme and its passage rather than as an
  eighth element. Partner Invitation and Sending is present as element seven.
  Nothing is missing and no count was quietly changed.
- **venue**: 30 amenities with their confirmation notes, and the takeaway,
  *Don't over-program the property.*
- **drinks**: eight concepts, none chosen. They are a choice set, not eight
  ideas.

## Open questions

All five source questions are present, on their own ideas, unanswered:

1. Build the Tent race, is it $25 per tent?
2. Bingo, whose favourite things is this and what should it be called?
3. $1 Billion Balloon Decor, what is this and what should it be called?
4. Flowers in the pool, should we?
5. Guests arrive, what time on Thursday?

Left exactly as they are.

## Left alone on purpose

Choosing for these would be a planning decision, not a reconciliation.

| Record | Why it is ambiguous |
| --- | --- |
| `470d4616` Departure and sending, Sunday | Departures are on the schedule, but *sending* is a program concept (Partner Invitation and Sending, Romans 10:14-15). Removing it would drop that; keeping it overlaps the departure moment. |
| Barista and SHINE specialty drink, Friday **and** Saturday | One concept, listed on both days in the ideas source. Merging is a decision about whether it happens once or twice. |
| Tactical sermon illustration, Friday **and** Saturday | Same shape: two days, one concept, and the sessions are not established. |
| Hula hoop passing activity, Thursday | Reads like a cue inside Thursday worship, but the source only says "after worship and welcome", with no parent and no offset. |
| `27b8f8b4` Sunday programming, set aside | A recorded decision that Sunday carries no program. Left set aside. |
