/**
 * Horizontally scrollable strip of achievement badges.
 *
 * Earned badges float to the front; locked ones trail behind so the user
 * always sees their progress first. Scroll bar styled minimally so it
 * doesn't dominate the look.
 */

import { Trophy } from "lucide-react";
import type { AchievementItem } from "../../types/api";
import { AchievementBadge } from "./AchievementBadge";

export function AchievementStrip({ items }: { items: AchievementItem[] }) {
  const sorted = [...items].sort((a, b) => {
    if (a.is_earned !== b.is_earned) return a.is_earned ? -1 : 1;
    // Within earned, most recent first.
    if (a.earned_at && b.earned_at) return b.earned_at - a.earned_at;
    return 0;
  });

  const earnedCount = items.filter((i) => i.is_earned).length;

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-[#a855f7]" />
          <h2 className="text-base font-semibold text-[#191c1e] dark:text-white">
            Achievements
          </h2>
        </div>
        <span className="text-xs font-medium text-[#727785] dark:text-[#8c909f]">
          {earnedCount} / {items.length} earned
        </span>
      </header>

      <div className="relative">
        <div
          className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory"
          style={{ scrollbarWidth: "thin" }}
        >
          {sorted.map((item) => (
            <div key={item.code} className="snap-start">
              <AchievementBadge item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
