/**
 * Catalogue of Study Hub modes. Defined once here so the picker page,
 * routing logic, and future analytics can share the same source of truth.
 */

import { Brain, BookOpen, Layers, Network, type LucideIcon } from "lucide-react";

export type StudyModeId = "quiz" | "workshop" | "flashcards" | "mindmaps";

export interface StudyModeDef {
  id: StudyModeId;
  label: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
}

export const STUDY_MODES: StudyModeDef[] = [
  {
    id: "quiz",
    label: "Quiz Mode",
    description:
      "Test your recall with auto-generated quizzes at three difficulty levels.",
    icon: Brain,
    available: true,
  },
  {
    id: "workshop",
    label: "Workshop Creator",
    description:
      "Multi-lesson workshops built from your knowledge base, lesson-by-lesson.",
    icon: BookOpen,
    available: true,
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Scrollable flip-cards generated from your documents.",
    icon: Layers,
    available: false,
  },
  {
    id: "mindmaps",
    label: "Mindmaps",
    description: "Visual concept maps with PDF, PNG and Markdown export.",
    icon: Network,
    available: false,
  },
];
