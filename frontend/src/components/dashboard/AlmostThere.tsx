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
import { inProgressBadges } from "./achievementHelpers";
import { AchievementProgressBar } from "./AchievementProgressBar";
import { SectionHeading } from "./SectionHeading";

const MAX_NUDGES = 3;

export function AlmostThere({
  items,
  onSelect,
}: {
  items: AchievementItem[];
  onSelect: (code: string) => void;
}) {
  const closest = inProgressBadges(items).slice(0, MAX_NUDGES);

  if (closest.length === 0) return null;

  return (
    <section>
      <SectionHeading icon={Zap} title="Almost there" />

      <div className="space-y-3">
        {closest.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => onSelect(item.code)}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] hover:border-[#a855f7] dark:hover:border-[#a855f7] transition-colors text-left"
          >
            <span className="text-2xl shrink-0">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink-strong truncate mb-1.5">
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
