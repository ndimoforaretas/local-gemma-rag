/**
 * Question navigator grid for exam mode.
 *
 * Shows every question as a numbered cell so the user can jump anywhere and
 * see at a glance what's answered, flagged, or still blank. Stateless.
 */

import { Flag } from "lucide-react";

export interface QuestionNavigatorProps {
  total: number;
  current: number;
  answers: (number | null)[];
  flagged: Set<number>;
  onJump: (idx: number) => void;
}

export function QuestionNavigator({
  total,
  current,
  answers,
  flagged,
  onJump,
}: QuestionNavigatorProps) {
  return (
    <div className="p-4 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-ink-strong">Questions</span>
        <span className="text-xs text-ink-muted tabular-nums">
          {answers.filter((a) => a !== null).length}/{total} answered
        </span>
      </div>

      <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
        {Array.from({ length: total }, (_, idx) => {
          const isCurrent = idx === current;
          const isAnswered = answers[idx] != null;
          const isFlagged = flagged.has(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onJump(idx)}
              aria-label={`Question ${idx + 1}${isAnswered ? ", answered" : ""}${
                isFlagged ? ", flagged" : ""
              }`}
              className={`
                relative aspect-square rounded-lg text-sm font-semibold tabular-nums
                flex items-center justify-center transition-all
                ${
                  isCurrent
                    ? "ring-2 ring-[#a855f7] ring-offset-1 ring-offset-white dark:ring-offset-[#191b23]"
                    : ""
                }
                ${
                  isFlagged
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/50 hover:bg-amber-500/25"
                    : isAnswered
                    ? "bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff] border border-[#a855f7]/40 hover:bg-[#a855f7]/25"
                    : "bg-transparent text-ink-muted border border-[#c2c6d6] dark:border-[#424754] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 hover:text-[#a855f7] dark:hover:text-[#ddb7ff]"
                }
              `}
            >
              {idx + 1}
              {isFlagged && (
                <Flag
                  size={10}
                  className="absolute -top-1 -right-1 text-amber-500 fill-amber-500"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#a855f7]/15 border border-[#a855f7]/40" />
          Answered
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-[#c2c6d6] dark:border-[#424754]" />
          Blank
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Flag size={11} className="text-amber-500 fill-amber-500" />
          Flagged
        </span>
      </div>
    </div>
  );
}
