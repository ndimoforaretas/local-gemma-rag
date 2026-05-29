/**
 * Quiz player — renders one question at a time with progress, answer reveal,
 * and per-question explanation. Stateless; the parent owns flow state.
 */

import { motion, AnimatePresence } from "framer-motion";
import { QuizOption } from "./QuizOption";
import type { QuizQuestion } from "./types";

export interface QuizPlayerPanelProps {
  question: QuizQuestion;
  current: number;
  total: number;
  selected: number | null;
  revealed: boolean;
  onPick: (i: number) => void;
  onSubmit: () => void;
  onNext: () => void;
}

export function QuizPlayerPanel({
  question,
  current,
  total,
  selected,
  revealed,
  onPick,
  onSubmit,
  onNext,
}: QuizPlayerPanelProps) {
  const progressPct = ((current + (revealed ? 1 : 0)) / total) * 100;

  return (
    <div className="space-y-5">
      <ProgressBar current={current + 1} total={total} pct={progressPct} />

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]"
        >
          <h2 className="text-lg font-semibold mb-4 text-ink-strong">
            {question.question}
          </h2>

          <div className="space-y-2">
            {question.options.map((opt, idx) => (
              <QuizOption
                key={idx}
                label={opt}
                isSelected={selected === idx}
                isCorrect={idx === question.correct_index}
                revealed={revealed}
                onPick={() => onPick(idx)}
              />
            ))}
          </div>

          {revealed && question.explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-3 rounded-xl bg-[#a855f7]/5 border border-[#a855f7]/20 text-sm text-ink-muted"
            >
              <span className="font-semibold text-[#a855f7]">Why: </span>
              {question.explanation}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end">
        {!revealed ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={selected === null}
            className="px-5 py-2.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#a855f7]/40 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            Submit answer
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="px-5 py-2.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium transition-colors"
          >
            {current + 1 < total ? "Next question" : "See results"}
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressBar({
  current,
  total,
  pct,
}: {
  current: number;
  total: number;
  pct: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1 text-ink-muted">
        <span>
          Question {current} of {total}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-[#c2c6d6]/40 dark:bg-[#424754]/40 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#a855f7]"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
