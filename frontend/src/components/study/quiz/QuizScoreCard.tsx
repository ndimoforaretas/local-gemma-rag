/**
 * Big score summary at the top of the results screen.
 *
 * Owns nothing — just renders the trophy, percentage, raw count, and an
 * optional "new badges unlocked" pill.
 */

import { Trophy } from "lucide-react";

export function QuizScoreCard({
  pct,
  correctCount,
  total,
  newlyEarned,
}: {
  pct: number;
  correctCount: number;
  total: number;
  newlyEarned: string[];
}) {
  return (
    <div className="p-6 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] text-center">
      <Trophy className="mx-auto text-[#a855f7] mb-2" size={36} />
      <div className="text-4xl font-bold text-[#191c1e] dark:text-[#e1e2ec]">
        {pct}%
      </div>
      <p className="text-sm text-[#727785] dark:text-[#8c909f] mt-1">
        {correctCount} of {total} correct
      </p>

      {newlyEarned.length > 0 && (
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30 text-[#a855f7] dark:text-[#ddb7ff] text-xs font-medium">
          🏅 {newlyEarned.length} new achievement
          {newlyEarned.length === 1 ? "" : "s"} unlocked
        </div>
      )}
    </div>
  );
}
