import { notFound, redirect } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "Run of show" };

/**
 * The execution layer, minute by minute, for the team running the room.
 *
 * Planner only, twice over: the route refuses anyone else before this
 * renders, and RLS returns no cue rows to any other role. Nothing on this
 * page is written for a guest's eyes, which is exactly why it must never
 * reach them.
 *
 * Built to be read on a phone in a dark room during the event: big enough
 * times, one cue per line, the responsible person on every cue.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type CueRow = {
  id: string;
  at_label: string;
  cue: string;
  who_name: string | null;
  position: number;
  schedule_item_id: string;
  item: {
    day_key: string;
    starts_label: string;
    title: string;
  } | {
    day_key: string;
    starts_label: string;
    title: string;
  }[] | null;
  spark: { title: string } | { title: string }[] | null;
};

const DAY_ORDER = ["thu", "fri", "sat", "sun"];
const DAY_NAMES: Record<string, string> = {
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const itemOf = (row: CueRow) =>
  Array.isArray(row.item) ? row.item[0] : row.item;

const sparkTitle = (row: CueRow) =>
  (Array.isArray(row.spark) ? row.spark[0] : row.spark)?.title;

export default async function RunOfShowPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role !== "planner" && !context.staff) redirect(base);

  const { data } = await context.supabase
    .from("run_of_show_cues")
    .select(
      "id, at_label, cue, who_name, position, schedule_item_id, item:schedule_items(day_key, starts_label, title), spark:sparks(title)",
    )
    .eq("engagement_id", context.engagement.id)
    .order("position", { ascending: true });

  const cues = (data ?? []) as CueRow[];

  /* Group by the schedule moment each cue serves, in weekend order. */
  const moments = new Map<string, { day: string; starts: string; title: string; cues: CueRow[] }>();
  for (const cue of cues) {
    const item = itemOf(cue);
    if (!item) continue;
    const existing = moments.get(cue.schedule_item_id);
    if (existing) {
      existing.cues.push(cue);
    } else {
      moments.set(cue.schedule_item_id, {
        day: item.day_key,
        starts: item.starts_label,
        title: item.title,
        cues: [cue],
      });
    }
  }

  const ordered = [...moments.values()].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day),
  );

  return (
    <>
      <h2 className="ev-page-title">Run of show</h2>
      <p className="ev-lede">
        The room, minute by minute, for the team running it. Ryan is emcee,
        not a speaker: his cues frame and hand off, never teach.
      </p>

      {ordered.map((moment) => (
        <section
          key={`${moment.day}-${moment.title}`}
          className="ev-day"
          aria-label={moment.title}
        >
          <div className="ev-day-head">
            <h3 className="ev-day-name">{moment.title}</h3>
            <span className="ev-day-date">
              {DAY_NAMES[moment.day] ?? moment.day} · {moment.starts}
            </span>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {moment.cues.map((cue) => (
              <li key={cue.id} className="ev-cue">
                <span className="ev-cue-at">{cue.at_label}</span>
                <span>
                  {cue.cue}
                  {cue.who_name ? (
                    <span className="ev-cue-who">{cue.who_name}</span>
                  ) : null}
                  {sparkTitle(cue) ? (
                    <span className="ev-row-became" style={{ display: "block" }}>
                      From the spark: {sparkTitle(cue)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
