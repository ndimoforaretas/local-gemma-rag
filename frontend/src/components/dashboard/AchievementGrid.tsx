/**
 * Responsive, vertically-scrollable grid of achievement badges.
 *
 * Replaces the older horizontal strip — a grid reads more naturally and lets
 * the user scroll downward (the expected direction) to see every badge.
 * Earned badges float to the front; locked ones trail so progress shows first.
 */

import { useState } from "react";
import { Trophy } from "lucide-react";
import type { AchievementItem } from "../../types/api";
import { AchievementBadge } from "./AchievementBadge";
import { AchievementDetailModal } from "./AchievementDetailModal";

export function AchievementGrid({ items }: { items: AchievementItem[] }) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const sorted = [...items].sort((a, b) => {
    if (a.is_earned !== b.is_earned) return a.is_earned ? -1 : 1;
    // Within earned, most recent first.
    if (a.earned_at && b.earned_at) return b.earned_at - a.earned_at;
    return 0;
  });

  const earnedCount = items.filter((i) => i.is_earned).length;
  const selected = items.find((i) => i.code === selectedCode) ?? null;

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

      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[28rem] overflow-y-auto pr-1 -mr-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {sorted.map((item) => (
          <AchievementBadge
            key={item.code}
            item={item}
            onSelect={(it) => setSelectedCode(it.code)}
          />
        ))}
      </div>

      {selected && (
        <AchievementDetailModal
          item={selected}
          allItems={items}
          onClose={() => setSelectedCode(null)}
          onNavigate={setSelectedCode}
        />
      )}
    </section>
  );
}
