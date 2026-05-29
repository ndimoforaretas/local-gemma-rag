import { ChevronRight } from "lucide-react";
import type { AchievementItem } from "../../types/api";

/** Clickable preview of the next badge up the family ladder. */
export function NextLevelCard({
  next,
  onNavigate,
}: {
  next: AchievementItem;
  onNavigate: (code: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(next.code)}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#c2c6d6] dark:border-[#424754] hover:border-[#a855f7] dark:hover:border-[#a855f7] transition-colors text-left"
    >
      <span className="text-2xl shrink-0">{next.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs uppercase tracking-wider text-ink-muted">
          Next level
        </span>
        <span className="block text-sm font-semibold text-ink-strong truncate">
          {next.name}
        </span>
      </span>
      <ChevronRight size={16} className="text-ink-muted shrink-0" />
    </button>
  );
}
