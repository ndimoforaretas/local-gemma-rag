/**
 * Detail modal for a single achievement badge.
 *
 * Shows what the badge is, the user's progress toward it (or the date earned),
 * and the next badge up the same family ladder (clickable to jump). Mirrors
 * DayDetailModal's close behaviour (backdrop / Esc / X, body-scroll lock).
 */

import { useEffect } from "react";
import { Lock, X } from "lucide-react";
import type { AchievementItem } from "../../types/api";
import { findNext, hasProgress } from "./achievementHelpers";
import { AchievementProgressBar } from "./AchievementProgressBar";
import { NextLevelCard } from "./NextLevelCard";

function earnedDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function AchievementDetailModal({
  item,
  allItems,
  onClose,
  onNavigate,
}: {
  item: AchievementItem;
  allItems: AchievementItem[];
  onClose: () => void;
  onNavigate: (code: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const earned = item.is_earned;
  const next = findNext(item, allItems);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between px-5 py-4 border-b border-[#c2c6d6] dark:border-[#424754]">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`relative inline-flex items-center justify-center w-14 h-14 rounded-2xl text-4xl bg-[#a855f7]/10 ${earned ? "" : "grayscale opacity-70"}`}>
              {item.icon}
              {!earned && (
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#727785] dark:bg-[#424754] text-white flex items-center justify-center">
                  <Lock size={10} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-ink-strong truncate">{item.name}</h2>
              <p className={`text-sm font-medium ${earned ? "text-emerald-600 dark:text-emerald-400" : "text-ink-muted"}`}>
                {earned ? (item.earned_at ? `Earned ${earnedDate(item.earned_at)}` : "Earned") : "Locked"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-[#f2f4f6] dark:hover:bg-[#272a31] text-ink-muted shrink-0"
          >
            <X size={16} />
          </button>
        </header>

        <div className="p-6 space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
              How to earn it
            </div>
            <p className="text-sm text-ink">{item.description}</p>
          </div>

          {hasProgress(item) && <AchievementProgressBar item={item} />}

          {next && <NextLevelCard next={next} onNavigate={onNavigate} />}
        </div>
      </div>
    </div>
  );
}
