/**
 * Single saved-quiz card in the quiz library. Click to replay; trash to delete.
 */

import { Trash2, ListChecks, Play, CheckCircle2 } from "lucide-react";
import type { SavedQuizListItem } from "./types";

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function QuizCard({
  item,
  onOpen,
  onDelete,
}: {
  item: SavedQuizListItem;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] hover:border-[#a855f7]/50 transition-colors">
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete quiz"
        title="Delete quiz"
        className="absolute top-3 right-3 p-1.5 rounded-lg text-ink-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
      >
        <Trash2 size={14} />
      </button>

      <button type="button" onClick={onOpen} className="text-left w-full">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff]">
            {item.difficulty}
          </span>
          {item.completed && (
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={10} /> {item.last_score}%
            </span>
          )}
          {item.in_progress && (
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Play size={9} className="fill-current" /> In progress
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold mb-3 text-ink-strong line-clamp-1">
          {item.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <ListChecks size={13} className="text-[#a855f7]" />
            {item.in_progress
              ? `${item.answered_count} / ${item.question_count} answered · Resume`
              : item.completed
                ? `${item.question_count} questions · View results`
                : `${item.question_count} questions`}
          </span>
          <span>{formatDate(item.created_at)}</span>
        </div>
      </button>
    </div>
  );
}
