import { notFound } from "next/navigation";

import { resolveEngagement } from "@lib/spark/engagement";

export const metadata = { title: "Schedule" };

/**
 * The weekend, hour by hour.
 *
 * One query for every role. Row level security is the editor: a guest's
 * session only receives confirmed items, so the draft rows and their notes
 * never leave the database for them, and the working view is the same page
 * with more rows. What each person sees is decided by policy, not by
 * template logic.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

type ScheduleRow = {
  id: string;
  day_key: string;
  starts_label: string;
  ends_label: string | null;
  title: string;
  track: string;
  location: string | null;
  status: string;
  note: string | null;
  position: number;
  spark_id: string | null;
  spark: { title: string } | { title: string }[] | null;
};

const DAY_ORDER = ["thu", "fri", "sat", "sun"] as const;
const DAY_NAMES: Record<string, string> = {
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const dayDate = (startsOn: string | null, index: number): string | null => {
  if (!startsOn) return null;
  const date = new Date(`${startsOn}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + index);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

export default async function SchedulePage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const working = context.role !== "stakeholder";

  const { data } = await context.supabase
    .from("schedule_items")
    .select(
      "id, day_key, starts_label, ends_label, title, track, location, status, note, position, spark_id, spark:sparks(title)",
    )
    .eq("engagement_id", context.engagement.id)
    .order("position", { ascending: true });

  const items = (data ?? []) as ScheduleRow[];
  const days = DAY_ORDER.map((key, index) => ({
    key,
    name: DAY_NAMES[key],
    date: dayDate(context.engagement.startsOn, index),
    items: items.filter((item) => item.day_key === key),
  })).filter((day) => day.items.length > 0);

  return (
    <>
      <h2 className="ev-page-title">The schedule</h2>
      <p className="ev-lede">
        {working
          ? "Confirmed moments and the ones still taking shape. Guests see only what is settled."
          : "Where to be and when. Everything here is confirmed."}
      </p>

      {days.map((day) => (
        <section key={day.key} className="ev-day" aria-label={day.name}>
          <div className="ev-day-head">
            <h3 className="ev-day-name">{day.name}</h3>
            {day.date ? <span className="ev-day-date">{day.date}</span> : null}
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {day.items.map((item) => (
              <li key={item.id} className="ev-slot">
                <span className="ev-slot-time">
                  {item.starts_label}
                  {item.ends_label ? ` to ${item.ends_label}` : ""}
                </span>
                <span>
                  <span className="ev-slot-title">
                    {item.title}
                    {working && item.status === "draft" ? (
                      <span className="ev-draft">Taking shape</span>
                    ) : null}
                  </span>
                  {item.location ? (
                    <span className="ev-slot-where"> · {item.location}</span>
                  ) : null}
                  {working && item.note ? (
                    <span className="ev-slot-note" style={{ display: "block" }}>
                      {item.note}
                    </span>
                  ) : null}
                  {working && item.spark ? (
                    <span className="ev-slot-spark" style={{ display: "block" }}>
                      From the spark: {
                        (Array.isArray(item.spark) ? item.spark[0] : item.spark)
                          ?.title
                      }
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
