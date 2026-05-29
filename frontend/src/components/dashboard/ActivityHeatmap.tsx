/**
 * GitHub-style activity heatmap — 7 rows (Mon→Sun), N columns (weeks),
 * purple-intensity cells.
 *
 * The CSS-grid layout uses `grid-flow-col` so cells fill column-by-column.
 * Empty filler cells before the first real day push the first column down
 * to the correct weekday, mirroring how GitHub aligns its weeks.
 */

import { Calendar } from "lucide-react";
import type { DailyActivityEntry } from "../../types/api";
import { DayCell } from "./DayCell";
import { MonthLabels } from "./MonthLabels";
import { HeatmapLegend } from "./HeatmapLegend";
import {
  busyWeekday,
  computeMonthLabels,
  getWeekdayIdx,
  parseISODate,
} from "./dashboardHelpers";

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

export function ActivityHeatmap({
  days,
  onSelectDay,
}: {
  days: DailyActivityEntry[];
  onSelectDay: (entry: DailyActivityEntry) => void;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const padBefore = days.length > 0 ? getWeekdayIdx(parseISODate(days[0].date)) : 0;
  const monthLabels = computeMonthLabels(days.map((d) => d.date), padBefore);
  const bestDay = busyWeekday(days);

  return (
    <section>
      <header className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#a855f7]" />
          <h2 className="text-base font-semibold text-[#191c1e] dark:text-white">
            Activity heatmap
          </h2>
          <span className="text-xs text-[#727785] dark:text-[#8c909f]">
            (last {days.length} days · click any day for details)
          </span>
        </div>
        <HeatmapLegend />
      </header>

      <div className="p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]">
        <div className="flex gap-2">
          {/* Weekday labels (Mon, Wed, Fri shown; others blank for breathing room) */}
          <div className="grid grid-rows-7 gap-1 text-[10px] text-[#727785] dark:text-[#8c909f]">
            {/* Spacer to align weekday labels below the month-label row */}
            <div className="h-5 mb-1" />
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={i} className="h-[14px] leading-[14px] pr-1">{label}</div>
            ))}
          </div>

          {/* Month labels + grid */}
          <div className="min-w-0">
            <MonthLabels labels={monthLabels} />
            <div className="grid grid-rows-7 grid-flow-col gap-1">
              {Array.from({ length: padBefore }).map((_, i) => (
                <div key={`pad-${i}`} style={{ width: 14, height: 14 }} />
              ))}
              {days.map((entry) => (
                <DayCell
                  key={entry.date}
                  entry={entry}
                  isToday={entry.date === todayIso}
                  onClick={onSelectDay}
                />
              ))}
            </div>
          </div>
        </div>

        {bestDay && (
          <p className="mt-3 text-[11px] text-[#727785] dark:text-[#8c909f]">
            📅 Your most active day: <span className="font-semibold text-[#424754] dark:text-[#c2c6d6]">{bestDay}</span>
          </p>
        )}
      </div>
    </section>
  );
}

