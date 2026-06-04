/**
 * LayoutPicker — a small segmented control for the mindmap's auto-diagram
 * layout: Top-down, Left-right, or Radial. Persists per-map.
 */

import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowRight } from "lucide-react";
import type { MindmapLayout } from "./types";

const OPTIONS: { id: MindmapLayout; key: string; icon: typeof ArrowDown }[] = [
  { id: "LR", key: "leftRight", icon: ArrowRight },
  { id: "TD", key: "topDown", icon: ArrowDown },
];

export function LayoutPicker({
  value,
  onChange,
}: {
  value: MindmapLayout;
  onChange: (next: MindmapLayout) => void;
}) {
  const { t } = useTranslation("study");
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-xl border border-[#c2c6d6] dark:border-[#424754]">
      <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {t("mindmap.layout.label")}
      </span>
      {OPTIONS.map(({ id, key, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-[#a855f7] text-white"
                : "text-ink-muted hover:bg-[#a855f7]/10 hover:text-ink-strong"
            }`}
          >
            <Icon size={14} />
            {t(`mindmap.layout.${key}`)}
          </button>
        );
      })}
    </div>
  );
}
