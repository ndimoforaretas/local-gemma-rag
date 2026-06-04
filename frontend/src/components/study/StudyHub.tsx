/**
 * Study Hub landing page — picks one of the four study modes.
 *
 * State is intentionally minimal: just which mode is currently active.
 * Each mode renders its own full-screen experience and calls onExit()
 * to come back to this picker.
 */

import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
import { FlashcardsMode } from "./FlashcardsMode";
import { MindmapsMode } from "./MindmapsMode";
import { ModeCard } from "./ModeCard";
import { QuizMode } from "./QuizMode";
import { WorkshopMode } from "./WorkshopMode";
import { STUDY_MODES, type ActiveStudyMode } from "./studyModes";

/**
 * StudyHub is now a controlled component. The parent (App.tsx) owns the
 * active mode + persists it to localStorage, which:
 *   1) lets sidebar clicks reset the hub to its picker view, and
 *   2) restores the user to the same mode after a page refresh.
 */
export function StudyHub({
  mode,
  onChangeMode,
}: {
  mode: ActiveStudyMode;
  onChangeMode: (m: ActiveStudyMode) => void;
}) {
  const { t } = useTranslation("study");
  if (mode === "quiz") {
    return <QuizMode onExit={() => onChangeMode("hub")} />;
  }
  if (mode === "workshop") {
    return <WorkshopMode onExit={() => onChangeMode("hub")} />;
  }
  if (mode === "flashcards") {
    return <FlashcardsMode onExit={() => onChangeMode("hub")} />;
  }
  if (mode === "mindmaps") {
    return <MindmapsMode onExit={() => onChangeMode("hub")} />;
  }

  return (
    <div className="h-full overflow-y-auto">
      {/*
        min-h-full + flex column lets the hero + grid sit centered vertically
        via `my-auto` on the inner content wrapper, matching the Quiz Mode layout.
      */}
      <div className="max-w-5xl mx-auto w-full px-6 py-8 min-h-full flex flex-col">
        <div className="my-auto w-full">
          {/* Hero — centered, big, bold, full-white in dark mode for legibility */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#a855f7]/15 text-[#a855f7] mb-5 shadow-lg shadow-[#a855f7]/10">
              <GraduationCap size={36} strokeWidth={2.2} />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-strong mb-3">
              {t("hub.title")}
            </h1>
            <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto">
              {t("hub.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STUDY_MODES.map((m) => (
              <ModeCard
                key={m.id}
                label={t(`hub.modes.${m.id}.label`)}
                description={t(`hub.modes.${m.id}.desc`)}
                icon={m.icon}
                available={m.available}
                onClick={() => onChangeMode(m.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

