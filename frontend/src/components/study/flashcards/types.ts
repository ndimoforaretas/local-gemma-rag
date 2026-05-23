/**
 * Shared types for Flashcards Mode.
 */

export type FlashcardsPhase = "list" | "config" | "deck";

export type {
  Flashcard,
  FlashcardDeck,
  FlashcardDeckListItem,
  FlashcardStatus,
  WorkshopDifficulty as Difficulty,
} from "../../../types/api";

export const CARD_COUNTS = [10, 20, 40] as const;
export type CardCount = (typeof CARD_COUNTS)[number];

export type DeckFilter = "all" | "unmarked" | "mastered" | "review";
