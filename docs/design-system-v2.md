# Stewardship.Capital Design System v2

Supersedes `stewardship-capital-visual-concept-v1.md`. That document describes the warm paper and serif direction, which was replaced in full.

## Positioning

Stewardship.Capital is a parent build company. Entrusted ideas, opportunities, companies, relationships, technology, and resources go in. Systems, products, and experiences built to move come out.

The philosophy behind it, which lives on About and never on the homepage:

> Capital is more than money. Ideas are capital. Relationships are capital. Experience is capital. Technology is capital. Influence is capital. Companies are capital. Time is capital. Everything entrusted can be multiplied.

The test for every decision on this site: a visitor should think "what are these people building?" and never "what financial service are they selling?"

## The brand idea: the dot is the multiplier

The name is the identity, and the distinctive character in it is the period.

A period normally ends a sentence. Here it is the joint where stewardship becomes capital. So the dot is the logo, and it is the atomic unit of the entire visual system: the node in the hero field, the bullet, the active state, the only thing that ever carries the accent colour.

It is painted as a small square node rather than set as a punctuation glyph, because a period at text size is imperceptible and the one distinctive element of the identity has to actually register.

There is no icon, no monogram, and no illustration. The wordmark and one luminous point.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `--void` | `#0a0b0d` | page ground |
| `--base` | `#0d0f12` | odd panels |
| `--raised` | `#121317` | even panels |
| `--line` | `#1f2229` | hairlines |
| `--line-bright` | `#2a2e37` | borders on interactive elements |
| `--white` | `#fafafa` | primary type |
| `--dim` | `#8a8f98` | secondary type |
| `--dimmer` | `#5c626c` | tertiary and disabled |
| `--signal` | `#ff4d00` | the one accent |

Graphite rather than pure black, so panels can stack and read as separate surfaces.

**The accent rule.** Signal orange never decorates. It marks something activated. In the hero field it appears only on nodes and edges that attention has woken. Nothing else on a public page carries it, which is why the primary button on `/more` is white: at full width on a phone an orange button becomes the largest thing on the screen, and the node has to stay the distinctive mark.

## Typography

One family across the whole range: **Archivo** variable, with the width axis available.

- Display: weight 700, `wdth` 104 to 108, tracking `-0.045em` to `-0.052em`, line height 0.88 to 0.98.
- Body: weight 400, normal width, line height 1.5 to 1.65.
- Labels: 0.72rem, `0.14em` to `0.22em` tracking, uppercase.

One family used across an enormous range reads as more disciplined than a display and text pairing.

## Motion

Damped and physical. Four behaviours only:

1. **Rise.** Hero content enters on load with a short stagger.
2. **Wake.** Field nodes activate on proximity to attention and decay when it leaves.
3. **Resolve.** Panel visuals build when they enter the viewport and stop when they leave.
4. **Travel.** Arrows translate on hover, underlines scale from the left.

No parallax, no scroll hijacking, no WebGL. Everything collapses under `prefers-reduced-motion`, where the fields render a single static frame.

## The hero field: The Multiplier

A latent lattice of points, jittered off a fixed grid so it reads as structure rather than graph paper. Attention, which follows the pointer and wanders on its own when idle, wakes the points nearest it. They pull inward, connect to their neighbours, and resolve into visible geometry, then relax back.

Rendered on Canvas 2D with precomputed neighbours. Two draw passes: the latent structure in near invisible white, and on top of it, only what attention has built, in signal orange.

## Product panel visuals

One engine, three behaviours, so every product world is drawn in the same language:

- **converge** Scattered points resolving into an ordered grid. What Spark does to a pile of ideas. The accent flashes as each point lands and then settles back to graphite, leaving a sparse few lit.
- **path** An autonomous agent finding its way across a latent field, correcting course rather than running straight.
- **latent** Structure with capacity. One node lit in the middle of the field, nothing built yet.

## Architecture

```
/         title screen: Time. Talent. Treasure.
/more     the Spark entry, the only public destination
```

The homepage is a title screen, not a landing page. One statement, one line of support, one quiet scripture, one way forward, and nothing below the fold. Navigation is the brand mark alone, because Spark is the only product exposed publicly and it is reached through the single call to action.

`/work`, `/work/[slug]`, `/about`, `/connect`, and `/events` were removed from public view and now redirect to `/more`, or to `/` in the case of `/about`.

## What was preserved

- `/events-os`, the Stewardship Events operating system, untouched and self contained.
- `/internal/operating-system`, the original preserved homepage.
- `/dashboard`, `/assessment`, `/login`, `/signup`, the existing authenticated platform.
- `/events` now redirects to `/work/spark`, since that product is now called Spark.

## Two structural fixes made during the rebuild

1. **`globals.css` is no longer imported at the root layout.** All 2,558 lines of legacy platform CSS are now scoped to the five legacy surfaces that need them. Previously they leaked into every page, which is how a stray `h1 { max-width: 680px }` silently clamped a full width wordmark.
2. **Tailwind is unused.** No `@apply`, no `@tailwind`, and not one utility class in the codebase. It only supplies a reset, which is now a nine line block in `tokens.css`. The dependency can be dropped whenever convenient.

## Open

- **AutoPilot Strategies has no copy.** The panel, the register entry, and the product page all render its name with an explicitly marked placeholder line and an "In development" status. Nothing is invented.
- **Spark and Stewardship Events.** Spark is Stewardship Events renamed. The public surfaces say Spark. The operating system at `/events-os` still says Stewardship Events throughout, since it is under separate founder review. Renaming inside it is its own task.
