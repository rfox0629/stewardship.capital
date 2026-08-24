# Founder Review Notes

Covers USA-185 and USA-184.

## Preview link

**https://stewardshipcapital-git-claud-3ead0e-ryan-foxs-projects-9a51a4d5.vercel.app**

This is a Vercel preview of branch `claude/stewardship-capital-redesign-0a2632`. Vercel Authentication is enabled on the project, so the link is private and asks for a Vercel login. It is not publicly readable.

Append any route below to that base URL.

## Or run it locally

From the repository root, on branch `claude/stewardship-capital-redesign-0a2632`:

```
npm install
npm run dev
```

Then open the routes below.

Add `?motion=none` to any Stewardship Capital marketing page to see it with entrance motion turned off. Useful for printing and for judging the static composition.

## Routes

### Public, Stewardship Capital

| Route | What it is |
| --- | --- |
| `/` | The new visual homepage |
| `/events` | Stewardship Events entry point |

### Preserved, not public

| Route | What it is |
| --- | --- |
| `/internal/operating-system` | **The previous homepage and Operating System entry point.** Preserved in full, removed from public navigation, marked noindex, and carrying a banner that says what it is. |
| `/dashboard` | The existing authenticated dashboard, unchanged |
| `/assessment`, `/login`, `/signup` | Unchanged |

Nothing on the new public site links to any of these. They are reachable only by typing the route. `robots.txt` disallows all of them.

### Stewardship Events operating system preview

| Route | Screen |
| --- | --- |
| `/events-os` | Planner home across clients |
| `/events-os/c/shine` | Shine client home |
| `/events-os/c/shine/e/founders-weekend/2026` | Founders Weekend 2026 event home |
| `.../2026/sparks` | Sparks board and quick add |
| `.../2026/sparks/sp-04` | Approved spark converted into schedule, budget, task, and run of show |
| `.../2026/sparks/sp-01` | A spark that has not been decided yet |
| `.../2026/meeting` | Weekly meeting and decision flow |
| `.../2026/plan` | Event plan |
| `.../2026/schedule` | Confirmed schedule |
| `.../2026/budget` | Budget |
| `.../2026/tasks` | Tasks and owners |
| `.../2026/run-of-show` | Run of show |
| `.../2026/resources` | Vendors and supplies |
| `.../2026/review` | Impact review, prepared before the event |
| `/events-os/c/shine/e/founders-weekend/2025` | The completed 2025 edition |
| `.../2025/review` | The completed review, with the five items carried into 2026 |
| `/events-os/c/redeemer-collective/e/leaders-retreat/2027` | A second client on the same platform, different brand and different event layer |

## The four things worth judging

1. **Does the homepage explain Stewardship Capital in one page, mostly visually?** Three strands become one trust, one trust opens into impact. Almost no copy.
2. **Does the event home answer only the four questions?** What needs attention, what are we deciding, what is confirmed, are we on track.
3. **Does the Spark model hold?** Open `sparks/sp-04`. An approved idea created a schedule item, a budget line, a task, and a run of show cue, and every one of them links back.
4. **Is the platform actually reusable?** Open the Redeemer Collective retreat. Same shell, different client accent, different event scene, no code changes.

## Decisions made, and why

- **Products are not the hero of the homepage.** The Operating System and Stewardship Events appear as two cards near the bottom. The idea leads.
- **The Operating System card does not link anywhere.** It reads "In private development." Linking it would make the preserved platform the primary public experience again, which the brief rules out.
- **The events marketing page is not woodsy.** It inherits the parent brand and shows the product's own artifact, ideas becoming a confirmed schedule. Founders Weekend imagery lives inside the event layer of the operating system, which is where the brief puts it.
- **Sunday is protected.** Sending, departure, and pack up only. That is a recorded decision in the preview, not just a note.
- **Ryan is emcee, not a speaker.** The three minute morning frame exists as an approved spark and two schedule items, and the run of show reflects it.

## Known gaps

- No persistence, no auth, no datastore. Seeded preview data only.
- `EventScene` is drawn from theme colors and stands in for real Founders Weekend photography.
- Seed people other than Brooke Fox and Ryan Fox are invented.
- Supabase environment variables are not set on the preview, so `/login`, `/signup`, and `/dashboard` degrade gracefully rather than authenticating. That surface is unchanged from before this work.

## Related documents

- [Visual benchmark research notes](research/visual-benchmark-notes-v1.md)
- [Stewardship Capital visual concept](stewardship-capital-visual-concept-v1.md)
- [Stewardship Events architecture](stewardship-events-architecture-v1.md)
