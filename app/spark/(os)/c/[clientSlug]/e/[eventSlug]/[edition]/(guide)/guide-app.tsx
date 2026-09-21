"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { dayDate } from "@lib/spark/days";
import {
  DAY_LONG,
  DAY_SHORT,
  GUEST_DAYS,
  activityGroups,
  clock,
  dayAgenda,
  detailCue,
  guestTitle,
  hasDetail,
  type Activity,
  type Drink,
  type GuideMoment,
} from "@lib/spark/guide";

import { CoffeeArt } from "./coffee-art";
import { TeamPanel, type TeamProps } from "./team-panel";

/**
 * The weekend guide.
 *
 * Three destinations for a guest: what is happening, what there is to do, and
 * what the coffee bar is making. The team gets a fourth. Everything a guest
 * can tap opens over the page rather than replacing it, so closing a menu puts
 * them back on the same day at the same place in the list.
 *
 * Nothing here can change anything. A guest browses; the calendar is edited
 * in one place only, by the people allowed to.
 */

type Tab = "schedule" | "activities" | "coffee" | "team";

type Sheet =
  | { kind: "moment"; id: string }
  | { kind: "drink"; name: string };

const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const readStored = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* A private window or blocked storage just means no memory next time. */
  }
};

export function GuideApp({
  storeKey,
  startsOn,
  moments,
  activities,
  coffee,
  team,
}: {
  /** Namespaces what this browser remembers, per engagement and per view. */
  storeKey: string;
  startsOn: string | null;
  moments: GuideMoment[];
  activities: Activity[];
  coffee: Drink[];
  team?: TeamProps | null;
}) {
  const hydrated = useHydrated();

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "schedule", label: "Schedule" },
    { key: "activities", label: "Activities" },
    { key: "coffee", label: "Coffee" },
    ...(team ? [{ key: "team" as Tab, label: "Team" }] : []),
  ];

  /* The first visit opens on Thursday. After that the guide remembers the
     day and the destination someone was last looking at. */
  const [tab, setTabState] = useState<Tab>(() => {
    if (typeof window === "undefined") return "schedule";
    const stored = readStored(`${storeKey}:tab`);
    return tabs.some((item) => item.key === stored) ? (stored as Tab) : "schedule";
  });
  const [day, setDayState] = useState<string>(() => {
    if (typeof window === "undefined") return "thu";
    const stored = readStored(`${storeKey}:day`);
    return stored && (GUEST_DAYS as readonly string[]).includes(stored) ? stored : "thu";
  });
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const top = useRef<HTMLDivElement>(null);

  /* Until hydration, render exactly what the server did. */
  const shownTab: Tab = hydrated ? tab : "schedule";
  const shownDay = hydrated ? day : "thu";

  const setTab = (next: Tab) => {
    setTabState(next);
    writeStored(`${storeKey}:tab`, next);
    top.current?.scrollIntoView({ block: "start" });
  };
  const setDay = (next: string) => {
    setDayState(next);
    writeStored(`${storeKey}:day`, next);
  };

  const open = (next: Sheet, from: HTMLElement | null) => {
    trigger.current = from;
    setSheet(next);
  };
  const close = () => {
    setSheet(null);
    /* Back to exactly where they were. */
    trigger.current?.focus({ preventScroll: true });
  };

  const agenda = dayAgenda(moments, shownDay);
  const coffeeTimes = moments.filter((moment) => moment.guide?.opens?.includes("coffee"));

  return (
    <div className="gd-app" ref={top}>
      <nav className="gd-tabs" aria-label="Guide">
        <div className="gd-shell gd-tabs-inner">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className="gd-tab"
              aria-current={shownTab === item.key ? "page" : undefined}
              onClick={() => setTab(item.key)}
            >
              <TabIcon kind={item.key} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="gd-main">
        {shownTab === "schedule" ? (
          <section aria-label="Schedule">
            <div className="gd-days" role="tablist" aria-label="Day">
              <div className="gd-shell gd-days-inner">
                {GUEST_DAYS.map((key) => {
                  const date = dayDate(startsOn, key);
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={shownDay === key}
                      className="gd-day"
                      onClick={() => setDay(key)}
                    >
                      <b>{DAY_SHORT[key]}</b>
                      {date ? <span>{date.getUTCDate()}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="gd-shell">
              <h2 className="gd-dayhead">
                {DAY_LONG[shownDay]}
                {dayDate(startsOn, shownDay) ? (
                  <span>
                    {dayDate(startsOn, shownDay)!.toLocaleDateString("en-US", {
                      month: "long", day: "numeric", timeZone: "UTC",
                    })}
                  </span>
                ) : null}
              </h2>

              <ol className="gd-agenda">
                {agenda.map((moment) => (
                  <AgendaRow
                    key={moment.id}
                    moment={moment}
                    onOpen={(from) => open({ kind: "moment", id: moment.id }, from)}
                  />
                ))}
              </ol>
              {agenda.length === 0 ? <p className="gd-empty">Nothing on the schedule for this day yet.</p> : null}
            </div>
          </section>
        ) : null}

        {shownTab === "activities" ? (
          <section className="gd-shell gd-page" aria-label="Activities">
            <h2 className="gd-pagehead">Around the property</h2>
            <p className="gd-lede">
              What the property offers, for free time and quiet moments.
            </p>
            <ActivityList activities={activities} />
          </section>
        ) : null}

        {shownTab === "coffee" ? (
          <section className="gd-shell gd-page" aria-label="Coffee">
            <h2 className="gd-pagehead">The coffee bar</h2>
            <p className="gd-lede">Three drinks made for this weekend. Tap one for a closer look.</p>
            <div className="gd-drinks">
              {coffee.map((drink) => (
                <button
                  key={drink.name}
                  type="button"
                  className="gd-drink"
                  onClick={(event) => open({ kind: "drink", name: drink.name }, event.currentTarget)}
                >
                  <CoffeeArt art={drink.art} label={drink.name} />
                  <span className="gd-drink-name">{drink.name}</span>
                  <span className="gd-drink-feel">{drink.feel}</span>
                  <span className="gd-drink-with">{drink.ingredients.join(" · ")}</span>
                </button>
              ))}
            </div>

            {coffeeTimes.length > 0 ? (
              <div className="gd-coffee-times">
                <h3>When the coffee bar is open</h3>
                <ul>
                  {coffeeTimes.map((moment) => (
                    <li key={moment.id}>
                      <b>{DAY_LONG[moment.day]}</b>
                      <span>
                        {clock(moment.starts)}
                        {moment.ends ? ` to ${clock(moment.ends)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        {shownTab === "team" && team ? <TeamPanel {...team} storeKey={storeKey} /> : null}
      </main>

      {sheet ? (
        <DetailSheet onClose={close}>
          {sheet.kind === "moment" ? (
            <MomentDetail
              moment={moments.find((moment) => moment.id === sheet.id) ?? null}
              startsOn={startsOn}
              activities={activities}
              coffee={coffee}
              onDrink={(name) => setSheet({ kind: "drink", name })}
              onTab={(next) => { setSheet(null); setTab(next); }}
            />
          ) : (
            <DrinkDetail drink={coffee.find((drink) => drink.name === sheet.name) ?? null} />
          )}
        </DetailSheet>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- rows */

function AgendaRow({
  moment,
  onOpen,
}: {
  moment: GuideMoment;
  onOpen: (from: HTMLElement) => void;
}) {
  const kind = moment.guide?.kind ?? "program";
  const cue = detailCue(moment);
  const sub = moment.guide?.summary ?? moment.location ?? null;
  const [h, m, period] = splitClock(moment.starts);

  const body = (
    <>
      <span className="gd-row-time">
        <b>{h}{m ? <>:{m}</> : null}</b>
        <i>{period}</i>
      </span>
      <span className="gd-row-body">
        <span className="gd-row-title">
          {guestTitle(moment)}
          {moment.guide?.optional ? <em className="gd-badge">Optional</em> : null}
        </span>
        {moment.window && moment.ends ? (
          <span className="gd-row-until">Until {clock(moment.ends)}</span>
        ) : null}
        {sub ? <span className="gd-row-sub">{sub}</span> : null}
        {moment.guide?.summary && moment.location ? (
          <span className="gd-row-where">{moment.location}</span>
        ) : null}
      </span>
      {cue ? (
        <span className="gd-row-cue">
          {cue}
          <svg viewBox="0 0 8 12" aria-hidden="true"><path d="M1.5 1l5 5-5 5" /></svg>
        </span>
      ) : null}
    </>
  );

  return (
    <li className={`gd-row gd-kind-${kind} ${moment.window ? "gd-row-window" : ""}`}>
      {hasDetail(moment) ? (
        <button type="button" className="gd-row-hit" onClick={(event) => onOpen(event.currentTarget)}>
          {body}
        </button>
      ) : (
        <div className="gd-row-hit">{body}</div>
      )}
    </li>
  );
}

const splitClock = (label: string | null): [string, string, string] => {
  const text = clock(label);
  const match = text.match(/^(\d+):(\d+) (AM|PM)$/);
  if (!match) return ["", "", ""];
  return [match[1], match[2], match[3]];
};

/* -------------------------------------------------------------- sheets */

function DetailSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const latestClose = useRef(onClose);

  useEffect(() => {
    latestClose.current = onClose;
  });

  /* Focus moves into the sheet once, when it opens, and Escape closes it. */
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") latestClose.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="gd-sheet-wrap" role="dialog" aria-modal="true">
      <button type="button" className="gd-scrim" aria-label="Close" onClick={onClose} />
      <div className="gd-sheet" ref={panel} tabIndex={-1}>
        <div className="gd-sheet-grip" aria-hidden="true" />
        <button type="button" className="gd-sheet-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" /></svg>
        </button>
        <div className="gd-sheet-body">{children}</div>
      </div>
    </div>
  );
}

function MomentDetail({
  moment,
  startsOn,
  activities,
  coffee,
  onDrink,
  onTab,
}: {
  moment: GuideMoment | null;
  startsOn: string | null;
  activities: Activity[];
  coffee: Drink[];
  onDrink: (name: string) => void;
  onTab: (tab: Tab) => void;
}) {
  if (!moment) return <p className="gd-empty">This has moved or is no longer on the schedule.</p>;
  const copy = moment.guide;
  const date = dayDate(startsOn, moment.day);

  return (
    <article className={`gd-detail gd-kind-${copy?.kind ?? "program"}`}>
      <p className="gd-detail-when">
        {DAY_LONG[moment.day]}
        {date ? `, ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}` : ""}
        {" · "}
        {clock(moment.starts)}
        {moment.ends ? ` to ${clock(moment.ends)}` : ""}
      </p>
      <h2 className="gd-detail-title">{guestTitle(moment)}</h2>
      {moment.location ? <p className="gd-detail-where">{moment.location}</p> : null}
      {copy?.summary ? <p className="gd-detail-summary">{copy.summary}</p> : null}
      {copy?.tbc ? (
        <p className="gd-detail-tbc">
          <b>To be confirmed</b> {copy.tbc}
        </p>
      ) : null}

      {copy?.menu && copy.menu.length > 0 ? (
        <div className="gd-menu">
          <h3>On the menu</h3>
          <ul>
            {copy.menu.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      {copy?.opens?.includes("coffee") && coffee.length > 0 ? (
        <div className="gd-detail-section">
          <h3>From the coffee bar</h3>
          <div className="gd-drinks gd-drinks-compact">
            {coffee.map((drink) => (
              <button key={drink.name} type="button" className="gd-drink" onClick={() => onDrink(drink.name)}>
                <CoffeeArt art={drink.art} label={drink.name} />
                <span className="gd-drink-name">{drink.name}</span>
                <span className="gd-drink-feel">{drink.feel}</span>
              </button>
            ))}
          </div>
          <button type="button" className="gd-link" onClick={() => onTab("coffee")}>
            See the full coffee menu
          </button>
        </div>
      ) : null}

      {copy?.opens?.includes("activities") && activities.length > 0 ? (
        <div className="gd-detail-section">
          <h3>Things to do</h3>
          <ActivityList activities={activities} compact />
          <button type="button" className="gd-link" onClick={() => onTab("activities")}>
            Open Activities
          </button>
        </div>
      ) : null}
    </article>
  );
}

function DrinkDetail({ drink }: { drink: Drink | null }) {
  if (!drink) return null;
  return (
    <article className="gd-detail gd-drink-detail">
      <CoffeeArt art={drink.art} label={drink.name} />
      <h2 className="gd-detail-title">{drink.name}</h2>
      <p className="gd-detail-summary">{drink.feel}</p>
      <div className="gd-menu">
        <h3>What&rsquo;s in it</h3>
        <ul>
          {drink.ingredients.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------- activities */

function ActivityList({ activities, compact = false }: { activities: Activity[]; compact?: boolean }) {
  return (
    <div className={`gd-activities ${compact ? "gd-activities-compact" : ""}`}>
      {activityGroups(activities).map((group) => (
        <section key={group.category} className="gd-actgroup">
          <h3>{group.category}</h3>
          <ul>
            {group.activities.map((activity) => (
              <li key={activity.name}>
                <span>{activity.name}</span>
                {activity.note && !compact ? <em>{activity.note}</em> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- icons */

function TabIcon({ kind }: { kind: Tab }) {
  const common = { viewBox: "0 0 24 24", "aria-hidden": true, className: "gd-tab-icon" } as const;
  if (kind === "schedule") {
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
    );
  }
  if (kind === "activities") {
    return (
      <svg {...common}>
        <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z" />
      </svg>
    );
  }
  if (kind === "coffee") {
    return (
      <svg {...common}>
        <path d="M6 8h11l-1.4 11.2a1.5 1.5 0 0 1-1.5 1.3H8.9a1.5 1.5 0 0 1-1.5-1.3z" />
        <path d="M5 6h13M9.5 3.5c0 1 1 1 1 2M13.5 3.5c0 1 1 1 1 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.5 14.3c2.6-.3 4.6 1.2 5 4.2" />
    </svg>
  );
}
