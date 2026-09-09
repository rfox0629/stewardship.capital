/**
 * What the money adds up to, and what a planner is allowed to type.
 *
 * Two ledgers share one table. The event ledger is what producing this
 * weekend costs and it is the only thing the engagement's ceiling is measured
 * against. The equipment ledger is durable things bought for the event and
 * kept afterwards; they are planned here and deliberately do not eat the
 * ceiling, because a speaker SHINE still owns next year is not what the
 * weekend cost.
 *
 * Every total in the product is derived from the lines. Nothing keeps its own
 * running number, so no summary can drift away from what it is summarising.
 */

export type Ledger = "event" | "equipment";

export type Line = {
  id: string;
  ledger: string;
  category: string;
  label: string;
  planned_cents: number;
  committed_cents: number;
  actual_cents: number;
  status: string | null;
  note: string | null;
  vendor: string | null;
  source_url: string | null;
  owner_name: string | null;
  spark_id: string | null;
  review_of: string | null;
};

export type Totals = {
  planned: number;
  committed: number;
  spent: number;
};

/** A ledger's own arithmetic. Equipment never appears in the event's. */
export const totalsFor = (lines: readonly Line[], ledger: Ledger): Totals =>
  lines
    .filter((line) => (line.ledger === "equipment" ? "equipment" : "event") === ledger)
    .reduce<Totals>(
      (running, line) => ({
        planned: running.planned + line.planned_cents,
        committed: running.committed + line.committed_cents,
        spent: running.spent + line.actual_cents,
      }),
      { planned: 0, committed: 0, spent: 0 },
    );

/**
 * The overlaps still waiting on a person.
 *
 * A flagged line names the line it might already be inside. Both keep their
 * own number in their own ledger; this only pairs them up so the question can
 * be asked out loud. A flag pointing at a line that has since been deleted is
 * dropped rather than shown as half a question.
 */
export const overlaps = (lines: readonly Line[]): Array<{ line: Line; against: Line }> => {
  const byId = new Map(lines.map((line) => [line.id, line]));
  return lines.flatMap((line) => {
    const against = line.review_of ? byId.get(line.review_of) : undefined;
    return against ? [{ line, against }] : [];
  });
};

/**
 * A typed amount, as cents.
 *
 * Blank is a real answer and means "not known yet", which is why the two jet
 * skis sit at zero rather than being left off the sheet. Anything that is not
 * a number is a mistake worth saying out loud rather than quietly storing.
 */
export const parseAmount = (input: string): { ok: true; cents: number } | { ok: false; message: string } => {
  const clean = input.trim().replace(/[$,]/g, "");
  if (!clean) return { ok: true, cents: 0 };
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) {
    return { ok: false, message: "An amount like 750, or leave it blank." };
  }
  const cents = Math.round(Number(clean) * 100);
  if (!Number.isSafeInteger(cents)) return { ok: false, message: "That amount is too large." };
  return { ok: true, cents };
};

/** Only a link a planner could actually follow, and only over the web. */
export const cleanLink = (input: string): { ok: true; url: string | null } | { ok: false; message: string } => {
  const clean = input.trim();
  if (!clean) return { ok: true, url: null };
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return { ok: false, message: "A link starting with https://, or leave it blank." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, message: "A link starting with https://, or leave it blank." };
  }
  return { ok: true, url: parsed.toString().slice(0, 500) };
};

/**
 * What a line has to say for itself before it is worth storing.
 *
 * A category and a label, because a line nobody can name is not a line. The
 * amounts are allowed to be nothing at all: most of a budget starts that way.
 */
export type LineInput = {
  ledger: string;
  category: string;
  label: string;
  planned: string;
  committed: string;
  actual: string;
  status: string;
  note: string;
  vendor: string;
  owner: string;
  link: string;
};

export type ShapedLine =
  | {
      ok: true;
      row: {
        ledger: Ledger;
        category: string;
        label: string;
        planned_cents: number;
        committed_cents: number;
        actual_cents: number;
        status: string;
        note: string | null;
        vendor: string | null;
        owner_name: string | null;
        source_url: string | null;
      };
    }
  | { ok: false; message: string };

export const EVENT_STATUS = ["estimate", "discuss", "committed", "protected"] as const;
export const EQUIPMENT_STATUS = ["to_buy", "ordered", "received"] as const;

export const shapeLine = (input: LineInput): ShapedLine => {
  const ledger: Ledger = input.ledger === "equipment" ? "equipment" : "event";

  const label = input.label.trim().slice(0, 160);
  if (!label) return { ok: false, message: "What is it?" };

  const category = input.category.trim().slice(0, 60) || (ledger === "equipment" ? "Equipment" : "");
  if (!category) return { ok: false, message: "Which category?" };

  const planned = parseAmount(input.planned);
  if (!planned.ok) return planned;
  const committed = parseAmount(input.committed);
  if (!committed.ok) return committed;
  const actual = parseAmount(input.actual);
  if (!actual.ok) return actual;

  const link = cleanLink(input.link);
  if (!link.ok) return link;

  const allowed: readonly string[] = ledger === "equipment" ? EQUIPMENT_STATUS : EVENT_STATUS;
  const status = allowed.includes(input.status)
    ? input.status
    : ledger === "equipment"
      ? "to_buy"
      : "estimate";

  return {
    ok: true,
    row: {
      ledger,
      category,
      label,
      planned_cents: planned.cents,
      committed_cents: committed.cents,
      actual_cents: actual.cents,
      status,
      note: input.note.trim().slice(0, 400) || null,
      vendor: input.vendor.trim().slice(0, 120) || null,
      owner_name: input.owner.trim().slice(0, 120) || null,
      source_url: link.url,
    },
  };
};
