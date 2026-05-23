/**
 * A single achievement card.
 *
 * Earned → full color + soft glow.
 * Locked → grayscale + lock icon overlay, description still visible on hover/tap.
 *
 * Built as a button (not a div) so keyboard users can focus and read the
 * native tooltip via the `title` attribute.
 */

import { Lock } from "lucide-react";
import type { AchievementItem } from "../../types/api";

function earnedDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AchievementBadge({ item }: { item: AchievementItem }) {
  const earned = item.is_earned;
  const title = earned
    ? `${item.name} — earned ${item.earned_at ? earnedDate(item.earned_at) : ""}\n${item.description}`
    : `${item.name} (locked)\n${item.description}`;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`
        shrink-0 w-32 sm:w-36 p-3 rounded-2xl border text-center transition-all
        ${
          earned
            ? "bg-white dark:bg-[#191b23] border-[#a855f7]/40 shadow-md shadow-[#a855f7]/10 hover:border-[#a855f7]"
            : "bg-[#f2f4f6] dark:bg-[#191b23]/50 border-[#c2c6d6]/40 dark:border-[#424754]/40 opacity-60 hover:opacity-80"
        }
      `}
    >
      <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl mx-auto mb-2 text-3xl bg-[#a855f7]/10">
        <span className={earned ? "" : "grayscale"}>{item.icon}</span>
        {!earned && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#727785] dark:bg-[#424754] text-white flex items-center justify-center">
            <Lock size={10} strokeWidth={3} />
          </div>
        )}
      </div>
      <div
        className={`text-sm font-semibold leading-tight ${
          earned
            ? "text-[#191c1e] dark:text-white"
            : "text-[#727785] dark:text-[#8c909f]"
        }`}
      >
        {item.name}
      </div>
      <p className="text-[11px] mt-1 leading-snug text-[#727785] dark:text-[#8c909f] line-clamp-2">
        {item.description}
      </p>
    </button>
  );
}
