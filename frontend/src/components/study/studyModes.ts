/**
 * Catalogue of Study Hub modes. Defined once here so the picker page,
 * routing logic, and future analytics can share the same source of truth.
 */

import { Brain, BookOpen, Layers, Network, type LucideIcon } from "lucide-react";

export type StudyModeId = "quiz" | "workshop" | "flashcards" | "mindmaps";

/** "hub" = the mode-picker landing, otherwise one of the mode pages. */
export type ActiveStudyMode = "hub" | StudyModeId;

/** Type guard so App.tsx can safely restore from localStorage. */
export function isActiveStudyMode(value: unknown): value is ActiveStudyMode {
  return (
    value === "hub" ||
    value === "quiz" ||
    value === "workshop" ||
    value === "flashcards" ||
    value === "mindmaps"
  );
}

export interface StudyModeDef {
  id: StudyModeId;
  // Label + description come from translations (study:hub.modes.<id>.*).
  icon: LucideIcon;
  available: boolean;
}

export const STUDY_MODES: StudyModeDef[] = [
  { id: "quiz", icon: Brain, available: true },
  { id: "workshop", icon: BookOpen, available: true },
  { id: "flashcards", icon: Layers, available: true },
  { id: "mindmaps", icon: Network, available: true },
];
