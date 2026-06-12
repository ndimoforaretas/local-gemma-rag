/**
 * Background lesson prefetch: while the user reads the outline or a lesson,
 * quietly generate the next ungenerated lesson so opening it is instant.
 *
 * Deliberately sequential — ONE prefetch in flight at a time — because the
 * local Ollama serializes requests; a parallel burst would starve a lesson
 * the user actively clicks. It also pauses while the user's own lesson is
 * still generating. The prefetch shares the lesson query key, so clicking a
 * lesson that's mid-prefetch just attaches to the in-flight request.
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type { Workshop, WorkshopPhase } from "./types";

/** Next lesson worth warming: ahead of the one being read first, then any
 *  earlier ungenerated ones; on the outline view, from the start. */
function pickNextLesson(
  workshop: Workshop,
  activeIdx: number | null,
  skip: Set<number>,
): number | null {
  const lessons = [...workshop.lessons].sort((a, b) => a.lesson_idx - b.lesson_idx);
  const ahead = activeIdx === null ? lessons : lessons.filter((l) => l.lesson_idx > activeIdx);
  const behind = activeIdx === null ? [] : lessons.filter((l) => l.lesson_idx < activeIdx);
  const target = [...ahead, ...behind].find(
    (l) => !l.has_content && !skip.has(l.lesson_idx),
  );
  return target?.lesson_idx ?? null;
}

export function useLessonPrefetch({
  workshop,
  phase,
  activeLessonIdx,
  activeLessonLoading,
}: {
  workshop: Workshop | undefined;
  phase: WorkshopPhase;
  activeLessonIdx: number | null;
  /** True while the lesson the user opened is itself still generating. */
  activeLessonLoading: boolean;
}) {
  const qc = useQueryClient();
  const busy = useRef(false);
  // Lessons whose prefetch failed — skipped so we never hot-loop on a bad
  // generation; a manual click still retries them. Reset per workshop.
  const failed = useRef<{ workshopId: number | null; idxs: Set<number> }>({
    workshopId: null,
    idxs: new Set(),
  });

  useEffect(() => {
    if (!workshop) return;
    if (phase !== "outline" && phase !== "lesson") return;
    if (busy.current || activeLessonLoading) return;

    if (failed.current.workshopId !== workshop.id) {
      failed.current = { workshopId: workshop.id, idxs: new Set() };
    }

    const target = pickNextLesson(workshop, activeLessonIdx, failed.current.idxs);
    if (target === null) return;

    const key = ["workshops", "lesson", workshop.id, target];
    const state = qc.getQueryState(key);
    if (state?.status === "success" || state?.fetchStatus === "fetching") return;

    busy.current = true;
    qc.fetchQuery({
      queryKey: key,
      queryFn: () => api.getOrGenerateLesson(workshop.id, target),
      staleTime: Infinity,
      retry: false, // a failed prefetch is just skipped, never retried hot
    })
      .catch(() => failed.current.idxs.add(target))
      .finally(() => {
        busy.current = false;
        // Refresh has_content flags — shows the "Ready" badge on the outline
        // and re-runs this effect to chain the next lesson.
        qc.invalidateQueries({ queryKey: ["workshops", "detail", workshop.id] });
      });
  }, [workshop, phase, activeLessonIdx, activeLessonLoading, qc]);
}
