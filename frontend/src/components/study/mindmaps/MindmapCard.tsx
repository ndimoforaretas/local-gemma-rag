/**
 * One mindmap card in the list view: title, export count, delete.
 */

import { Trash2, Download } from "lucide-react";
import type { MindmapListItem } from "./types";

function dateLabel(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MindmapCard({
  item,
  onOpen,
  onDelete,
}: {
  item: MindmapListItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] hover:border-[#a855f7]/50 transition-colors">
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete mindmap"
        title="Delete mindmap"
        className="absolute top-3 right-3 p-1.5 rounded-lg text-ink-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 size={14} />
      </button>

      <button type="button" onClick={onOpen} className="text-left w-full">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff]">
            Depth {item.depth}
          </span>
          {item.export_count > 0 && (
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Download size={10} /> {item.export_count}
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold mb-1 text-ink-strong line-clamp-2">
          {item.title}
        </h3>
        <p className="text-xs text-ink-muted">
          Created {dateLabel(item.created_at)}
        </p>
      </button>
    </div>
  );
}
