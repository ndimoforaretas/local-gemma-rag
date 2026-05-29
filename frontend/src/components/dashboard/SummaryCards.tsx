/**
 * Three big stat cards across the top of the dashboard.
 *
 * Pure presentational — parent owns the data, this just lays out the cards.
 */

import { Clock, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProgressSummary } from "../../types/api";
import { formatDuration } from "./dashboardHelpers";
import { StreakCard } from "./StreakCard";

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
      <StreakCard
        current={data.current_streak_days}
        best={data.longest_streak_days}
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
    <div className="p-6 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className={accent} />
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-ink-strong tabular-nums">
        {value}
      </div>
      {sublabel && <p className="text-sm text-ink-muted mt-1.5">{sublabel}</p>}
    </div>
  );
}
