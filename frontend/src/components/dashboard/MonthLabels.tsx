/**
 * Month labels row above the activity heatmap grid.
 *
 * Each label is positioned by left-padding with an empty flex spacer sized
 * to the column where that month starts. Using flex + spacers rather than
 * absolute positioning keeps the layout in normal flow and avoids clipping
 * or overlap with the weekday-label column on the left.
 */

import type { MonthLabel } from "./dashboardHelpers";

const CELL_SIZE = 14;  // px, matches DayCell width
const GAP = 4;         // px, matches gap-1

function columnOffset(col: number): number {
  return col * (CELL_SIZE + GAP);
}

export function MonthLabels({ labels }: { labels: MonthLabel[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="relative h-5 mb-1" aria-hidden="true">
      {labels.map(({ label, colIndex }) => (
        <span
          key={`${label}-${colIndex}`}
          className="absolute text-xs text-ink-faint"
          style={{ left: columnOffset(colIndex) }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
