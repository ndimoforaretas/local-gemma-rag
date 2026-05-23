/**
 * Single row in the per-question recap on the results screen.
 *
 * Renders the question text, a correct/incorrect icon, and (when wrong)
 * the correct answer text below.
 */

import { Check, X as XIcon } from "lucide-react";
import type { QuizQuestion } from "./types";

export function QuizRecapRow({
  question,
  userIdx,
}: {
  question: QuizQuestion;
  userIdx: number | null;
}) {
  const correct = userIdx === question.correct_index;
  return (
    <div
      className={`
        p-3 rounded-xl border text-sm
        ${
          correct
            ? "bg-emerald-500/5 border-emerald-500/30"
            : "bg-rose-500/5 border-rose-500/30"
        }
      `}
    >
      <div className="flex items-start gap-2 text-[#191c1e] dark:text-[#e1e2ec]">
        {correct ? (
          <Check size={16} className="mt-0.5 text-emerald-500 shrink-0" />
        ) : (
          <XIcon size={16} className="mt-0.5 text-rose-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{question.question}</p>
          {!correct && (
            <p className="text-xs mt-1 text-[#727785] dark:text-[#8c909f]">
              Correct answer:{" "}
              <strong>{question.options[question.correct_index]}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
