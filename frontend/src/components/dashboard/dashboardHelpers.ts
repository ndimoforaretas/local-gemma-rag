/**
 * Pure formatting + visualisation helpers for the Progress Dashboard.
 *
 * Kept here so every dashboard component renders the same numbers and colors
 * — change a threshold once, every chart updates.
 */

/** Format seconds as a compact "Nh Nm" or "Nm" or "<1m" label. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return seconds <= 0 ? "0m" : "<1m";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Parse a YYYY-MM-DD ISO date string into a Date at local midnight.
 * Avoids the UTC shift `new Date("2026-05-23")` introduces in some timezones.
 */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

/** Mon=0, Tue=1, … Sun=6 (international week start). */
export function getWeekdayIdx(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** "Mon, 23 May" — used in tooltips and modal headers. */
export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Intensity ramp (GitHub-style) ──────────────────────────────────────────

export type IntensityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * 5-level study-intensity bucket for a day.
 *   0  no activity
 *   1  < 15 min   — quick check-in
 *   2  15–60 min  — focused session
 *   3  1–3 h      — substantial study
 *   4  3+ h       — marathon
 */
export function intensityLevel(seconds: number): IntensityLevel {
  if (seconds <= 0) return 0;
  if (seconds < 15 * 60) return 1;
  if (seconds < 60 * 60) return 2;
  if (seconds < 3 * 60 * 60) return 3;
  return 4;
}

/**
 * Inline-style background color for an intensity bucket. We deliberately use
 * inline rgba (not Tailwind opacity utilities) so the color ramp is exact and
 * doesn't depend on JIT class generation.
 */
export const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  0: "transparent",
  1: "rgba(168, 85, 247, 0.22)",
  2: "rgba(168, 85, 247, 0.45)",
  3: "rgba(168, 85, 247, 0.70)",
  4: "rgba(168, 85, 247, 1.00)",
};

export const INTENSITY_LEGEND: { label: string; level: IntensityLevel }[] = [
  { label: "None", level: 0 },
  { label: "<15m", level: 1 },
  { label: "15–60m", level: 2 },
  { label: "1–3h", level: 3 },
  { label: "3h+", level: 4 },
];

// ── Heatmap helpers ────────────────────────────────────────────────────────

export interface MonthLabel {
  /** Short month name, e.g. "Jan". */
  label: string;
  /** Zero-based grid column index where this month's first day falls. */
  colIndex: number;
}

/**
 * Compute which grid column each month transition falls in, accounting for
 * the `padBefore` filler cells at the start of the heatmap.
 *
 * Returns one entry per month that starts at a different column from the
 * previous label, so short months at the edge don't produce overlapping text.
 */
export function computeMonthLabels(
  dates: string[],
  padBefore: number,
): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let lastCol = -2;
  dates.forEach((iso, i) => {
    const d = parseISODate(iso);
    if (d.getDate() === 1 || i === 0) {
      const col = Math.floor((padBefore + i) / 7);
      if (col !== lastCol && col - lastCol > 1) {
        labels.push({
          label: d.toLocaleDateString(undefined, { month: "short" }),
          colIndex: col,
        });
        lastCol = col;
      }
    }
  });
  return labels;
}

const WEEKDAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

/**
 * Return the name of the weekday with the highest total study seconds, or
 * null when there isn't enough meaningful data (fewer than 2 distinct active
 * weekdays with at least 10 minutes of activity each).
 */
export function busyWeekday(
  days: { date: string; seconds: number }[],
): string | null {
  const totals = new Array<number>(7).fill(0);
  for (const d of days) {
    if (d.seconds > 0) totals[getWeekdayIdx(parseISODate(d.date))] += d.seconds;
  }
  const active = totals.filter((s) => s >= 600).length;
  if (active < 2) return null;
  const best = totals.indexOf(Math.max(...totals));
  return WEEKDAY_NAMES[best];
}
