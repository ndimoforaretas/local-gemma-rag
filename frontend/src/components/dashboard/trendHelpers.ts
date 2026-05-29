/**
 * Aggregation helpers for the study-time trend chart.
 *
 * The dashboard already fetches ~90 days of zero-filled daily activity, so the
 * weekly trend is derived entirely client-side — no extra endpoint needed.
 */

import type { DailyActivityEntry } from "../../types/api";
import { getWeekdayIdx, parseISODate } from "./dashboardHelpers";

export interface WeekBucket {
  /** ISO date (YYYY-MM-DD) of the Monday that starts the week. */
  weekStart: string;
  /** Short human label, e.g. "May 5". */
  label: string;
  seconds: number;
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Bucket daily entries into Monday-started weeks, returning the most recent
 * `maxWeeks` ordered oldest → newest. Weeks with no activity still appear
 * (the daily feed is zero-filled), so the trend line stays continuous.
 */
export function weeklyTotals(
  days: DailyActivityEntry[],
  maxWeeks = 12,
): WeekBucket[] {
  const byWeek = new Map<string, number>();
  for (const entry of days) {
    const date = parseISODate(entry.date);
    const monday = new Date(date);
    monday.setDate(date.getDate() - getWeekdayIdx(date));
    const key = isoOf(monday);
    byWeek.set(key, (byWeek.get(key) ?? 0) + entry.seconds);
  }

  return [...byWeek.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-maxWeeks)
    .map(([weekStart, seconds]) => ({
      weekStart,
      seconds,
      label: parseISODate(weekStart).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));
}
