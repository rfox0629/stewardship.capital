/**
 * What the money adds up to, and what a planner is allowed to type.
 *
 * Two questions, and they are not the same question. Whether a line spends
 * the engagement's budget, and whether SHINE still owns the thing in January,
 * are independent: food counts and is gone, an espresso machine counts and is
 * kept, a speaker paid for from somewhere else does not count and is kept.
 * Nothing here derives either answer from the other.
 *
 * There is one counting rule, applied three times. A line contributes to a
 * total unless an ancestor already contributed to the same total, because a
 * $750 machine named inside a $1,500 allocation is detail about money already
 * counted rather than another $750 of spending. The same rule keeps a kept
 * thing inside a kept thing from being kept twice.
 *
 * Every figure in the product is derived from the lines. Nothing keeps its own
 * running number, so no summary can drift away from what it is summarising.
 */

export type Kind = "allocation" | "purchase";

export type Line = {
  id: string;
  kind: string;
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
  /** Does this spend the engagement's budget? */
  counts_toward_budget: boolean;
  /** Does the thing outlive the event? */
  reusable: boolean;
  reuse_note: string | null;
  /** Detail about money already counted on that line. */
  parent_id: string | null;
};

export type Totals = { planned: number; committed: number; spent: number };

const ZERO: Totals = { planned: 0, committed: 0, spent: 0 };

const add = (running: Totals, line: Line): Totals => ({
  planned: running.planned + line.planned_cents,
  committed: running.committed + line.committed_cents,
  spent: running.spent + line.actual_cents,
});

/**
 * The lines that carry a total, without carrying it twice.
 *
 * A line counts when it matches, and when nothing above it already matched.
 * Everything on this screen is one of these: what the weekend is spending,
 * what is being bought from elsewhere, and what SHINE keeps.
 *
 * A parent chain that loops, or points at a line that is gone, is treated as
 * no parent: a total that silently omits a line is worse than one that
 * includes a line whose parent has been deleted.
 */
export const contributors = (
  lines: readonly Line[],
  matches: (line: Line) => boolean,
): Line[] => {
  const byId = new Map(lines.map((line) => [line.id, line]));

  /* The chain above a line, or null when it loops. A loop is nonsense data
     and the safest reading of nonsense is that the line has no parent: a
     total that quietly omits money is worse than one that includes it. */
  const chainAbove = (line: Line): Line[] | null => {
    const chain: Line[] = [];
    const seen = new Set<string>([line.id]);
    let above = line.parent_id ? byId.get(line.parent_id) : undefined;
    while (above) {
      if (seen.has(above.id)) return null;
      seen.add(above.id);
      chain.push(above);
      above = above.parent_id ? byId.get(above.parent_id) : undefined;
    }
    return chain;
  };

  const coveredAbove = (line: Line): boolean => {
    const chain = chainAbove(line);
    return chain !== null && chain.some(matches);
  };

  return lines.filter((line) => matches(line) && !coveredAbove(line));
};

const countsToward = (line: Line) => line.counts_toward_budget;
const isKept = (line: Line) => line.reusable;

/** What the weekend is spending against its ceiling. */
export const eventTotals = (lines: readonly Line[]): Totals =>
  contributors(lines, countsToward).reduce(add, ZERO);

/** What is being bought for the weekend from somewhere other than its budget. */
export const outsideTotals = (lines: readonly Line[]): Totals =>
  contributors(lines, (line) => !line.counts_toward_budget).reduce(add, ZERO);

/**
 * What SHINE still owns afterwards.
 *
 * Deliberately not accounting. No depreciation, no useful life, no saving
 * against renting: it is the planned cost of the things that outlast the
 * weekend, split by where the money came from, so a planner can see that some
 * of the budget bought something lasting.
 */
export type Kept = { total: number; insideBudget: number; outsideBudget: number; lines: Line[] };

export const keptValue = (lines: readonly Line[]): Kept => {
  const kept = contributors(lines, isKept);
  return {
    total: kept.reduce((sum, line) => sum + line.planned_cents, 0),
    insideBudget: kept
      .filter((line) => line.counts_toward_budget)
      .reduce((sum, line) => sum + line.planned_cents, 0),
    outsideBudget: kept
      .filter((line) => !line.counts_toward_budget)
      .reduce((sum, line) => sum + line.planned_cents, 0),
    lines: kept,
  };
};

/** The details named underneath a line, in the order they were entered. */
export const childrenOf = (lines: readonly Line[], parentId: string): Line[] =>
  lines.filter((line) => line.parent_id === parentId);

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

export type LineInput = {
  kind: string;
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
  counts: string;
  reusable: string;
  reuseNote: string;
};

export type ShapedLine =
  | {
      ok: true;
      row: {
        kind: Kind;
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
        counts_toward_budget: boolean;
        reusable: boolean;
        reuse_note: string | null;
      };
    }
  | { ok: false; message: string };

export const ALLOCATION_STATUS = ["estimate", "discuss", "committed", "protected"] as const;
export const PURCHASE_STATUS = ["to_buy", "ordered", "received"] as const;

/**
 * What a line has to say for itself before it is worth storing.
 *
 * A category and a label, because a line nobody can name is not a line. The
 * amounts are allowed to be nothing at all: most of a budget starts that way.
 * The two questions are answered explicitly and never inferred from each
 * other, so a form that omits one is a form that has not asked.
 */
export const shapeLine = (input: LineInput): ShapedLine => {
  const kind: Kind = input.kind === "purchase" ? "purchase" : "allocation";

  const label = input.label.trim().slice(0, 160);
  if (!label) return { ok: false, message: "What is it?" };

  const category = input.category.trim().slice(0, 60) || (kind === "purchase" ? "Equipment" : "");
  if (!category) return { ok: false, message: "Which category?" };

  const planned = parseAmount(input.planned);
  if (!planned.ok) return planned;
  const committed = parseAmount(input.committed);
  if (!committed.ok) return committed;
  const actual = parseAmount(input.actual);
  if (!actual.ok) return actual;

  const link = cleanLink(input.link);
  if (!link.ok) return link;

  const allowed: readonly string[] = kind === "purchase" ? PURCHASE_STATUS : ALLOCATION_STATUS;
  const status = allowed.includes(input.status)
    ? input.status
    : kind === "purchase"
      ? "to_buy"
      : "estimate";

  /* Both answers are "no" unless the form says otherwise, and neither is read
     off the other. An allocation defaults to counting because that is what an
     allocation is; a purchase is asked outright. */
  const reusable = input.reusable === "yes";
  const counts = input.counts === "yes" || (input.counts === "" && kind === "allocation");

  return {
    ok: true,
    row: {
      kind,
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
      counts_toward_budget: counts,
      reusable,
      /* A note about where it goes is only meaningful for a thing that goes
         somewhere, and is never required. */
      reuse_note: reusable ? input.reuseNote.trim().slice(0, 200) || null : null,
    },
  };
};
