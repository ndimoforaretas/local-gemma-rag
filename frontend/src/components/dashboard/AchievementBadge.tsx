/**
 * A single achievement card.
 *
 * Earned → emerald border + tint + check, so "done" is scannable at a glance
 *          (DESIGN_RULES.md §4: earned/success = emerald).
 * Locked → neutral surface, dimmed, lock icon overlay.
 *
 * Built as a button (not a div) so keyboard users can focus and read the
 * native tooltip via the `title` attribute. Meaning isn't colour-only — the
 * earned state also carries a check icon, the locked state a lock.
 */

import { Check, Lock } from "lucide-react";
import type { AchievementItem } from "../../types/api";

function earnedDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AchievementBadge({
  item,
  onSelect,
}: {
  item: AchievementItem;
  onSelect?: (item: AchievementItem) => void;
}) {
  const earned = item.is_earned;
  const title = earned
    ? `${item.name} — earned ${item.earned_at ? earnedDate(item.earned_at) : ""}\n${item.description}`
    : `${item.name} (locked)\n${item.description}`;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={() => onSelect?.(item)}
      className={`
        w-full h-full p-4 rounded-2xl border-2 text-center transition-all
        ${
          earned
            ? "bg-white dark:bg-[#191b23] border-emerald-500 dark:border-emerald-500/70 shadow-sm shadow-emerald-500/10 hover:border-emerald-400"
            : "bg-[#f2f4f6] dark:bg-[#191b23]/60 border-[#c2c6d6]/50 dark:border-[#424754]/50 hover:border-[#c2c6d6] dark:hover:border-[#424754]"
        }
      `}
    >
      <div
        className={`relative inline-flex items-center justify-center w-12 h-12 rounded-xl mx-auto mb-2.5 text-3xl ${
          earned ? "bg-[#a855f7]/10" : "bg-[#727785]/10 dark:bg-[#424754]/30"
        }`}
      >
        <span className={earned ? "" : "grayscale opacity-50"}>{item.icon}</span>
        {earned ? (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-[#191b23]">
            <Check size={11} strokeWidth={3.5} />
          </span>
        ) : (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#727785] dark:bg-[#424754] text-white flex items-center justify-center">
            <Lock size={10} strokeWidth={3} />
          </span>
        )}
      </div>
      <div
        className={`text-sm font-bold leading-tight ${
          earned ? "text-ink-strong" : "text-ink-muted"
        }`}
      >
        {item.name}
      </div>
      <p
        className={`text-xs mt-1.5 leading-snug line-clamp-2 ${
          earned ? "text-ink-muted" : "text-ink-faint"
        }`}
      >
        {item.description}
      </p>
    </button>
  );
}
