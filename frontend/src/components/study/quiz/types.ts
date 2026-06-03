/**
 * Shared types for the Quiz Mode feature.
 *
 * Kept in one file so each panel imports the same shapes without
 * pulling on its siblings.
 */

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type QuestionType = "mcq" | "true_false";
export type QuizPhase = "library" | "config" | "playing" | "results";

export interface QuizQuestion {
  type: QuestionType;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface SavedQuizListItem {
  id: number;
  created_at: number;
  difficulty: Difficulty;
  title: string;
  question_count: number;
  in_progress: boolean;
  answered_count: number;
  completed: boolean;
  last_score: number | null;
}

export const DIFFICULTIES: { id: Difficulty; label: string; tone: string }[] = [
  { id: "beginner", label: "Beginner", tone: "text-emerald-500" },
  { id: "intermediate", label: "Intermediate", tone: "text-amber-500" },
  { id: "advanced", label: "Advanced", tone: "text-rose-500" },
];

export const COUNTS = [5, 10, 20] as const;
export type QuestionCount = (typeof COUNTS)[number];
