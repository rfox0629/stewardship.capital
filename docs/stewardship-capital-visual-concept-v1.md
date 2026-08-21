> **Superseded.** This describes the warm paper and serif direction, which was
> replaced in full by the graphite rebuild. See `design-system-v2.md`.

# Stewardship Capital Visual Concept v1

Deliverable 2 of USA-185.

## The concept: The Entrusted System

Stewardship Capital is not a budgeting tool and not a wealth manager. It is the practice of managing everything God has entrusted to a person, a family, an organization, or a venture, and bringing vision into faithful execution.

The visual idea that carries this in one page is **three strands that become one path, and one path that opens into impact.**

- **Time**, **Talent**, and **Treasure** enter as three separate strands.
- They converge into a single stewardship path, because they are one trust, not three budgets.
- The path opens outward into impact: family, work, generosity, and legacy.

Everything on the homepage is a view of that one drawing. The hero shows the strands forming. The middle of the page names them. The convergence section braids them. The movement section runs a person along the path. The products section shows what gets built on top of it.

This gives the page a single memorable image instead of a stack of unrelated marketing sections.

## Why this and not something else

- It is a **system diagram**, which is the honest form for a product category called an operating system.
- It is **abstract geometry**, so it needs no photography and no people, which keeps it premium and avoids stock imagery.
- It is **warm and organic** rather than circuit like, because the curves are hand shaped beziers rather than right angles. That keeps it away from cold, sci fi, and crypto.
- It reads as **threefold and unified**, which is quietly compatible with a Christian worldview without using overtly churchy visuals such as crosses, shields, or doves.

## Palette

Warm paper ground with a deep navy anchor and three strand colors, one per pillar of the trust.

| Token | Value | Role |
| --- | --- | --- |
| `--sc-paper` | `#f7f4ee` | page ground, warm white, below the splash |
| `--sc-paper-deep` | `#efeae0` | alternating band |
| `--sc-ink` | `#0c1c2c` | primary type |
| `--sc-navy` | `#0a1f33` | deep sections, footer |
| `--sc-muted` | `#5d6a70` | secondary type |
| `--sc-time` | `#3f6d8e` | Time strand, slate blue |
| `--sc-talent` | `#2a6b53` | Talent strand, evergreen |
| `--sc-treasure` | `#b98a34` | Treasure strand, brand gold |
| `--sc-line` | `#e2dcd0` | hairlines |

Three accents is the maximum. They are never used decoratively, only to identify a strand.

The splash carries its own scene palette, a night to dawn sky running from `#070b20` through indigo and rose to a warm horizon, with the wordmark in `#f8f3e7`. It is the one place the page departs from paper, and it exists to give the name a full screen before any explanation begins.

## Typography

- **Display: Fraunces.** A contemporary serif with a soft, slightly old style feel. It reads as considered and human rather than corporate, and it separates Stewardship Capital from the sans serif fintech field.
- **Text and interface: Inter.** Neutral, highly legible, correct for dense operational screens later.

Display type runs large and tight. Body copy is short and set at a comfortable measure. There is never more than three sentences in a row.

## Motion rules

Motion is choreography, not decoration. Only four moves are permitted:

1. **Draw.** Paths draw themselves in when they enter the viewport, using stroke dash offset. This shows a connection forming.
2. **Rise.** Content lifts a few pixels and fades in on entry. This paces the story.
3. **Track.** A progress indicator advances with scroll on the movement section. This marks position in a sequence.
4. **Respond.** Hovering a strand raises it and dims the others. This rewards attention and teaches the diagram.

Everything is CSS driven and collapses to a static, fully legible page under `prefers-reduced-motion: reduce`. No WebGL, no scroll hijacking, no parallax.

## Page structure as built

0. **Splash.** Full viewport. The name at the largest size the screen allows, over a sunrise, with one way in: "Click here to learn more." Nothing else competes. This is the founder's requested treatment, and it changes the palette above the fold from warm paper to a night to dawn sky. The three strands appear as rays converging into the rising light, so the splash is still the same drawing as the rest of the page.
1. **Statement.** The strands form. One headline, one line of support, two restrained calls to action.
2. **The trust.** Time, Talent, Treasure as three interactive strand cards over the shared diagram.
3. **Convergence.** The braid. One idea: these are one trust, not three accounts.
4. **The movement.** Entrusted, Understood, Ordered, Multiplied, Given. A five stop rail with scroll tracking.
5. **Expressions.** The Operating System and Stewardship Events, presented as two products of the same system.
6. **Invitation.** Restrained. Luke 12:48 as the closing line.

## Relationship to Stewardship Events

Stewardship Events is one expression of Stewardship Capital, not its identity. On the homepage it appears as one of two product cards and links to a dedicated `/events` page. Founders Weekend and Shine branding never appear on the Stewardship Capital homepage. The parent brand supplies the quality bar and the layout discipline. The event layer supplies its own imagery inside the Events operating system.

## Copy rules

- No em dashes in public copy.
- No advisor jargon.
- No direct legal, tax, or investment advice.
- Short. If a sentence can be a diagram, it should be a diagram.
