/**
 * "Resume your in-progress quiz?" banner shown above the config form
 * when localStorage has an unfinished quiz.
 *
 * Renders only when ``savedQuiz`` is non-null; the parent owns the decision
 * to show or hide.
 */

import { RotateCcw, Trash2 } from "lucide-react";
import type { PersistedQuiz } from "./useQuizPersistence";

function formatAgo(deltaMs: number): string {
  const mins = Math.floor(deltaMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ResumeQuizBanner({
  savedQuiz,
  onResume,
  onDiscard,
}: {
  savedQuiz: PersistedQuiz;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const { config, questions, current, savedAt } = savedQuiz;
  const ago = formatAgo(Date.now() - savedAt);
  const progressText = `Question ${current + 1} of ${questions.length}`;
  const diffLabel =
    config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1);

  return (
    <div className="mb-6 p-4 rounded-2xl border border-[#a855f7]/40 bg-[#a855f7]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-[#191c1e] dark:text-[#e1e2ec]">
          Resume your in-progress quiz?
        </p>
        <p className="text-sm text-[#424754] dark:text-[#c2c6d6] mt-0.5">
          {diffLabel} · {progressText} · saved {ago}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={onResume}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
        >
          <RotateCcw size={14} />
          Resume
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#c2c6d6] dark:border-[#424754] hover:border-rose-500/50 hover:text-rose-500 text-sm font-medium text-[#424754] dark:text-[#c2c6d6] transition-colors"
        >
          <Trash2 size={14} />
          Discard
        </button>
      </div>
    </div>
  );
}
