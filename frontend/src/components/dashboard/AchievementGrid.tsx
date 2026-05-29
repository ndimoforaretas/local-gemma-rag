/**
 * Responsive, vertically-scrollable grid of achievement badges.
 *
 * Replaces the older horizontal strip — a grid reads more naturally and lets
 * the user scroll downward (the expected direction) to see every badge.
 * Earned badges float to the front; locked ones trail so progress shows first.
 *
 * The detail modal is owned by ProgressDashboard (shared with the "Almost
 * there" nudges), so this component just reports clicks via `onSelect`.
 */

import { Trophy } from "lucide-react";
import type { AchievementItem } from "../../types/api";
import { AchievementBadge } from "./AchievementBadge";
import { SectionHeading } from "./SectionHeading";

export function AchievementGrid({
  items,
  onSelect,
}: {
  items: AchievementItem[];
  onSelect: (code: string) => void;
}) {
  const sorted = [...items].sort((a, b) => {
    if (a.is_earned !== b.is_earned) return a.is_earned ? -1 : 1;
    // Within earned, most recent first.
    if (a.earned_at && b.earned_at) return b.earned_at - a.earned_at;
    return 0;
  });

  const earnedCount = items.filter((i) => i.is_earned).length;

  return (
    <section>
      <SectionHeading
        icon={Trophy}
        title="Achievements"
        right={
          <span className="text-sm font-semibold text-ink-muted">
            {earnedCount} / {items.length} earned
          </span>
        }
      />

      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[46rem] overflow-y-auto pr-1 -mr-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {sorted.map((item) => (
          <AchievementBadge
            key={item.code}
            item={item}
            onSelect={(it) => onSelect(it.code)}
          />
        ))}
      </div>
    </section>
  );
}
