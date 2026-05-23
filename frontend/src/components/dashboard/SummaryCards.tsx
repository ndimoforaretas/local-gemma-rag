/**
 * Three big stat cards across the top of the dashboard.
 *
 * Pure presentational — parent owns the data, this just lays out the cards.
 */

import { Clock, Layers, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProgressSummary } from "../../types/api";
import { formatDuration } from "./dashboardHelpers";

export function SummaryCards({ data }: { data: ProgressSummary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        icon={Clock}
        label="Total study time"
        value={formatDuration(data.total_seconds)}
        accent="text-[#a855f7]"
      />
      <StatCard
        icon={Layers}
        label="Study sessions"
        value={String(data.total_sessions)}
        sublabel={`${data.total_messages} messages sent`}
        accent="text-emerald-500"
      />
      <StatCard
        icon={Flame}
        label="Current streak"
        value={
          data.current_streak_days > 0
            ? `${data.current_streak_days} day${data.current_streak_days === 1 ? "" : "s"}`
            : "—"
        }
        sublabel={data.current_streak_days > 0 ? "Keep it going!" : "Study today to start a streak"}
        accent="text-amber-500"
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  accent: string;
}) {
  return (
    <div className="p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={accent} />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-[#191c1e] dark:text-white tabular-nums">
        {value}
      </div>
      {sublabel && (
        <p className="text-xs text-[#727785] dark:text-[#8c909f] mt-1">
          {sublabel}
        </p>
      )}
    </div>
  );
}
