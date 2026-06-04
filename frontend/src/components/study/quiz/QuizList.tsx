/**
 * Entry view for Quiz Mode: grid of saved quizzes + "New Quiz" button.
 * Click a quiz to replay it; trash to delete. Mirrors FlashcardsList.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Brain, Loader2 } from "lucide-react";
import { ConfirmationModal } from "../../ConfirmationModal";
import type { SavedQuizListItem } from "./types";
import { QuizCard } from "./QuizCard";

export function QuizList({
  items,
  isLoading,
  onOpen,
  onNew,
  onDelete,
}: {
  items: SavedQuizListItem[];
  isLoading: boolean;
  onOpen: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<SavedQuizListItem | null>(null);
  const { t } = useTranslation("study");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink-strong">
          {items.length === 0
            ? t("quiz.list.yourQuizzes")
            : t("quiz.list.yourQuizzesCount", { count: items.length })}
        </h2>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-semibold shadow-lg shadow-[#a855f7]/20 transition-colors"
        >
          <Plus size={14} /> {t("quiz.list.newQuiz")}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-ink-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="p-10 sm:p-12 rounded-2xl border border-dashed border-[#c2c6d6] dark:border-[#424754] text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#a855f7]/15 text-[#a855f7] mb-5">
            <Brain size={36} strokeWidth={2.2} />
          </div>
          <h3 className="text-2xl font-bold text-ink-strong mb-3">
            {t("quiz.list.emptyTitle")}
          </h3>
          <p className="text-base sm:text-lg text-ink max-w-xl mx-auto mb-2 leading-relaxed">
            {t("quiz.list.emptyBody")}
          </p>
          <p className="text-sm text-ink-muted">{t("quiz.list.emptyHint")}</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <QuizCard
              key={item.id}
              item={item}
              onOpen={() => onOpen(item.id)}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmationModal
          isOpen
          title={t("quiz.list.deleteTitle")}
          message={t("quiz.list.deleteMessage", { title: pendingDelete.title, count: pendingDelete.question_count })}
          confirmLabel={t("quiz.list.delete")}
          cancelLabel={t("quiz.list.keep")}
          type="destructive"
          onConfirm={() => {
            onDelete(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
