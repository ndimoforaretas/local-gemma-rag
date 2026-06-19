import { useTranslation } from "react-i18next";
import { INTENSITY_COLORS, INTENSITY_LEVELS } from "./dashboardHelpers";

export function HeatmapLegend() {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex items-center gap-2 text-xs text-ink-faint">
      <span>{t("legend.less")}</span>
      {INTENSITY_LEVELS.map((level) => (
        <span
          key={level}
          title={t(`legend.l${level}`)}
          className="w-3 h-3 rounded-[3px] border border-[#c2c6d6]/30 dark:border-[#424754]/40"
          style={{ backgroundColor: INTENSITY_COLORS[level] }}
        />
      ))}
      <span>{t("legend.more")}</span>
    </div>
  );
}
