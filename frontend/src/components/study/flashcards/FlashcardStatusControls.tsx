/**
 * Small UI primitives for flashcard status:
 *   - StatusBadge   shown on the front when a card has been marked
 *   - StatusButton  the Got it / Review pair on the back
 */

import type { FlashcardStatus } from "./types";

export function StatusBadge({ status }: { status: FlashcardStatus }) {
  if (!status) return null;
  if (status === "mastered") {
    return (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        Mastered
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
      Review
    </span>
  );
}

export function StatusButton({
  tone,
  active,
  onClick,
  icon,
  label,
}: {
  tone: "emerald" | "amber";
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
}) {
  const activeCls =
    tone === "emerald"
      ? "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
      : "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300";
  const hoverCls =
    tone === "emerald"
      ? "hover:border-emerald-500/60"
      : "hover:border-amber-500/60";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 border transition-colors ${
        active
          ? activeCls
          : `border-[#c2c6d6] dark:border-[#424754] ${hoverCls} text-ink-muted`
      }`}
    >
      {icon} {label}
    </button>
  );
}
