/**
 * Swatch row for recolouring a node — six design-palette presets plus a
 * "default" reset, and a toggle to apply the colour to the whole branch.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { COLOR_HEX, NODE_COLORS, type NodeColor } from "./nodeColors";

export function NodeColorPicker({
  current,
  onPick,
}: {
  current: string | null;
  onPick: (color: NodeColor | null, wholeBranch: boolean) => void;
}) {
  const { t } = useTranslation("study");
  const [branch, setBranch] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-lg border bg-white/95 dark:bg-[#191b23]/95 border-[#c2c6d6] dark:border-[#424754] shadow-sm">
      <div className="flex items-center gap-1.5">
        {NODE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={t(`mindmap.canvas.colors.${c}`)}
            aria-label={t(`mindmap.canvas.colors.${c}`)}
            aria-pressed={current === c}
            onClick={() => onPick(c, branch)}
            className={`nodrag nopan w-5 h-5 rounded-full transition-transform hover:scale-110 ${
              current === c
                ? "ring-2 ring-offset-1 ring-[#a855f7] ring-offset-white dark:ring-offset-[#191b23]"
                : ""
            }`}
            style={{ backgroundColor: COLOR_HEX[c] }}
          />
        ))}
        <button
          type="button"
          title={t("mindmap.canvas.resetColor")}
          aria-label={t("mindmap.canvas.resetColor")}
          onClick={() => onPick(null, branch)}
          className="nodrag nopan w-5 h-5 rounded-full border border-dashed border-[#9aa0b0] dark:border-[#5a6070] flex items-center justify-center text-ink-muted hover:border-[#a855f7] hover:text-[#a855f7] transition-colors"
        >
          <X size={10} />
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer select-none">
        <input
          type="checkbox"
          checked={branch}
          onChange={(e) => setBranch(e.target.checked)}
          className="accent-[#a855f7] w-3.5 h-3.5"
        />
        {t("mindmap.canvas.applyToBranch")}
      </label>
    </div>
  );
}
