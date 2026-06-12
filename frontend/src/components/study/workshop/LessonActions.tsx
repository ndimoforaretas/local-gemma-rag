/**
 * Bottom action row of the lesson reader: Regenerate (re-roll the content,
 * behind a confirmation — completion status is kept) and Mark complete.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { ConfirmationModal } from "../../ConfirmationModal";

export function LessonActions({
  isCompleted,
  isMarking,
  regenerateFailed,
  onMarkComplete,
  onRegenerate,
}: {
  isCompleted: boolean;
  isMarking: boolean;
  regenerateFailed: boolean;
  onMarkComplete: () => void;
  onRegenerate: () => void;
}) {
  const { t } = useTranslation("study");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {regenerateFailed && (
        <span className="text-sm text-rose-500 mr-auto">
          {t("workshop.lesson.regenFailed")}
        </span>
      )}
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#c2c6d6] dark:border-[#424754] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 text-ink-strong text-sm font-medium transition-colors"
      >
        <RefreshCw size={14} /> {t("workshop.lesson.regenerate")}
      </button>
      <button
        type="button"
        onClick={onMarkComplete}
        disabled={isCompleted || isMarking}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
          isCompleted
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 cursor-default"
            : "bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#a855f7]/40 text-white"
        }`}
      >
        {isMarking ? (
          <>
            <Loader2 size={14} className="animate-spin" /> {t("workshop.lesson.saving")}
          </>
        ) : isCompleted ? (
          <>
            <CheckCircle2 size={14} /> {t("workshop.lesson.completed")}
          </>
        ) : (
          <>
            <CheckCircle2 size={14} /> {t("workshop.lesson.markComplete")}
          </>
        )}
      </button>

      <ConfirmationModal
        isOpen={confirmOpen}
        title={t("workshop.lesson.regenTitle")}
        message={t("workshop.lesson.regenMessage")}
        confirmLabel={t("workshop.lesson.regenConfirm")}
        cancelLabel={t("workshop.lesson.regenCancel")}
        type="warning"
        onConfirm={() => {
          setConfirmOpen(false);
          onRegenerate();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
