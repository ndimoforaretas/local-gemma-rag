/**
 * "Resume your in-progress quiz?" banner shown above the config form
 * when localStorage has an unfinished quiz.
 *
 * Renders only when ``savedQuiz`` is non-null; the parent owns the decision
 * to show or hide.
 */

import { useTranslation } from "react-i18next";
import { RotateCcw, Trash2 } from "lucide-react";
import type { PersistedQuiz } from "./useQuizPersistence";
import type { TFunction } from "i18next";

function formatAgo(deltaMs: number, t: TFunction): string {
  const mins = Math.floor(deltaMs / 60_000);
  if (mins < 1) return t("quiz.resume.agoNow");
  if (mins < 60) return t("quiz.resume.agoMinutes", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("quiz.resume.agoHours", { count: hours });
  return t("quiz.resume.agoDays", { count: Math.floor(hours / 24) });
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
  const { t } = useTranslation("study");
  const { config, questions, current, savedAt } = savedQuiz;
  const ago = formatAgo(Date.now() - savedAt, t);
  const progressText = t("quiz.resume.progress", { current: current + 1, total: questions.length });

  return (
    <div className="mb-6 p-4 rounded-2xl border border-[#a855f7]/40 bg-[#a855f7]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-ink-strong">
          {t("quiz.resume.title")}
        </p>
        <p className="text-sm text-ink-muted mt-0.5">
          {t(`difficulty.${config.difficulty}`)} · {progressText} · {t("quiz.resume.savedAgo", { ago })}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={onResume}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
        >
          <RotateCcw size={14} />
          {t("quiz.resume.resume")}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#c2c6d6] dark:border-[#424754] hover:border-rose-500/50 hover:text-rose-500 text-sm font-medium text-ink-muted transition-colors"
        >
          <Trash2 size={14} />
          {t("quiz.resume.discard")}
        </button>
      </div>
    </div>
  );
}
