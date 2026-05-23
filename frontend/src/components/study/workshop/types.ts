/**
 * Shared types for Workshop Mode.
 *
 * Re-exports from the API types so workshop components don't need to import
 * from two places, and defines the local phase machine.
 */

export type WorkshopPhase =
  | "list"        // entry view: all workshops + "New" button
  | "config"      // configuration form for a new workshop
  | "outline"    // viewing a workshop's outline + lesson cards
  | "lesson"      // reading a single lesson
  | "final_quiz"; // recap quiz after every lesson is complete

export type {
  Workshop,
  WorkshopListItem,
  WorkshopLesson,
  WorkshopDifficulty,
  LessonContent,
} from "../../../types/api";

export const LESSON_COUNTS = [5, 10] as const;
export type LessonCount = (typeof LESSON_COUNTS)[number];
