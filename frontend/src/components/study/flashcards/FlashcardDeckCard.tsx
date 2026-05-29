/**
 * Single deck card in the deck list.
 */

import { Trash2, CheckCircle2 } from "lucide-react";
import type { FlashcardDeckListItem } from "./types";

export function FlashcardDeckCard({
  item,
  onOpen,
  onDelete,
}: {
  item: FlashcardDeckListItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const pct = item.card_count === 0
    ? 0
    : Math.round((100 * item.mastered_count) / item.card_count);
  const mastered = pct === 100;

  return (
    <div className="relative p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] hover:border-[#a855f7]/50 transition-colors">
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete deck"
        title="Delete deck"
        className="absolute top-3 right-3 p-1.5 rounded-lg text-ink-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 size={14} />
      </button>

      <button type="button" onClick={onOpen} className="text-left w-full">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff]">
            {item.difficulty}
          </span>
          {mastered && (
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={10} /> Mastered
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold mb-3 text-ink-strong line-clamp-1">
          {item.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
          <span>{item.mastered_count} / {item.card_count} mastered</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-[#c2c6d6]/40 dark:bg-[#424754]/40 rounded-full overflow-hidden">
          <div className="h-full bg-[#a855f7] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </button>
    </div>
  );
}
