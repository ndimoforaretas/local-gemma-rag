/**
 * State machine + queries/mutations for Workshop Mode.
 *
 * Owns the phase, the currently-selected workshop / lesson, and config inputs.
 * Server data lives in TanStack Query — this hook just exposes typed helpers
 * the UI components consume.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type {
  LessonContent,
  Workshop,
  WorkshopDifficulty,
  WorkshopPhase,
} from "./types";
import { type LessonCount } from "./types";
import { useLessonPrefetch } from "./useLessonPrefetch";

export function useWorkshop() {
  const qc = useQueryClient();

  // ── Phase + selection ────────────────────────────────────────────────
  const [phase, setPhase] = useState<WorkshopPhase>("list");
  const [activeWorkshopId, setActiveWorkshopId] = useState<number | null>(null);
  const [activeLessonIdx, setActiveLessonIdx] = useState<number | null>(null);

  // ── Config inputs (for new-workshop flow) ───────────────────────────
  const [scope, setScope] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<WorkshopDifficulty>("beginner");
  const [lessonCount, setLessonCount] = useState<LessonCount>(5);

  // Outline edit mode (rename/reorder/delete lessons).
  const [editingOutline, setEditingOutline] = useState(false);

  // ── Server state ─────────────────────────────────────────────────────
  const list = useQuery({
    queryKey: ["workshops", "list"],
    queryFn: () => api.listWorkshops(),
  });

  const active = useQuery({
    queryKey: ["workshops", "detail", activeWorkshopId],
    queryFn: () => api.getWorkshop(activeWorkshopId!),
    enabled: activeWorkshopId !== null,
  });

  const lesson = useQuery({
    queryKey: ["workshops", "lesson", activeWorkshopId, activeLessonIdx],
    queryFn: () =>
      api.getOrGenerateLesson(activeWorkshopId!, activeLessonIdx!),
    enabled: activeWorkshopId !== null && activeLessonIdx !== null,
    staleTime: Infinity, // generated lesson content doesn't change
    // A failed generation is surfaced as an error (with a Retry affordance) —
    // never auto-retried, which on a slow local model would pile up requests.
    retry: false,
  });

  // Warm the next ungenerated lesson in the background while the user reads
  // (sequential, pauses while their own lesson is generating and while the
  // outline is being edited — no point generating for a lesson about to be
  // renamed or deleted).
  useLessonPrefetch({
    workshop: active.data,
    phase,
    activeLessonIdx,
    activeLessonLoading: lesson.isFetching,
    paused: editingOutline,
  });

  // ── Mutations ────────────────────────────────────────────────────────
  const createOutline = useMutation({
    mutationFn: api.createWorkshopOutline,
    onSuccess: (ws: Workshop) => {
      qc.setQueryData(["workshops", "detail", ws.id], ws);
      setActiveWorkshopId(ws.id);
      setPhase("outline");
      list.refetch();
    },
  });

  const completeLesson = useMutation({
    mutationFn: ({ workshopId, lessonIdx }: { workshopId: number; lessonIdx: number }) =>
      api.completeLesson(workshopId, lessonIdx),
    onSuccess: () => {
      active.refetch();
      list.refetch();
      qc.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  // Rename / reorder / delete lessons atomically; server is source of truth.
  const editLessons = useMutation({
    mutationFn: ({
      workshopId,
      lessons,
    }: {
      workshopId: number;
      lessons: { old_idx: number; title: string }[];
    }) => api.updateWorkshopLessons(workshopId, lessons),
    onSuccess: (ws: Workshop) => {
      qc.setQueryData(["workshops", "detail", ws.id], ws);
      // Cached lesson content is keyed by index, and indices may have moved —
      // drop them all; refetches hit the server-side cache (instant).
      qc.removeQueries({ queryKey: ["workshops", "lesson", ws.id] });
      setEditingOutline(false);
      list.refetch();
    },
  });

  // Re-roll an already-generated lesson; on failure the old content stays.
  const regenerateLesson = useMutation({
    mutationFn: ({ workshopId, lessonIdx }: { workshopId: number; lessonIdx: number }) =>
      api.getOrGenerateLesson(workshopId, lessonIdx, true),
    onSuccess: (data: LessonContent, vars) => {
      qc.setQueryData(["workshops", "lesson", vars.workshopId, vars.lessonIdx], data);
    },
  });

  const deleteWorkshop = useMutation({
    mutationFn: api.deleteWorkshop,
    onSuccess: () => list.refetch(),
  });

  // ── Navigation helpers ──────────────────────────────────────────────
  const openWorkshop = (id: number) => {
    setActiveWorkshopId(id);
    setActiveLessonIdx(null);
    setPhase("outline");
    setEditingOutline(false);
    editLessons.reset();
  };

  const openLesson = (lessonIdx: number) => {
    setActiveLessonIdx(lessonIdx);
    setPhase("lesson");
    regenerateLesson.reset(); // a stale regen error shouldn't follow into the next lesson
  };

  const backToOutline = () => {
    setActiveLessonIdx(null);
    setPhase("outline");
    regenerateLesson.reset();
    active.refetch(); // refresh completion timestamps
  };

  const backToList = () => {
    setActiveWorkshopId(null);
    setActiveLessonIdx(null);
    setPhase("list");
    setEditingOutline(false);
    editLessons.reset();
  };

  const startNew = () => {
    setScope([]);
    setPhase("config");
    createOutline.reset();
  };

  const startQuiz = () => setPhase("final_quiz");

  return {
    phase, setPhase,
    scope, setScope,
    difficulty, setDifficulty,
    lessonCount, setLessonCount,
    list, active, lesson,
    createOutline, completeLesson, regenerateLesson, editLessons, deleteWorkshop,
    editingOutline, setEditingOutline,
    activeWorkshopId, activeLessonIdx,
    openWorkshop, openLesson, backToOutline, backToList, startNew, startQuiz,
  };
}

export type LessonContentT = LessonContent;
