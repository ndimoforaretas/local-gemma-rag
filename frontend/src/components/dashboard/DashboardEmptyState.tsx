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

import { useTranslation } from "react-i18next";
import { MessageSquare, BookOpen, Trophy } from "lucide-react";

const STEPS = [
  {
    icon: MessageSquare,
    key: "step1",
    color: "text-[#a855f7]",
    bg: "bg-[#a855f7]/10",
    border: "border-[#a855f7]/20",
  },
  {
    icon: BookOpen,
    key: "step2",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: Trophy,
    key: "step3",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
];

export function DashboardEmptyState() {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex flex-col items-center text-center py-4">
      <p className="text-base text-ink-muted max-w-xl mb-10">
        {t("empty.intro")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {STEPS.map(({ icon: Icon, key, color, bg, border }) => (
          <div
            key={key}
            className={`p-6 rounded-2xl border ${border} bg-white dark:bg-[#191b23] text-left`}
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} ${color} mb-3`}>
              <Icon size={20} />
            </div>
            <h3 className="text-base font-bold text-ink-strong mb-1.5">
              {t(`empty.${key}.title`)}
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              {t(`empty.${key}.description`)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
