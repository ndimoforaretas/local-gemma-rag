/**
 * ReactFlowMindmap — renders a mindmap tree with React Flow.
 *
 * Real HTML nodes (text wraps, design-system styling), native pan/zoom + drag;
 * dagre auto-layout honouring LR/TD, manual drag positions persisted. Canvas
 * extras: node search (toolbar), branch collapse, minimap, lock-layout and
 * snap-to-grid toggles, Shift+drag multi-select, F fits to selection. Export
 * (MD/PNG/PDF) lives in ExportPanel.
 */

import "@xyflow/react/dist/style.css";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import { ConfirmationModal } from "../../ConfirmationModal";
import { ExportPanel } from "./ExportPanel";
import type { NodePositions } from "./flowDecorations";
import { MindmapFlowNode as MindmapNodeComponent } from "./MindmapFlowNode";
import { MindmapToolbar } from "./MindmapToolbar";
import type { Mindmap, MindmapGraph, MindmapLayout } from "./types";
import { useMindmapCanvas } from "./useMindmapCanvas";

export type { NodePositions } from "./flowDecorations";

const NODE_TYPES = { mindmap: MindmapNodeComponent };

const MINIMAP_NODE_COLORS = ["#a855f7", "#c084fc"];

function minimapNodeColor(node: Node, isDark: boolean): string {
  const level = (node.data?.level as number) ?? 2;
  return MINIMAP_NODE_COLORS[level] ?? (isDark ? "#424754" : "#c2c6d6");
}

interface Props {
  mindmap: Mindmap;
  layout: MindmapLayout;
  positions: NodePositions | null;
  onPositionsChange: (positions: NodePositions) => void;
  /** Persist the user-edited graph (first call forks from the AI tree). */
  onGraphChange: (graph: MindmapGraph) => void;
  onExported: () => void;
}

export function ReactFlowMindmap(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({ mindmap, layout, positions, onPositionsChange, onGraphChange, onExported }: Props) {
  const { t } = useTranslation("study");
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvas = useMindmapCanvas(mindmap, layout, positions, onPositionsChange, onGraphChange);

  // F fits the viewport to the selection (or the whole map).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if ((e.key === "f" || e.key === "F") && tag !== "INPUT" && tag !== "TEXTAREA") {
      e.preventDefault();
      canvas.fitSelection();
    }
  };

  return (
    <div
      ref={wrapRef}
      onKeyDown={onKeyDown}
      className="w-full h-[640px] rounded-2xl border border-[#c2c6d6] dark:border-[#424754] overflow-hidden"
    >
      <ReactFlow
        nodes={canvas.displayNodes}
        edges={canvas.displayEdges}
        onNodesChange={canvas.onNodesChange}
        onNodeDragStop={canvas.persist}
        onSelectionDragStop={canvas.persist}
        nodeTypes={NODE_TYPES}
        nodesConnectable={false}
        nodesDraggable={!canvas.locked}
        snapToGrid={canvas.snap}
        snapGrid={[20, 20]}
        deleteKeyCode={null}
        selectionKeyCode="Shift"
        zoomOnDoubleClick={false}
        colorMode={canvas.isDark ? "dark" : "light"}
        fitView
        minZoom={0.2}
      >
        <Background gap={20} color={canvas.isDark ? "#2a2f3a" : "#e2e6ee"} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={3}
          nodeColor={(n) => minimapNodeColor(n, canvas.isDark)}
        />
        <MindmapToolbar
          search={canvas.search}
          locked={canvas.locked}
          onToggleLock={() => canvas.setLocked(!canvas.locked)}
          snap={canvas.snap}
          onToggleSnap={() => canvas.setSnap(!canvas.snap)}
        />
        <ExportPanel
          mindmap={mindmap}
          wrapRef={wrapRef}
          isDark={canvas.isDark}
          onExported={onExported}
        />
      </ReactFlow>
      <ConfirmationModal
        isOpen={!!canvas.confirmDelete}
        title={t("mindmap.canvas.deleteBranchTitle")}
        message={t("mindmap.canvas.deleteBranchMessage", {
          label: canvas.confirmDelete?.label ?? "",
          count: canvas.confirmDelete?.count ?? 0,
        })}
        confirmLabel={t("mindmap.canvas.deleteBranchConfirm")}
        cancelLabel={t("mindmap.canvas.deleteBranchCancel")}
        type="destructive"
        onConfirm={canvas.confirmDeleteNow}
        onCancel={canvas.cancelDelete}
      />
    </div>
  );
}
