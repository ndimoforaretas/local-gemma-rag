/**
 * MindmapsMode — orchestrates list → config → view flow.
 * Layout matches WorkshopMode (top-aligned, wide container, breadcrumbs).
 */

import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Breadcrumbs, type Crumb } from "../Breadcrumbs";
import { MindmapsConfigPanel } from "./mindmaps/MindmapsConfigPanel";
import { MindmapsGeneratingCard } from "./mindmaps/MindmapsGeneratingCard";
import { MindmapsList } from "./mindmaps/MindmapsList";
import { MindmapView } from "./mindmaps/MindmapView";
import { useMindmaps } from "./mindmaps/useMindmaps";

export function MindmapsMode({ onExit }: { onExit: () => void }) {
  const m = useMindmaps();
  const { t } = useTranslation("study");
  const crumbs = buildCrumbs(m, onExit, t);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-8">
        <div className="mb-6">
          <Breadcrumbs crumbs={crumbs} />
        </div>

        <div className="w-full">
          {m.phase === "list" && (
            <MindmapsList
              items={m.list.data?.mindmaps ?? []}
              isLoading={m.list.isLoading}
              onOpen={m.openMindmap}
              onNew={m.startNew}
              onDelete={(id) => m.deleteMindmap.mutate(id)}
            />
          )}

          {m.phase === "config" && m.createMindmap.isPending && (
            <MindmapsGeneratingCard />
          )}

          {m.phase === "config" && !m.createMindmap.isPending && (
            <MindmapsConfigPanel
              scope={m.scope}
              setScope={m.setScope}
              onStart={() =>
                m.createMindmap.mutate({ document_filter: m.scope, depth: 2 })
              }
              isLoading={false}
              error={m.createMindmap.error?.message ?? null}
            />
          )}

          {m.phase === "view" && m.active.data && (
            <MindmapView
              mindmap={m.active.data}
              onExported={() => m.recordExport.mutate(m.activeId!)}
              onSaveLayout={(layout) =>
                m.saveLayout.mutate({ id: m.activeId!, layout })
              }
              onSavePositions={(positions) =>
                m.savePositions.mutate({ id: m.activeId!, positions })
              }
              onSaveGraph={(graph) =>
                m.saveGraph.mutate({ id: m.activeId!, graph })
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Phase-aware breadcrumb trail for the mindmap flow. */
function buildCrumbs(
  m: ReturnType<typeof useMindmaps>,
  onExit: () => void,
  t: TFunction,
): Crumb[] {
  const crumbs: Crumb[] = [
    { label: t("hub.title"), onClick: onExit },
    {
      label: t("mindmap.crumbs.mindmaps"),
      onClick: m.phase === "list" ? undefined : m.backToList,
    },
  ];
  if (m.phase === "config") {
    crumbs.push({ label: t("mindmap.crumbs.newMindmap") });
  } else if (m.phase === "view" && m.active.data) {
    crumbs.push({ label: m.active.data.title });
  }
  return crumbs;
}
