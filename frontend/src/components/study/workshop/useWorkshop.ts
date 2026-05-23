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

  const deleteWorkshop = useMutation({
    mutationFn: api.deleteWorkshop,
    onSuccess: () => list.refetch(),
  });

  // ── Navigation helpers ──────────────────────────────────────────────
  const openWorkshop = (id: number) => {
    setActiveWorkshopId(id);
    setActiveLessonIdx(null);
    setPhase("outline");
  };

  const openLesson = (lessonIdx: number) => {
    setActiveLessonIdx(lessonIdx);
    setPhase("lesson");
  };

  const backToOutline = () => {
    setActiveLessonIdx(null);
    setPhase("outline");
    active.refetch(); // refresh completion timestamps
  };

  const backToList = () => {
    setActiveWorkshopId(null);
    setActiveLessonIdx(null);
    setPhase("list");
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
    createOutline, completeLesson, deleteWorkshop,
    activeWorkshopId, activeLessonIdx,
    openWorkshop, openLesson, backToOutline, backToList, startNew, startQuiz,
  };
}

export type LessonContentT = LessonContent;
