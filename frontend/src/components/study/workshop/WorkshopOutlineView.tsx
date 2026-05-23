/**
 * The workshop outline page: title, summary, key points, objectives, lesson cards.
 *
 * If every lesson is completed, surfaces a "Take final quiz" CTA at the bottom.
 */

import { ArrowLeft, Target, Sparkles, Trophy } from "lucide-react";
import type { Workshop } from "./types";
import { LessonCard } from "./LessonCard";

export function WorkshopOutlineView({
  workshop,
  onBack,
  onOpenLesson,
  onStartQuiz,
}: {
  workshop: Workshop;
  onBack: () => void;
  onOpenLesson: (idx: number) => void;
  onStartQuiz: () => void;
}) {
  const allDone = workshop.lessons.every((l) => l.completed_at != null);
  const doneCount = workshop.lessons.filter((l) => l.completed_at != null).length;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-[#424754] dark:text-[#c2c6d6] hover:text-[#191c1e] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to workshops
      </button>

      <header>
        <div className="text-[10px] uppercase tracking-wider font-semibold inline-block px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff] mb-3">
          {workshop.difficulty} · {workshop.lessons.length} lessons · {doneCount} done
        </div>
        <h1 className="text-3xl font-bold text-[#191c1e] dark:text-white mb-2">
          {workshop.title}
        </h1>
        <p className="text-base text-[#424754] dark:text-[#c2c6d6]">
          {workshop.summary}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PointsCard icon={Sparkles} label="Key points" items={workshop.key_points} />
        <PointsCard icon={Target} label="You will learn to" items={workshop.objectives} />
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f] mb-3">
          Lessons
        </h2>
        <div className="space-y-2">
          {workshop.lessons.map((lesson) => (
            <LessonCard
              key={lesson.lesson_idx}
              lesson={lesson}
              onClick={() => onOpenLesson(lesson.lesson_idx)}
            />
          ))}
        </div>
      </section>

      {allDone && (
        <div className="p-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Trophy className="text-emerald-500 shrink-0" size={22} />
            <div>
              <div className="font-semibold text-[#191c1e] dark:text-white">
                Workshop complete!
              </div>
              <div className="text-sm text-[#424754] dark:text-[#c2c6d6]">
                Test what you learned with a 5-question recap quiz.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onStartQuiz}
            className="px-4 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-medium text-sm transition-colors"
          >
            Take recap quiz
          </button>
        </div>
      )}
    </div>
  );
}

function PointsCard({
  icon: Icon,
  label,
  items,
}: {
  icon: typeof Target;
  label: string;
  items: string[];
}) {
  return (
    <div className="p-4 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-[#a855f7]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
          {label}
        </span>
      </div>
      <ul className="space-y-1 text-sm text-[#191c1e] dark:text-[#e1e2ec]">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-[#a855f7] mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
