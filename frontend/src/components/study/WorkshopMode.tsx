/**
 * WorkshopMode — orchestrates the five-phase workshop flow.
 *
 * list → config → outline → lesson → (back to outline) → final_quiz
 *
 * All state + queries live in `useWorkshop`; this file is composition only.
 */

import { Breadcrumbs, type Crumb } from "../Breadcrumbs";
import { LessonView } from "./workshop/LessonView";
import { useWorkshop } from "./workshop/useWorkshop";
import { WorkshopConfigPanel } from "./workshop/WorkshopConfigPanel";
import { WorkshopFinalQuiz } from "./workshop/WorkshopFinalQuiz";
import { WorkshopGeneratingCard } from "./workshop/WorkshopGeneratingCard";
import { WorkshopList } from "./workshop/WorkshopList";
import { WorkshopOutlineView } from "./workshop/WorkshopOutlineView";

export function WorkshopMode({ onExit }: { onExit: () => void }) {
  const w = useWorkshop();
  const crumbs = buildCrumbs(w, onExit);

  return (
    <div className="h-full overflow-y-auto">
      {/*
        Top-aligned: workshop content (list, outline, lesson) accumulates over
        time, so we want new cards/lessons to grow downward from the top rather
        than start in the middle of the viewport.
      */}
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-8">
        <div className="mb-6">
          <Breadcrumbs crumbs={crumbs} />
        </div>

        <div className="w-full">

        {w.phase === "list" && (
          <WorkshopList
            items={w.list.data?.workshops ?? []}
            isLoading={w.list.isLoading}
            onOpen={w.openWorkshop}
            onNew={w.startNew}
            onDelete={(id) => w.deleteWorkshop.mutate(id)}
          />
        )}

        {w.phase === "config" && w.createOutline.isPending && (
          <WorkshopGeneratingCard mode="outline" />
        )}

        {w.phase === "config" && !w.createOutline.isPending && (
          <WorkshopConfigPanel
            scope={w.scope}
            setScope={w.setScope}
            difficulty={w.difficulty}
            setDifficulty={w.setDifficulty}
            lessonCount={w.lessonCount}
            setLessonCount={w.setLessonCount}
            onStart={() =>
              w.createOutline.mutate({
                difficulty: w.difficulty,
                num_lessons: w.lessonCount,
                document_filter: w.scope,
              })
            }
            onCancel={w.backToList}
            isLoading={false}
            error={w.createOutline.error?.message ?? null}
          />
        )}

        {w.phase === "outline" && w.active.data && (
          <WorkshopOutlineView
            workshop={w.active.data}
            onBack={w.backToList}
            onOpenLesson={w.openLesson}
            onStartQuiz={w.startQuiz}
          />
        )}

        {w.phase === "lesson" && w.lesson.isPending && (
          <WorkshopGeneratingCard mode="lesson" />
        )}

        {w.phase === "lesson" && !w.lesson.isPending && (
          <LessonView
            lesson={w.lesson.data}
            isLoading={false}
            isCompleted={
              w.active.data?.lessons[w.activeLessonIdx ?? 0]?.completed_at != null
            }
            isMarking={w.completeLesson.isPending}
            onBack={w.backToOutline}
            onMarkComplete={() =>
              w.completeLesson.mutate({
                workshopId: w.activeWorkshopId!,
                lessonIdx: w.activeLessonIdx!,
              })
            }
          />
        )}

        {w.phase === "final_quiz" && w.active.data && (
          <WorkshopFinalQuiz
            workshop={w.active.data}
            onBack={() => w.setPhase("outline")}
          />
        )}
        </div>
      </div>
    </div>
  );
}

/** Phase-aware breadcrumb trail for the workshop flow. */
function buildCrumbs(
  w: ReturnType<typeof useWorkshop>,
  onExit: () => void,
): Crumb[] {
  const crumbs: Crumb[] = [
    { label: "Study Hub", onClick: onExit },
    {
      label: "Workshop Creator",
      // Final crumb is non-clickable; intermediate crumbs jump back to list.
      onClick: w.phase === "list" ? undefined : w.backToList,
    },
  ];
  switch (w.phase) {
    case "config":
      crumbs.push({ label: "New Workshop" });
      break;
    case "outline":
      if (w.active.data) crumbs.push({ label: w.active.data.title });
      break;
    case "lesson":
      if (w.active.data && w.activeLessonIdx !== null) {
        crumbs.push({ label: w.active.data.title, onClick: w.backToOutline });
        const lesson = w.active.data.lessons[w.activeLessonIdx];
        if (lesson) crumbs.push({ label: lesson.title });
      }
      break;
    case "final_quiz":
      if (w.active.data) {
        crumbs.push({ label: w.active.data.title, onClick: w.backToOutline });
        crumbs.push({ label: "Recap Quiz" });
      }
      break;
  }
  return crumbs;
}
