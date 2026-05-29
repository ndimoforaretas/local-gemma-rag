import type { AchievementItem } from "../../types/api";
import { progressFraction, progressText } from "./achievementHelpers";

/** Labelled progress bar toward a badge's target (emerald once complete). */
export function AchievementProgressBar({ item }: { item: AchievementItem }) {
  const earned = item.is_earned;
  const pct = Math.round(progressFraction(item) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {earned ? "Complete" : "Progress"}
        </span>
        <span className="text-xs font-semibold tabular-nums text-ink">
          {progressText(item)}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[#eceef0] dark:bg-[#272a31] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${earned ? "bg-emerald-500" : "bg-[#a855f7]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
