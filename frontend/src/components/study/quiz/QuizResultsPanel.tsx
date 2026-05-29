/**
 * Quiz results screen — score card, per-question recap, and footer actions.
 *
 * Composes three small lego pieces:
 *   - QuizScoreCard  (header)
 *   - QuizRecapRow   (one per question)
 *   - inline footer buttons
 */

import { RotateCcw } from "lucide-react";
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
  onRetry: () => void;
  onExit: () => void;
}

export function QuizResultsPanel({
  questions,
  answers,
  correctCount,
  finalScore,
  newlyEarned,
  onRetry,
  onExit,
}: QuizResultsPanelProps) {
  const pct =
    finalScore ??
    (questions.length ? Math.round((100 * correctCount) / questions.length) : 0);

  return (
    <div className="space-y-5">
      <QuizScoreCard
        pct={pct}
        correctCount={correctCount}
        total={questions.length}
        newlyEarned={newlyEarned}
      />

      <div className="space-y-2">
        {questions.map((q, i) => (
          <QuizRecapRow key={i} question={q} userIdx={answers[i]} />
        ))}
      </div>

      <QuizExportMenu questions={questions} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 py-2.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          New quiz
        </button>
        <button
          type="button"
          onClick={onExit}
          className="flex-1 py-2.5 rounded-xl border border-[#c2c6d6] dark:border-[#424754] hover:border-[#a855f7]/50 text-ink-strong font-medium transition-colors"
        >
          Back to Study Hub
        </button>
      </div>
    </div>
  );
}
