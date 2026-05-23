/**
 * One card in the workshop list view: title, summary, progress, delete.
 */

import { Trash2, CheckCircle2 } from "lucide-react";
import type { WorkshopListItem } from "./types";

export function WorkshopCard({
  item,
  onOpen,
  onDelete,
}: {
  item: WorkshopListItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const pct = item.total_lessons === 0
    ? 0
    : Math.round((100 * item.completed_lessons) / item.total_lessons);
  const finished = item.completed_at != null;

  return (
    <div
      className="group relative p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] hover:border-[#a855f7]/50 transition-colors"
    >
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete workshop"
        title="Delete workshop"
        className="absolute top-3 right-3 p-1.5 rounded-lg text-[#727785] dark:text-[#8c909f] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 size={14} />
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="text-left w-full"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff]">
            {item.difficulty}
          </span>
          {finished && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={10} />
              Complete
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold mb-1 text-[#191c1e] dark:text-white line-clamp-1">
          {item.title}
        </h3>
        <p className="text-sm text-[#424754] dark:text-[#c2c6d6] line-clamp-2 mb-3">
          {item.summary}
        </p>
        <div className="flex items-center justify-between text-xs text-[#727785] dark:text-[#8c909f] mb-1">
          <span>{item.completed_lessons} / {item.total_lessons} lessons</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-[#c2c6d6]/40 dark:bg-[#424754]/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#a855f7] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>
    </div>
  );
}
