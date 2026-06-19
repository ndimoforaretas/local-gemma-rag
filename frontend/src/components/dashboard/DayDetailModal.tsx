/**
 * Modal shown when the user clicks a cell in the activity heatmap.
 *
 * Closes on: backdrop click, Esc key, or the X button.
 * Body scroll is locked while the modal is open so the heatmap doesn't drift.
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Clock, Layers, MessageSquare, Award } from "lucide-react";
import type {
  AchievementItem,
  DailyActivityEntry,
} from "../../types/api";
import { formatDuration, formatLongDate, parseISODate } from "./dashboardHelpers";

export function DayDetailModal({
  entry,
  achievements,
  onClose,
}: {
  entry: DailyActivityEntry;
  achievements: AchievementItem[];
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation("dashboard");
  // Close on Esc and lock body scroll for the modal's lifetime.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const earnedThisDay = achievementsEarnedOn(achievements, entry.date);
  const empty = entry.seconds <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between px-5 py-4 border-b border-[#c2c6d6] dark:border-[#424754]">
          <div>
            <h2 className="text-xl font-bold text-ink-strong">
              {formatLongDate(entry.date, i18n.language)}
            </h2>
            {!empty && (
              <p className="text-sm text-ink-muted mt-0.5">
                {t("dayModal.studyActivity", { duration: formatDuration(entry.seconds) })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("dayModal.close")}
            className="p-1.5 rounded-lg hover:bg-[#f2f4f6] dark:hover:bg-[#272a31] text-ink-muted"
          >
            <X size={16} />
          </button>
        </header>

        <div className="p-6 space-y-4">
          {empty ? (
            <p className="text-sm text-ink-muted text-center py-4">
              {t("dayModal.noActivity")}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <StatBlock icon={Clock} label={t("dayModal.time")} value={formatDuration(entry.seconds)} />
              <StatBlock icon={Layers} label={t("dayModal.sessions")} value={String(entry.session_count)} />
              <StatBlock icon={MessageSquare} label={t("dayModal.messages")} value={String(entry.message_count)} />
            </div>
          )}

          {earnedThisDay.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                <Award size={12} />
                {t("dayModal.achievementsEarned")}
              </div>
              <ul className="space-y-1.5">
                {earnedThisDay.map((a) => (
                  <li key={a.code} className="text-sm flex items-center gap-2">
                    <span className="text-lg">{a.icon}</span>
                    <span className="font-semibold text-ink-strong">
                      {a.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-xl border border-[#c2c6d6] dark:border-[#424754] text-center">
      <Icon size={14} className="text-[#a855f7] mx-auto mb-1" />
      <div className="text-lg font-bold text-ink-strong tabular-nums">
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider text-ink-muted">
        {label}
      </div>
    </div>
  );
}

function achievementsEarnedOn(
  achievements: AchievementItem[],
  iso: string,
): AchievementItem[] {
  const day = parseISODate(iso);
  const dayStart = day.getTime() / 1000;
  const dayEnd = dayStart + 86400;
  return achievements.filter(
    (a) => a.earned_at != null && a.earned_at >= dayStart && a.earned_at < dayEnd,
  );
}
