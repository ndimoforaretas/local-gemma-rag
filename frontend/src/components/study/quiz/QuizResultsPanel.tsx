/**
 * Quiz results screen — two-column on wide viewports: a sticky summary
 * sidebar (score · export · actions) beside a scrollable question recap.
 * Stacks to a single column on small screens.
 *
 * Composes three small lego pieces:
 *   - QuizScoreCard  (header)
 *   - QuizRecapRow   (one per question)
 *   - inline footer buttons
 */

import { LayoutGrid, RotateCcw } from "lucide-react";
import { QuizExportMenu } from "./QuizExportMenu";
import { QuizRecapRow } from "./QuizRecapRow";
import { QuizScoreCard } from "./QuizScoreCard";
import type { QuizQuestion } from "./types";

export interface QuizResultsPanelProps {
  questions: QuizQuestion[];
  answers: (number | null)[];
  correctCount: number;
  finalScore: number | null;
  newlyEarned: string[];
  /** Retake the same quiz from scratch. Omit to hide the button. */
  onRetake?: () => void;
  /** Back to the saved-quiz library. Omit to hide the button. */
  onLibrary?: () => void;
  /** Custom label for the exit button (defaults to "Back to Study Hub"). */
  exitLabel?: string;
  onExit: () => void;
}

export function QuizResultsPanel({
  questions,
  answers,
  correctCount,
  finalScore,
  newlyEarned,
  onRetake,
  onLibrary,
  exitLabel = "Back to Study Hub",
  onExit,
}: QuizResultsPanelProps) {
  const pct =
    finalScore ??
    (questions.length ? Math.round((100 * correctCount) / questions.length) : 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_1fr] items-start">
      {/* Summary sidebar — sticks in view while the recap scrolls beside it. */}
      <aside className="space-y-4 lg:sticky lg:top-2">
        <QuizScoreCard
          pct={pct}
          correctCount={correctCount}
          total={questions.length}
          newlyEarned={newlyEarned}
        />

        <QuizExportMenu questions={questions} />

        <div className="space-y-2">
          {onRetake && (
            <button
              type="button"
              onClick={onRetake}
              className="w-full py-2.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              Retake this quiz
            </button>
          )}
          {onLibrary && (
            <button
              type="button"
              onClick={onLibrary}
              className="w-full py-2.5 rounded-xl border border-[#c2c6d6] dark:border-[#424754] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 text-ink-strong font-medium transition-colors flex items-center justify-center gap-2"
            >
              <LayoutGrid size={16} />
              Quiz library
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="w-full py-2.5 rounded-xl border border-[#c2c6d6] dark:border-[#424754] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 text-ink-strong font-medium transition-colors"
          >
            {exitLabel}
          </button>
        </div>
      </aside>

      {/* Per-question recap — independently scrollable on wide screens. */}
      <div className="space-y-2 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">
        {questions.map((q, i) => (
          <QuizRecapRow key={i} question={q} userIdx={answers[i]} />
        ))}
      </div>
    </div>
  );
}
