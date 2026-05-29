import { INTENSITY_COLORS, INTENSITY_LEGEND } from "./dashboardHelpers";

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-faint">
      <span>Less</span>
      {INTENSITY_LEGEND.map((b) => (
        <span
          key={b.level}
          title={b.label}
          className="w-3 h-3 rounded-[3px] border border-[#c2c6d6]/30 dark:border-[#424754]/40"
          style={{ backgroundColor: INTENSITY_COLORS[b.level] }}
        />
      ))}
      <span>More</span>
    </div>
  );
}
