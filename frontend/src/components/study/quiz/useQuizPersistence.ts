/**
 * localStorage persistence for in-progress quizzes.
 *
 * Why localStorage:
 *   - The in-flight quiz is small (~10 KB even for 20 long questions).
 *   - The user is local-first and single-tenant — no cross-device sync needed.
 *   - Saves survive page refresh and browser close without a backend round-trip.
 *
 * Stored under one fixed key (only one in-progress quiz at a time). Saves
 * older than ``STALE_AFTER_MS`` are purged on next read so stale state from
 * days ago never resurfaces.
 */

import { useState } from "react";
import type {
  Difficulty,
  QuestionCount,
  QuestionType,
  QuizQuestion,
} from "./types";

const STORAGE_KEY = "cognivault.quiz.in_progress";
const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PersistedQuiz {
  savedAt: number;
  config: {
    difficulty: Difficulty;
    count: QuestionCount;
    types: QuestionType[];
    scope: string[];
  };
  questions: QuizQuestion[];
  current: number;
  correctCount: number;
  answers: (number | null)[];
}

function readPersisted(): PersistedQuiz | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedQuiz;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > STALE_AFTER_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useQuizPersistence() {
  // Read once on mount. We don't re-poll; saves come from this hook itself.
  const [saved, setSaved] = useState<PersistedQuiz | null>(() => readPersisted());

  const savePersisted = (data: Omit<PersistedQuiz, "savedAt">) => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const next: PersistedQuiz = { ...data, savedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
    } catch {
      // Quota exceeded or private-mode block — best-effort, never crash the quiz.
    }
  };

  const clearPersisted = () => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSaved(null);
    } catch {
      // ignore
    }
  };

  return { savedQuiz: saved, savePersisted, clearPersisted };
}
