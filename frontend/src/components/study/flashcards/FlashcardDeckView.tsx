/**
 * Deck reading view: filter chips + responsive grid of flip cards + progress bar.
 *
 * Filters are purely client-side derived from each card's `status` field —
 * no extra round-trips. Progress bar counts mastered cards.
 */

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Flashcard } from "./Flashcard";
import type { DeckFilter, FlashcardDeck, FlashcardStatus } from "./types";

const FILTERS: { id: DeckFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unmarked", label: "Unmarked" },
  { id: "review", label: "Review" },
  { id: "mastered", label: "Mastered" },
];

export function FlashcardDeckView({
  deck,
  onBack,
  onSetStatus,
}: {
  deck: FlashcardDeck;
  onBack: () => void;
  onSetStatus: (
    cardIdx: number,
    status: FlashcardStatus,
    recordFlip: boolean,
  ) => void;
}) {
  const [filter, setFilter] = useState<DeckFilter>("all");

  const visible = useMemo(() => {
    if (filter === "all") return deck.cards;
    if (filter === "unmarked") return deck.cards.filter((c) => c.status == null);
    return deck.cards.filter((c) => c.status === filter);
  }, [deck.cards, filter]);

  const mastered = deck.cards.filter((c) => c.status === "mastered").length;
  const pct = deck.card_count === 0 ? 0 : Math.round((100 * mastered) / deck.card_count);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-strong"
      >
        <ArrowLeft size={14} />
        Back to decks
      </button>

      <header>
        <div className="text-xs uppercase tracking-wider font-semibold inline-block px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff] mb-3">
          {deck.difficulty} · {deck.card_count} cards · {mastered} mastered
        </div>
        <h1 className="text-3xl font-bold text-ink-strong mb-3">
          {deck.title}
        </h1>
        <div className="h-1.5 max-w-md bg-[#c2c6d6]/40 dark:bg-[#424754]/40 rounded-full overflow-hidden">
          <div className="h-full bg-[#a855f7] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = countFor(deck, f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                active
                  ? "bg-[#a855f7]/15 border-[#a855f7] text-[#a855f7] dark:text-[#ddb7ff]"
                  : "bg-transparent border-[#c2c6d6] dark:border-[#424754] text-ink-muted hover:border-[#a855f7]/50"
              }`}
            >
              {f.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-[#c2c6d6] dark:border-[#424754] text-center text-sm text-ink-muted">
          No cards match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((card) => (
            <Flashcard key={card.card_idx} card={card} onSetStatus={onSetStatus} />
          ))}
        </div>
      )}
    </div>
  );
}

function countFor(deck: FlashcardDeck, filter: DeckFilter): number {
  if (filter === "all") return deck.cards.length;
  if (filter === "unmarked") return deck.cards.filter((c) => c.status == null).length;
  return deck.cards.filter((c) => c.status === filter).length;
}
