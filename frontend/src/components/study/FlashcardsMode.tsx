/**
 * FlashcardsMode — orchestrates list → config → deck flow.
 * Layout matches WorkshopMode (top-aligned, wide container).
 */

import { Layers } from "lucide-react";
import { BackToHubButton } from "./StudyHub";
import { FlashcardDeckView } from "./flashcards/FlashcardDeckView";
import { FlashcardsConfigPanel } from "./flashcards/FlashcardsConfigPanel";
import { FlashcardsGeneratingCard } from "./flashcards/FlashcardsGeneratingCard";
import { FlashcardsList } from "./flashcards/FlashcardsList";
import { useFlashcards } from "./flashcards/useFlashcards";

export function FlashcardsMode({ onExit }: { onExit: () => void }) {
  const f = useFlashcards();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <BackToHubButton onClick={onExit} />
          <div className="flex items-center gap-2">
            <Layers className="text-[#a855f7]" size={20} />
            <span className="text-sm font-semibold text-[#191c1e] dark:text-white">
              Flashcards
            </span>
          </div>
        </div>

        <div className="w-full">
          {f.phase === "list" && (
            <FlashcardsList
              items={f.list.data?.decks ?? []}
              isLoading={f.list.isLoading}
              onOpen={f.openDeck}
              onNew={f.startNew}
              onDelete={(id) => f.deleteDeck.mutate(id)}
            />
          )}

          {f.phase === "config" && f.createDeck.isPending && (
            <FlashcardsGeneratingCard />
          )}

          {f.phase === "config" && !f.createDeck.isPending && (
            <FlashcardsConfigPanel
              scope={f.scope}
              setScope={f.setScope}
              difficulty={f.difficulty}
              setDifficulty={f.setDifficulty}
              cardCount={f.cardCount}
              setCardCount={f.setCardCount}
              onStart={() =>
                f.createDeck.mutate({
                  difficulty: f.difficulty,
                  num_cards: f.cardCount,
                  document_filter: f.scope,
                })
              }
              onCancel={f.backToList}
              isLoading={false}
              error={f.createDeck.error?.message ?? null}
            />
          )}

          {f.phase === "deck" && f.active.data && (
            <FlashcardDeckView
              deck={f.active.data}
              onBack={f.backToList}
              onSetStatus={(cardIdx, status, recordFlip) =>
                f.setCardStatus.mutate({
                  deckId: f.activeDeckId!,
                  cardIdx,
                  status,
                  recordFlip,
                })
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
