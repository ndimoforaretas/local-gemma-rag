/**
 * React-Query hooks bundling the three dashboard endpoints.
 *
 * One hook so every section auto-refreshes consistently. Background refetch
 * every 60s keeps the page live without aggressive polling.
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

const REFRESH_INTERVAL_MS = 60_000;

export function useDashboardData(days = 90) {
  const summary = useQuery({
    queryKey: ["progress", "summary"],
    queryFn: () => api.getProgressSummary(),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const daily = useQuery({
    queryKey: ["progress", "daily", days],
    queryFn: () => api.getProgressDaily(days),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const achievements = useQuery({
    queryKey: ["progress", "achievements"],
    queryFn: () => api.getProgressAchievements(),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const breakdown = useQuery({
    queryKey: ["progress", "breakdown"],
    queryFn: () => api.getProgressBreakdown(),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  return {
    summary,
    daily,
    achievements,
    breakdown,
    isLoading:
      summary.isLoading || daily.isLoading || achievements.isLoading,
    isError: summary.isError || daily.isError || achievements.isError,
  };
}
