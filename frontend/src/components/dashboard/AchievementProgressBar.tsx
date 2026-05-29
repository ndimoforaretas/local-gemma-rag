import type { AchievementItem } from "../../types/api";
import { progressFraction, progressText } from "./achievementHelpers";

/** Labelled progress bar toward a badge's target (emerald once complete). */
export function AchievementProgressBar({ item }: { item: AchievementItem }) {
  const earned = item.is_earned;
  const pct = Math.round(progressFraction(item) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
          {earned ? "Complete" : "Progress"}
        </span>
        <span className="text-xs font-medium tabular-nums text-[#424754] dark:text-[#c2c6d6]">
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
