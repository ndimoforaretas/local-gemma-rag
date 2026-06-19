/**
 * Shared section heading for the dashboard — one place that controls heading
 * size + contrast, so every section stays consistent and accessible
 * (see DESIGN_RULES.md §2).
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SectionHeading({
  icon: Icon,
  title,
  hint,
  right,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between mb-5 flex-wrap gap-2">
      <div className="flex items-center gap-2.5 flex-wrap">
        <Icon size={22} className="text-[#a855f7]" />
        <h2 className="text-xl sm:text-2xl font-bold text-ink-strong tracking-tight">
          {title}
        </h2>
        {hint && <span className="text-xs text-ink-faint">{hint}</span>}
      </div>
      {right}
    </header>
  );
}
