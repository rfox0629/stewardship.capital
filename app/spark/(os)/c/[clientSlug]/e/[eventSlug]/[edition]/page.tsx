import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DAY_NAMES, DAY_ORDER, parseTimeLabel } from "@lib/spark/days";
import { resolveEngagement } from "@lib/spark/engagement";
import { Reference } from "./reference";

export const metadata = { title: "The weekend" };

/**
 * The screen a planning meeting opens on.
 *
 * Four numbers, then what is waiting on the room, then the weekend as it
 * currently stands. Reference lives underneath as three doors, because a
 * meeting needs it occasionally and never needs it shouting.
 */

type PageProps = {
  params: Promise<{ clientSlug: string; eventSlug: string; edition: string }>;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(cents / 100);

export default async function WeekendPage({ params }: PageProps) {
  const { clientSlug, eventSlug, edition } = await params;
  const context = await resolveEngagement(clientSlug, eventSlug, edition);
  if (!context) notFound();

  const base = `/spark/c/${clientSlug}/e/${eventSlug}/${edition}`;
  if (context.role === "stakeholder") redirect(`${base}/schedule`);

  const { engagement, supabase } = context;
  const planner = context.role === "planner" || context.staff;

  const [ideasQ, scheduleQ, actionsQ, budgetQ, needsQ] = await Promise.all([
    supabase.from("sparks").select("id, title, detail, status, tentative_day, tentative_daypart")
      .eq("engagement_id", engagement.id),
    supabase.from("schedule_items").select("day_key, starts_label, daypart, title, track")
      .eq("engagement_id", engagement.id),
    supabase.from("tasks").select("status, estimated_cents").eq("engagement_id", engagement.id),
    supabase.from("budget_lines").select("planned_cents").eq("engagement_id", engagement.id),
    supabase.from("resources").select("estimated_cents").eq("engagement_id", engagement.id),
  ]);

  const ideas = ideasQ.data ?? [];
  const live = ideas.filter((row) => row.status !== "parked" && row.status !== "declined");
  const deciding = ideas.filter((row) => row.status === "discussing");
  const openActions = (actionsQ.data ?? []).filter((row) => row.status !== "done");

  const working =
    (budgetQ.data ?? []).reduce((total, row) => total + row.planned_cents, 0) +
    (actionsQ.data ?? []).reduce((total, row) => total + (row.estimated_cents ?? 0), 0) +
    (needsQ.data ?? []).reduce((total, row) => total + (row.estimated_cents ?? 0), 0);
  const available = engagement.budgetTotalCents - working;

  const figures = [
    { value: String(live.length), label: "Ideas", href: `${base}/plan` },
    { value: String(deciding.length), label: "Need decision", href: `${base}/plan`, warm: deciding.length > 0 },
    { value: String(openActions.length), label: "Open actions", href: `${base}/actions` },
    { value: money(available), label: "Available", href: `${base}/budget`, over: available < 0 },
  ];

  /* The weekend as it stands, one column per day, titles only. An untimed
     moment sorts into the part of the day it names rather than to the end,
     so "Afternoon: free time" reads where the afternoon actually is. */
  const BAND: Record<string, number> = {
    morning: 8 * 60, afternoon: 13 * 60, evening: 18 * 60, anytime: 21 * 60,
  };
  const at = (row: { starts_label: string | null; daypart: string | null }) =>
    parseTimeLabel(row.starts_label) ?? BAND[row.daypart ?? ""] ?? 9999;
  const moments = (scheduleQ.data ?? []).slice().sort((a, b) => at(a) - at(b));
  const present = new Set(moments.map((row) => row.day_key));
  const days = DAY_ORDER.filter((key) => key !== "wed" || present.has("wed"));

  return (
    <div className="wk">
      <div className="wk-figures">
        {figures.map((figure) => (
          <Link
            key={figure.label}
            href={figure.href}
            className={`wk-figure ${figure.warm ? "wk-figure-warm" : ""} ${figure.over ? "wk-figure-over" : ""}`}
          >
            <b>{figure.value}</b>
            <span>{figure.label}</span>
          </Link>
        ))}
      </div>

      {deciding.length > 0 ? (
        <section className="wk-attention" aria-label="Needs our attention">
          <header className="wk-sec-head">
            <h3>Needs our attention</h3>
            <Link href={`${base}/plan`}>All ideas</Link>
          </header>
          <div className="wk-decisions">
            {deciding.map((idea) => (
              <Link key={idea.id} href={`${base}/plan?open=${idea.id}`} className="wk-decision">
                <b>{idea.title}</b>
                {idea.detail ? <span>{idea.detail}</span> : null}
                <em>Decide</em>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="wk-snapshot" aria-label="The weekend as it stands">
        <header className="wk-sec-head">
          <h3>The weekend</h3>
          <Link href={`${base}/schedule`}>Open the calendar</Link>
        </header>
        <div className="wk-days">
          {days.map((key) => {
            const mine = moments.filter((row) => row.day_key === key);
            return (
              <div key={key} className="wk-daycol">
                <p className="wk-dayname">{DAY_NAMES[key]}</p>
                {mine.length === 0 ? (
                  <p className="wk-dayempty">Nothing yet</p>
                ) : (
                  mine.map((row, index) => (
                    <p key={index} className="wk-moment">
                      <span>{row.starts_label ?? row.daypart}</span>
                      {row.title}
                    </p>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Reference
        reference={engagement.reference ?? {}}
        route={{ clientSlug, eventSlug, edition }}
        planner={planner}
      />
    </div>
  );
}
