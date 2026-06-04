/**
 * Entry view for Flashcards Mode: grid of existing decks + "New Deck" button.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Layers, Loader2 } from "lucide-react";
import { ConfirmationModal } from "../../ConfirmationModal";
import type { FlashcardDeckListItem } from "./types";
import { FlashcardDeckCard } from "./FlashcardDeckCard";

export function FlashcardsList({
  items,
  isLoading,
  onOpen,
  onNew,
  onDelete,
}: {
  items: FlashcardDeckListItem[];
  isLoading: boolean;
  onOpen: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<FlashcardDeckListItem | null>(null);
  const { t } = useTranslation("study");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink-strong">
          {items.length === 0
            ? t("flashcards.list.yourDecks")
            : t("flashcards.list.yourDecksCount", { count: items.length })}
        </h2>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-semibold shadow-lg shadow-[#a855f7]/20 transition-colors"
        >
          <Plus size={14} /> {t("flashcards.list.newDeck")}
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
            <Layers size={36} strokeWidth={2.2} />
          </div>
          <h3 className="text-2xl font-bold text-ink-strong mb-3">
            {t("flashcards.list.emptyTitle")}
          </h3>
          <p className="text-base sm:text-lg text-ink max-w-xl mx-auto mb-2 leading-relaxed">
            {t("flashcards.list.emptyBody")}
          </p>
          <p className="text-sm text-ink-muted">{t("flashcards.list.emptyHint")}</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <FlashcardDeckCard
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
          title={t("flashcards.list.deleteTitle")}
          message={t("flashcards.list.deleteMessage", { title: pendingDelete.title, count: pendingDelete.card_count })}
          confirmLabel={t("flashcards.list.delete")}
          cancelLabel={t("flashcards.list.keep")}
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
