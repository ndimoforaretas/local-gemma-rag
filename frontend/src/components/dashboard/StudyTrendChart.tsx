/**
 * Weekly study-time trend — a compact bar chart showing momentum over the
 * last ~12 weeks. Derived from the dashboard's existing daily data, so it
 * adds no network cost. Hidden entirely when there's no activity yet.
 */

import { TrendingUp } from "lucide-react";
import type { DailyActivityEntry } from "../../types/api";
import { formatDuration } from "./dashboardHelpers";
import { weeklyTotals } from "./trendHelpers";
import { SectionHeading } from "./SectionHeading";

export function StudyTrendChart({ days }: { days: DailyActivityEntry[] }) {
  const weeks = weeklyTotals(days, 12);
  const max = Math.max(...weeks.map((w) => w.seconds), 1);
  const total = weeks.reduce((sum, w) => sum + w.seconds, 0);

  if (total <= 0) return null;

  return (
    <section>
      <SectionHeading
        icon={TrendingUp}
        title="Study time"
        right={
          <span className="text-sm font-medium text-ink-muted">
            {formatDuration(total)} · last {weeks.length} weeks
          </span>
        }
      />

      <div className="flex items-end gap-1.5 h-32 border-b border-[#c2c6d6] dark:border-[#424754]">
        {weeks.map((w, i) => {
          const isLast = i === weeks.length - 1;
          const pct = w.seconds > 0 ? Math.max((w.seconds / max) * 100, 6) : 0;
          return (
            <div
              key={w.weekStart}
              className="flex-1 h-full flex flex-col justify-end"
              title={`Week of ${w.label}: ${formatDuration(w.seconds)}`}
            >
              <div
                className={`rounded-t-md transition-colors ${
                  isLast
                    ? "bg-[#a855f7]"
                    : "bg-[#a855f7]/55 hover:bg-[#a855f7]"
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 text-xs text-ink-faint">
        <span>{weeks[0]?.label}</span>
        <span>This week</span>
      </div>
    </section>
  );
}
