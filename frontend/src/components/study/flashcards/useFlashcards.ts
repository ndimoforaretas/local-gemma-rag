/**
 * State + queries/mutations for Flashcards Mode.
 *
 * Phase machine: list → config → deck.
 * Server state in TanStack Query; per-card status mutates and optimistically
 * updates the deck-detail cache so the UI feels instant.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type {
  CardCount,
  Difficulty,
  FlashcardDeck,
  FlashcardStatus,
  FlashcardsPhase,
} from "./types";

export function useFlashcards() {
  const qc = useQueryClient();

  const [phase, setPhase] = useState<FlashcardsPhase>("list");
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);

  // Config inputs
  const [scope, setScope] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [cardCount, setCardCount] = useState<CardCount>(10);

  const list = useQuery({
    queryKey: ["flashcards", "list"],
    queryFn: () => api.listFlashcardDecks(),
  });

  const active = useQuery({
    queryKey: ["flashcards", "deck", activeDeckId],
    queryFn: () => api.getFlashcardDeck(activeDeckId!),
    enabled: activeDeckId !== null,
  });

  const createDeck = useMutation({
    mutationFn: api.createFlashcardDeck,
    onSuccess: (deck: FlashcardDeck) => {
      qc.setQueryData(["flashcards", "deck", deck.id], deck);
      setActiveDeckId(deck.id);
      setPhase("deck");
      list.refetch();
    },
  });

  const setCardStatus = useMutation({
    mutationFn: ({
      deckId,
      cardIdx,
      status,
      recordFlip,
    }: {
      deckId: number;
      cardIdx: number;
      status: FlashcardStatus;
      recordFlip: boolean;
    }) =>
      api.setFlashcardStatus(deckId, cardIdx, {
        status,
        record_flip: recordFlip,
      }),
    onMutate: async (vars) => {
      // Optimistic update so the chip + filter recompute instantly.
      qc.setQueryData<FlashcardDeck>(["flashcards", "deck", vars.deckId], (old) => {
        if (!old) return old;
        return {
          ...old,
          cards: old.cards.map((c) =>
            c.card_idx === vars.cardIdx
              ? {
                  ...c,
                  status: vars.status,
                  flip_count: c.flip_count + (vars.recordFlip ? 1 : 0),
                }
              : c,
          ),
        };
      });
    },
    onSuccess: () => {
      // Refresh dashboard data (achievements + study time may have changed).
      qc.invalidateQueries({ queryKey: ["progress"] });
      list.refetch();
    },
  });

  const deleteDeck = useMutation({
    mutationFn: api.deleteFlashcardDeck,
    onSuccess: () => list.refetch(),
  });

  const openDeck = (id: number) => {
    setActiveDeckId(id);
    setPhase("deck");
  };
  const backToList = () => {
    setActiveDeckId(null);
    setPhase("list");
  };
  const startNew = () => {
    setScope([]);
    setPhase("config");
    createDeck.reset();
  };

  return {
    phase, setPhase,
    scope, setScope,
    difficulty, setDifficulty,
    cardCount, setCardCount,
    list, active,
    createDeck, setCardStatus, deleteDeck,
    activeDeckId,
    openDeck, backToList, startNew,
  };
}
