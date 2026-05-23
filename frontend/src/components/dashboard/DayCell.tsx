/**
 * Single square in the activity heatmap.
 *
 * Renders a fixed-size button colored by intensity level. Native tooltip
 * (via `title`) gives the date + duration on hover; click bubbles the day
 * up to the parent so the dashboard can open the detail modal.
 *
 * Empty days still render as clickable cells so the user can inspect a
 * "rest day" — that's information too.
 */

import type { DailyActivityEntry } from "../../types/api";
import {
  INTENSITY_COLORS,
  formatDuration,
  formatLongDate,
  intensityLevel,
} from "./dashboardHelpers";

const CELL_SIZE = 14; // px

export function DayCell({
  entry,
  isToday,
  onClick,
}: {
  entry: DailyActivityEntry;
  isToday: boolean;
  onClick: (entry: DailyActivityEntry) => void;
}) {
  const level = intensityLevel(entry.seconds);
  const color = INTENSITY_COLORS[level];
  const empty = level === 0;
  const tooltip =
    `${formatLongDate(entry.date)}\n` +
    (empty
      ? "No study activity"
      : `${formatDuration(entry.seconds)} · ${entry.session_count} session${entry.session_count === 1 ? "" : "s"}`);

  return (
    <button
      type="button"
      onClick={() => onClick(entry)}
      title={tooltip}
      aria-label={tooltip}
      className={`
        rounded-[3px] transition-transform hover:scale-110 hover:ring-2 hover:ring-[#a855f7]/50 focus:outline-none focus:ring-2 focus:ring-[#a855f7]
        ${isToday ? "ring-1 ring-[#a855f7] ring-offset-1 ring-offset-[#10131a]" : ""}
        ${empty ? "border border-[#c2c6d6]/30 dark:border-[#424754]/40" : ""}
      `}
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: color,
      }}
    />
  );
}
