/**
 * Single-mindmap view: header (title + export menu) + the interactive SVG canvas.
 *
 * Memoises the radial layout so resizing/re-renders don't recompute geometry.
 */

import { useMemo } from "react";
import { Download } from "lucide-react";
import type { Mindmap } from "./types";
import { MindmapCanvas } from "./MindmapCanvas";
import { MindmapExportMenu } from "./MindmapExportMenu";
import { layoutRadial } from "./mindmapLayout";

export function MindmapView({
  mindmap,
  onExported,
}: {
  mindmap: Mindmap;
  onExported: () => void;
}) {
  const layout = useMemo(() => layoutRadial(mindmap.tree), [mindmap.tree]);
  const svgId = `mindmap-svg-${mindmap.id}`;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-semibold inline-block px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff] mb-2">
            {mindmap.tree.children.length} themes ·{" "}
            {mindmap.tree.children.reduce((a, c) => a + (c.children?.length ?? 0), 0)} sub-topics
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191c1e] dark:text-white">
            {mindmap.title}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
            <Download size={12} />
            Export this mindmap
          </div>
          <MindmapExportMenu
            mindmap={mindmap}
            svgId={svgId}
            onExported={onExported}
          />
        </div>
      </header>

      <p className="text-xs text-[#727785] dark:text-[#8c909f]">
        Drag to pan · scroll to zoom
      </p>

      <MindmapCanvas layout={layout} svgId={svgId} />
    </div>
  );
}
