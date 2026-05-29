/**
 * "Almost there" — surfaces the 2-3 badges the user is closest to earning,
 * right on the main dashboard, as a motivational nudge.
 *
 * A badge qualifies when it's unearned, metric-backed, and partially complete
 * (0 < progress < 1). Sorted by how close it is. Renders nothing when the user
 * has no in-progress badges (brand-new users see a clean dashboard instead).
 * Clicking a row opens the shared detail modal via `onSelect`.
 */

import { Zap } from "lucide-react";
import type { AchievementItem } from "../../types/api";
import { hasProgress, progressFraction } from "./achievementHelpers";
import { AchievementProgressBar } from "./AchievementProgressBar";

const MAX_NUDGES = 3;

export function AlmostThere({
  items,
  onSelect,
}: {
  items: AchievementItem[];
  onSelect: (code: string) => void;
}) {
  const closest = items
    .filter((i) => !i.is_earned && hasProgress(i))
    .map((i) => ({ item: i, fraction: progressFraction(i) }))
    .filter((x) => x.fraction > 0 && x.fraction < 1)
    .sort((a, b) => b.fraction - a.fraction)
    .slice(0, MAX_NUDGES)
    .map((x) => x.item);

  if (closest.length === 0) return null;

  return (
    <section>
      <header className="flex items-center gap-2 mb-3">
        <Zap size={18} className="text-[#a855f7]" />
        <h2 className="text-base font-semibold text-[#191c1e] dark:text-white">
          Almost there
        </h2>
      </header>

      <div className="space-y-3">
        {closest.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => onSelect(item.code)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] hover:border-[#a855f7] dark:hover:border-[#a855f7] transition-colors text-left"
          >
            <span className="text-2xl shrink-0">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#191c1e] dark:text-white truncate mb-1.5">
                {item.name}
              </div>
              <AchievementProgressBar item={item} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
