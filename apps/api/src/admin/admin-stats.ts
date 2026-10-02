import {
  computeCapitalNeed,
  computeResult,
  type CapitalPlanInput,
  type Hypotheses,
} from "financial-engine";

// Pure aggregations for the admin dashboard. Every financial figure goes through the engine.

export interface IdeaRow {
  id: string;
  createdAt: Date;
  businessModel: string;
  currency: string;
  paidAt: Date | null;
  hypotheses: Hypotheses | null;
  country: string | null;
  profile: string | null;
  stage: string | null;
  heardFrom: string | null;
  utmSource: string | null;
  capital: CapitalPlanInput | null;
}

export interface PaymentRow {
  amount: number;
  currency: string;
  status: "pending" | "approved" | "declined" | "canceled";
  createdAt: Date;
  confirmedAt: Date | null;
}

export const UNKNOWN = "inconnu";
const DAY_MS = 24 * 60 * 60 * 1000;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  // Amounts stay integers (smallest currency unit): the mean of the two middle values is rounded.
  return sorted.length % 2 === 1 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function countBy<T>(rows: T[], keyOf: (row: T) => string | null): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyOf(row) ?? UNKNOWN;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || (a.key === UNKNOWN ? 1 : b.key === UNKNOWN ? -1 : a.key.localeCompare(b.key)));
}

// null when the hypotheses are missing or rejected by the engine (an incomplete idea is skipped, never a 500).
export function holds(row: IdeaRow): boolean | null {
  if (!row.hypotheses) return null;
  try {
    return computeResult(row.hypotheses).estimatedResult >= 0;
  } catch {
    return null;
  }
}

export function holdsShare(rows: IdeaRow[]): number | null {
  const verdicts = rows.map(holds).filter((verdict): verdict is boolean => verdict !== null);
  return verdicts.length === 0 ? null : verdicts.filter(Boolean).length / verdicts.length;
}

function capitalNeed(row: IdeaRow) {
  if (!row.hypotheses || !row.capital) return null;
  try {
    return computeCapitalNeed(row.hypotheses, row.capital);
  } catch {
    return null;
  }
}

export function perBusinessModel(rows: IdeaRow[], currency: string) {
  return countBy(rows, (row) => row.businessModel).map(({ key, count }) => {
    const group = rows.filter((row) => row.businessModel === key);
    // Amounts are only aggregated within one currency: adding XOF and EUR would mean nothing.
    const sameCurrency = group.filter((row) => row.currency === currency && row.hypotheses);
    const needs = sameCurrency.map(capitalNeed).filter((need) => need !== null);
    return {
      key,
      count,
      medianPrice: median(sameCurrency.map((row) => row.hypotheses!.price)),
      medianVolume: median(sameCurrency.map((row) => row.hypotheses!.volume)),
      medianFixedCosts: median(sameCurrency.map((row) => row.hypotheses!.fixedCosts)),
      holdsShare: holdsShare(group),
      withCapital: needs.length,
      medianCapitalNeeded: median(needs.map((need) => need.capitalNeeded)),
      medianFinancingGap: median(needs.map((need) => need.financingGap)),
    };
  });
}

export function conversionBy(rows: IdeaRow[], keyOf: (row: IdeaRow) => string | null) {
  return countBy(rows, keyOf).map(({ key, count }) => {
    const paid = rows.filter((row) => (keyOf(row) ?? UNKNOWN) === key && row.paidAt !== null).length;
    return { key, ideas: count, paid, rate: count === 0 ? 0 : paid / count };
  });
}

// Days are UTC calendar days.
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dailyActivity(rows: IdeaRow[], from: Date, to: Date) {
  const days: { date: string; ideas: number; payments: number }[] = [];
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  for (let time = start; time <= to.getTime(); time += DAY_MS) {
    days.push({ date: dayKey(new Date(time)), ideas: 0, payments: 0 });
  }
  const index = new Map(days.map((day, position) => [day.date, position]));
  for (const row of rows) {
    const created = index.get(dayKey(row.createdAt));
    if (created !== undefined) days[created].ideas += 1;
    const paid = row.paidAt ? index.get(dayKey(row.paidAt)) : undefined;
    if (paid !== undefined) days[paid].payments += 1;
  }
  return days;
}

function mondayOf(date: Date): string {
  const day = date.getUTCDay(); // 0 = Sunday
  const offset = day === 0 ? 6 : day - 1;
  return dayKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - offset)));
}

export function revenueSeries(payments: PaymentRow[]) {
  const approved = payments.filter((payment) => payment.status === "approved");
  const daily = new Map<string, { date: string; revenue: number; approved: number }>();
  const weekly = new Map<string, { weekStart: string; revenue: number }>();

  for (const payment of approved) {
    const when = payment.confirmedAt ?? payment.createdAt;
    const date = dayKey(when);
    const day = daily.get(date) ?? { date, revenue: 0, approved: 0 };
    day.revenue += payment.amount;
    day.approved += 1;
    daily.set(date, day);

    const weekStart = mondayOf(when);
    const week = weekly.get(weekStart) ?? { weekStart, revenue: 0 };
    week.revenue += payment.amount;
    weekly.set(weekStart, week);
  }

  const count = (status: PaymentRow["status"]) => payments.filter((payment) => payment.status === status).length;
  return {
    total: approved.reduce((sum, payment) => sum + payment.amount, 0),
    approved: approved.length,
    declined: count("declined"),
    canceled: count("canceled"),
    pending: count("pending"),
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    weekly: [...weekly.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
  };
}
