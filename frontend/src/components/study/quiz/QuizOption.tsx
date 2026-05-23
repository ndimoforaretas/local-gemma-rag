/**
 * Single answer-choice button inside QuizPlayerPanel.
 *
 * Visual state matrix is small but easier to read in isolation.
 */

import { Check, X as XIcon } from "lucide-react";

export function QuizOption({
  label,
  isSelected,
  isCorrect,
  revealed,
  onPick,
}: {
  label: string;
  isSelected: boolean;
  isCorrect: boolean;
  revealed: boolean;
  onPick: () => void;
}) {
  const showCorrect = revealed && isCorrect;
  const showWrong = revealed && isSelected && !isCorrect;
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={revealed}
      className={`
        w-full text-left px-4 py-3 rounded-xl border transition-all
        ${
          showCorrect
            ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-700 dark:text-emerald-300"
            : showWrong
              ? "bg-rose-500/10 border-rose-500/60 text-rose-700 dark:text-rose-300"
              : isSelected
                ? "bg-[#a855f7]/10 border-[#a855f7]/60 text-[#191c1e] dark:text-[#e1e2ec]"
                : "bg-transparent border-[#c2c6d6] dark:border-[#424754] hover:border-[#a855f7]/40 text-[#191c1e] dark:text-[#e1e2ec]"
        }
        ${revealed ? "cursor-default" : "cursor-pointer"}
      `}
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        {showCorrect && <Check size={16} />}
        {showWrong && <XIcon size={16} />}
      </div>
    </button>
  );
}
