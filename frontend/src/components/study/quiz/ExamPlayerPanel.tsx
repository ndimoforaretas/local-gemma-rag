/**
 * Exam-style player — deferred feedback with free navigation.
 *
 * Unlike practice mode, answers are never revealed mid-quiz: the user moves
 * between questions freely, can change any answer, flag ones to revisit, and
 * submits the whole paper at the end. Stateless; the parent owns flow state.
 */

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Flag, Timer } from "lucide-react";
import { QuizOption } from "./QuizOption";
import { QuestionNavigator } from "./QuestionNavigator";
import type { QuizQuestion } from "./types";

export interface ExamPlayerPanelProps {
  question: QuizQuestion;
  current: number;
  total: number;
  answers: (number | null)[];
  flagged: Set<number>;
  /** Milliseconds remaining on the timer; null/omitted = untimed. */
  remainingMs?: number | null;
  onPick: (i: number) => void;
  onJump: (idx: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleFlag: () => void;
  onSubmit: () => void;
}

function formatMMSS(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ExamPlayerPanel({
  question,
  current,
  total,
  answers,
  flagged,
  remainingMs = null,
  onPick,
  onJump,
  onPrev,
  onNext,
  onToggleFlag,
  onSubmit,
}: ExamPlayerPanelProps) {
  const { t } = useTranslation("study");
  const selected = answers[current] ?? null;
  const isFlagged = flagged.has(current);
  const unanswered = answers.filter((a) => a === null).length;
  const urgent = remainingMs != null && remainingMs <= 60_000;
  const isLast = current + 1 >= total;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-muted">
          {t("quiz.play.questionOf", { current: current + 1, total })}
        </span>
        <div className="flex items-center gap-2">
          {remainingMs != null && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold tabular-nums ${
                urgent
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse"
                  : "bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff]"
              }`}
            >
              <Timer size={14} /> {formatMMSS(remainingMs)}
            </span>
          )}
          <button
            type="button"
            onClick={() => onToggleFlag()}
            aria-pressed={isFlagged}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              isFlagged
                ? "bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                : "border-[#c2c6d6] dark:border-[#424754] text-ink-muted hover:bg-amber-500/10 hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            <Flag size={14} className={isFlagged ? "fill-amber-500" : ""} />
            {isFlagged ? t("quiz.play.flagged") : t("quiz.play.flag")}
          </button>
        </div>
      </div>

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
                revealed={false}
                onPick={() => onPick(idx)}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={current === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#c2c6d6] dark:border-[#424754] text-ink-strong font-medium hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={16} /> {t("quiz.play.back")}
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            className="px-5 py-2.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium transition-colors"
          >
            {t("quiz.play.submitExam")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium transition-colors"
          >
            {t("quiz.play.next")} <ChevronRight size={16} />
          </button>
        )}
      </div>

      <QuestionNavigator
        total={total}
        current={current}
        answers={answers}
        flagged={flagged}
        onJump={onJump}
      />

      <div className="flex flex-col items-end gap-2">
        {unanswered > 0 && (
          <p className="text-xs text-ink-muted">
            {t("quiz.play.stillBlank", { count: unanswered })}
          </p>
        )}
        <button
          type="button"
          onClick={onSubmit}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-600/20 transition-colors"
        >
          {t("quiz.play.submitExamSee")}
        </button>
      </div>
    </div>
  );
}
