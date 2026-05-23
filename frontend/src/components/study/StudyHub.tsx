/**
 * Study Hub landing page — picks one of the four study modes.
 *
 * State is intentionally minimal: just which mode is currently active.
 * Each mode renders its own full-screen experience and calls onExit()
 * to come back to this picker.
 */

import { useState } from "react";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { FlashcardsMode } from "./FlashcardsMode";
import { ModeCard } from "./ModeCard";
import { QuizMode } from "./QuizMode";
import { WorkshopMode } from "./WorkshopMode";
import { STUDY_MODES, type StudyModeId } from "./studyModes";

type ActiveMode = "hub" | StudyModeId;

export function StudyHub() {
  const [mode, setMode] = useState<ActiveMode>("hub");

  if (mode === "quiz") {
    return <QuizMode onExit={() => setMode("hub")} />;
  }
  if (mode === "workshop") {
    return <WorkshopMode onExit={() => setMode("hub")} />;
  }
  if (mode === "flashcards") {
    return <FlashcardsMode onExit={() => setMode("hub")} />;
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
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#191c1e] dark:text-white mb-3">
              Study Hub
            </h1>
            <p className="text-base sm:text-lg text-[#424754] dark:text-[#c2c6d6] max-w-2xl mx-auto">
              Turn your knowledge base into an active learning experience. Pick
              a mode to get started.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STUDY_MODES.map((m) => (
              <ModeCard
                key={m.id}
                label={m.label}
                description={m.description}
                icon={m.icon}
                available={m.available}
                onClick={() => setMode(m.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small back-arrow used by every mode to return to the picker. */
export function BackToHubButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm text-[#424754] dark:text-[#c2c6d6] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] transition-colors"
    >
      <ArrowLeft size={14} />
      Back to Study Hub
    </button>
  );
}
