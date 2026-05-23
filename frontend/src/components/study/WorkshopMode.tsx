/**
 * WorkshopMode — orchestrates the five-phase workshop flow.
 *
 * list → config → outline → lesson → (back to outline) → final_quiz
 *
 * All state + queries live in `useWorkshop`; this file is composition only.
 */

import { BookOpen } from "lucide-react";
import { BackToHubButton } from "./StudyHub";
import { LessonView } from "./workshop/LessonView";
import { useWorkshop } from "./workshop/useWorkshop";
import { WorkshopConfigPanel } from "./workshop/WorkshopConfigPanel";
import { WorkshopFinalQuiz } from "./workshop/WorkshopFinalQuiz";
import { WorkshopGeneratingCard } from "./workshop/WorkshopGeneratingCard";
import { WorkshopList } from "./workshop/WorkshopList";
import { WorkshopOutlineView } from "./workshop/WorkshopOutlineView";

export function WorkshopMode({ onExit }: { onExit: () => void }) {
  const w = useWorkshop();

  return (
    <div className="h-full overflow-y-auto">
      {/*
        Top-aligned: workshop content (list, outline, lesson) accumulates over
        time, so we want new cards/lessons to grow downward from the top rather
        than start in the middle of the viewport.
      */}
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <BackToHubButton onClick={onExit} />
          <div className="flex items-center gap-2">
            <BookOpen className="text-[#a855f7]" size={20} />
            <span className="text-sm font-semibold text-[#191c1e] dark:text-white">
              Workshop Creator
            </span>
          </div>
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
