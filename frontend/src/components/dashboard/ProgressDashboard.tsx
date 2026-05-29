/**
 * Progress Dashboard — top-level visualisation of the user's learning
 * activity. Consumes the /api/progress/* endpoints from Step 3.
 *
 * Sections (top to bottom):
 *   1. Hero
 *   2. SummaryCards    (total time, sessions, streak)
 *   3. StudyTrendChart (weekly study-time momentum)
 *   4. ModeBreakdown   (per-mode Study Hub activity)
 *   5. AlmostThere     (closest in-progress badges)
 *   6. AchievementGrid (click badge → AchievementDetailModal)
 *   7. ActivityHeatmap (GitHub-style; click cell → DayDetailModal)
 */

import { useState } from "react";
import { BarChart3, Loader2, AlertCircle } from "lucide-react";
import type { DailyActivityEntry } from "../../types/api";
import { AchievementGrid } from "./AchievementGrid";
import { AchievementDetailModal } from "./AchievementDetailModal";
import { AlmostThere } from "./AlmostThere";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { DayDetailModal } from "./DayDetailModal";
import { ModeBreakdown } from "./ModeBreakdown";
import { StudyTrendChart } from "./StudyTrendChart";
import { SummaryCards } from "./SummaryCards";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { SectionBand } from "./SectionBand";
import { inProgressBadges } from "./achievementHelpers";
import { useDashboardData } from "./useDashboardData";

export function ProgressDashboard() {
  const { summary, daily, achievements, breakdown, isLoading, isError } =
    useDashboardData(90);
  const [selectedDay, setSelectedDay] = useState<DailyActivityEntry | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  const badges = achievements.data?.achievements ?? [];
  const selectedBadgeItem = badges.find((b) => b.code === selectedBadge) ?? null;
  const isEmpty = !isLoading && !isError && (summary.data?.total_messages ?? 0) === 0;

  // Each section hides itself when empty; mirror that here so we don't render an
  // empty shaded band around a section that rendered nothing.
  const days = daily.data?.days ?? [];
  const showTrend = days.some((d) => d.seconds > 0);
  const bd = breakdown.data;
  const showBreakdown =
    !!bd &&
    bd.quizzes.count + bd.workshops.created + bd.flashcards.decks + bd.mindmaps.created > 0;
  const showAlmostThere = inProgressBadges(badges).length > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-6 sm:px-8 py-10 space-y-16">
        <Hero />

        {isLoading && <LoadingState />}
        {isError && <ErrorState />}

        {!isLoading && !isError && isEmpty && <DashboardEmptyState />}

        {!isLoading && !isError && !isEmpty && (
          <>
            {summary.data && (
              <SectionBand tone="a">
                <SummaryCards data={summary.data} />
              </SectionBand>
            )}
            {showTrend && (
              <SectionBand tone="b">
                <StudyTrendChart days={days} />
              </SectionBand>
            )}
            {showBreakdown && bd && (
              <SectionBand tone="a">
                <ModeBreakdown data={bd} />
              </SectionBand>
            )}
            {showAlmostThere && (
              <SectionBand tone="b">
                <AlmostThere items={badges} onSelect={setSelectedBadge} />
              </SectionBand>
            )}
            {achievements.data && (
              <SectionBand tone="a">
                <AchievementGrid items={badges} onSelect={setSelectedBadge} />
              </SectionBand>
            )}
            {daily.data && (
              <SectionBand tone="b">
                <ActivityHeatmap days={days} onSelectDay={setSelectedDay} />
              </SectionBand>
            )}
          </>
        )}
      </div>

      {selectedDay && (
        <DayDetailModal
          entry={selectedDay}
          achievements={badges}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {selectedBadgeItem && (
        <AchievementDetailModal
          item={selectedBadgeItem}
          allItems={badges}
          onClose={() => setSelectedBadge(null)}
          onNavigate={setSelectedBadge}
        />
      )}
    </div>
  );
}

function Hero() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#a855f7]/15 text-[#a855f7] mb-5 shadow-lg shadow-[#a855f7]/10">
        <BarChart3 size={36} strokeWidth={2.2} />
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink-strong mb-3">
        Your Progress
      </h1>
      <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto">
        Total study time, daily activity, and the achievements you've unlocked.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ink-muted">
      <Loader2 size={28} className="animate-spin mb-3" />
      <p className="text-sm">Loading your progress…</p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex items-start gap-2 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>
        Couldn't load your progress data. Check that the backend is running and
        try refreshing the page.
      </span>
    </div>
  );
}
