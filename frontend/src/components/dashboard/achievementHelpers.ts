/**
 * Helpers for rendering achievement progress in the detail modal.
 *
 * The backend exposes `metric`, `target`, and the user's capped `current`
 * value per badge. These turn those raw numbers into friendly text + a 0–1
 * progress fraction, with special handling for time and percentage metrics.
 */

import type { AchievementItem } from "../../types/api";

// Metrics whose values are seconds → render as whole minutes.
const SECONDS_METRICS = new Set(["total_seconds", "longest_session_seconds"]);
// Metrics that are already a percentage.
const PERCENT_METRICS = new Set(["best_quiz_score"]);

// Friendly unit noun per metric (count-style metrics).
const METRIC_UNITS: Record<string, string> = {
  total_messages: "messages",
  messages_today: "today",
  current_streak_days: "days",
  scope_filter_uses: "uses",
  total_quizzes: "quizzes",
  advanced_quiz_passes: "passes",
  total_workshops_created: "workshops",
  workshops_completed: "workshops",
  lessons_completed: "lessons",
  total_decks_created: "decks",
  total_card_flips: "flips",
  decks_mastered: "decks",
  total_mindmaps: "mindmaps",
  total_mindmap_exports: "exports",
};

/** True when this badge tracks a numeric metric (i.e. has a progress bar). */
export function hasProgress(item: AchievementItem): boolean {
  return item.metric != null && item.target != null;
}

/** Format one metric value for display ("45 min", "80%", "3"). */
function formatValue(metric: string, value: number): string {
  if (SECONDS_METRICS.has(metric)) return `${Math.round(value / 60)} min`;
  if (PERCENT_METRICS.has(metric)) return `${value}%`;
  return String(value);
}

/** "3 / 7 days" style progress label, or null when the badge has no metric. */
export function progressText(item: AchievementItem): string | null {
  if (!hasProgress(item)) return null;
  const metric = item.metric as string;
  const target = item.target as number;
  const current = item.current ?? 0;
  if (SECONDS_METRICS.has(metric) || PERCENT_METRICS.has(metric)) {
    return `${formatValue(metric, current)} / ${formatValue(metric, target)}`;
  }
  const unit = METRIC_UNITS[metric] ?? "";
  return `${current} / ${target}${unit ? " " + unit : ""}`;
}

/** Progress as a 0–1 fraction. Earned badges always read full. */
export function progressFraction(item: AchievementItem): number {
  if (item.is_earned) return 1;
  if (!hasProgress(item)) return 0;
  const target = item.target as number;
  if (target <= 0) return 0;
  return Math.min((item.current ?? 0) / target, 1);
}

/** Resolve the next badge up the ladder from the full list, or null. */
export function findNext(
  item: AchievementItem,
  all: AchievementItem[],
): AchievementItem | null {
  if (!item.next_code) return null;
  return all.find((a) => a.code === item.next_code) ?? null;
}
