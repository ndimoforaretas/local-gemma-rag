/**
 * Top-left canvas toolbar: node search plus lock-layout and snap-to-grid
 * toggles. Pure presentation — state lives in useMindmapCanvas.
 */

import { Panel } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { Grid3x3, Lock, LockOpen } from "lucide-react";
import { MindmapSearchBox } from "./MindmapSearchBox";
import type { MindmapSearch } from "./useMindmapSearch";

export function MindmapToolbar({
  search,
  locked,
  onToggleLock,
  snap,
  onToggleSnap,
}: {
  search: MindmapSearch;
  locked: boolean;
  onToggleLock: () => void;
  snap: boolean;
  onToggleSnap: () => void;
}) {
  const { t } = useTranslation("study");
  return (
    <Panel position="top-left" className="flex items-center gap-2">
      <MindmapSearchBox search={search} />
      <ToggleBtn
        active={locked}
        title={locked ? t("mindmap.canvas.unlockLayout") : t("mindmap.canvas.lockLayout")}
        onClick={onToggleLock}
      >
        {locked ? <Lock size={14} /> : <LockOpen size={14} />}
      </ToggleBtn>
      <ToggleBtn active={snap} title={t("mindmap.canvas.snapToGrid")} onClick={onToggleSnap}>
        <Grid3x3 size={14} />
      </ToggleBtn>
    </Panel>
  );
}

function ToggleBtn({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
        active
          ? "bg-[#a855f7] border-[#a855f7] text-white"
          : "bg-white/90 dark:bg-[#191b23]/90 border-[#c2c6d6] dark:border-[#424754] text-ink-strong hover:border-[#a855f7]/50"
      }`}
    >
      {children}
    </button>
  );
}
