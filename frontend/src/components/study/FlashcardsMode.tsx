/**
 * FlashcardsMode — orchestrates list → config → deck flow.
 * Layout matches WorkshopMode (top-aligned, wide container).
 */

import { Breadcrumbs, type Crumb } from "../Breadcrumbs";
import { FlashcardDeckView } from "./flashcards/FlashcardDeckView";
import { FlashcardsConfigPanel } from "./flashcards/FlashcardsConfigPanel";
import { FlashcardsGeneratingCard } from "./flashcards/FlashcardsGeneratingCard";
import { FlashcardsList } from "./flashcards/FlashcardsList";
import { useFlashcards } from "./flashcards/useFlashcards";

export function FlashcardsMode({ onExit }: { onExit: () => void }) {
  const f = useFlashcards();
  const crumbs = buildCrumbs(f, onExit);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-8">
        <div className="mb-6">
          <Breadcrumbs crumbs={crumbs} />
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

/** Phase-aware breadcrumb trail for the flashcards flow. */
function buildCrumbs(
  f: ReturnType<typeof useFlashcards>,
  onExit: () => void,
): Crumb[] {
  const crumbs: Crumb[] = [
    { label: "Study Hub", onClick: onExit },
    {
      label: "Flashcards",
      onClick: f.phase === "list" ? undefined : f.backToList,
    },
  ];
  if (f.phase === "config") {
    crumbs.push({ label: "New Deck" });
  } else if (f.phase === "deck" && f.active.data) {
    crumbs.push({ label: f.active.data.title });
  }
  return crumbs;
}
