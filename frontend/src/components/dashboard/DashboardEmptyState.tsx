/**
 * First-run empty state for the Progress Dashboard.
 *
 * Shown when the user has never sent a message (total_messages === 0).
 * Instead of a page full of zeros and blank charts, this gives them three
 * clear starting points that map directly to the sidebar sections.
 *
 * No routing needed — the sidebar is always visible; the cards are
 * informative nudges, not navigation buttons.
 */

import { MessageSquare, BookOpen, Trophy } from "lucide-react";

const STEPS = [
  {
    icon: MessageSquare,
    title: "Chat with your documents",
    description:
      "Upload a file to the Knowledge Base, then ask questions about it in Chat. Every message and study session gets recorded here.",
    color: "text-[#a855f7]",
    bg: "bg-[#a855f7]/10",
    border: "border-[#a855f7]/20",
  },
  {
    icon: BookOpen,
    title: "Generate study artefacts",
    description:
      "Head to the Study Hub to create quizzes, workshops, flashcard decks, and mindmaps from your scoped documents.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: Trophy,
    title: "Unlock achievements",
    description:
      "25 badges spanning every activity type — first question, streaks, perfect scores, mastered decks, and more. Your progress lives here.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
];

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <p className="text-base text-[#424754] dark:text-[#c2c6d6] max-w-xl mb-10">
        Nothing here yet — your stats, charts, and badges will appear once you
        start studying. Here's how to get going:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {STEPS.map(({ icon: Icon, title, description, color, bg, border }) => (
          <div
            key={title}
            className={`p-5 rounded-2xl border ${border} bg-white dark:bg-[#191b23] text-left`}
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} ${color} mb-3`}>
              <Icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-[#191c1e] dark:text-white mb-1.5">
              {title}
            </h3>
            <p className="text-xs text-[#727785] dark:text-[#8c909f] leading-relaxed">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
