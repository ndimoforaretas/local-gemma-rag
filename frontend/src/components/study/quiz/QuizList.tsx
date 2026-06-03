/**
 * Entry view for Quiz Mode: grid of saved quizzes + "New Quiz" button.
 * Click a quiz to replay it; trash to delete. Mirrors FlashcardsList.
 */

import { useState } from "react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink-strong">
          {items.length === 0 ? "Your quizzes" : `Your quizzes (${items.length})`}
        </h2>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-semibold shadow-lg shadow-[#a855f7]/20 transition-colors"
        >
          <Plus size={14} /> New Quiz
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
            Take your first quiz
          </h3>
          <p className="text-base sm:text-lg text-ink max-w-xl mx-auto mb-2 leading-relaxed">
            Quizzes turn your scoped documents into multiple-choice and
            true/false questions with instant feedback — and every quiz is
            saved here so you can retake it anytime.
          </p>
          <p className="text-sm text-ink-muted">
            Click <span className="font-semibold text-[#a855f7] dark:text-[#ddb7ff]">New Quiz</span> above to get started.
          </p>
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
          title="Delete this quiz?"
          message={`"${pendingDelete.title}" (${pendingDelete.question_count} questions) will be permanently removed.`}
          confirmLabel="Delete"
          cancelLabel="Keep"
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
