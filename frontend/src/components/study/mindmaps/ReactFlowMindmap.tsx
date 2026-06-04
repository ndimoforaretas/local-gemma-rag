/**
 * ReactFlowMindmap — renders a mindmap tree with React Flow.
 *
 * Real HTML nodes (text wraps, design-system styling), native pan/zoom + drag.
 * Auto-layout via dagre honouring the LR/TD direction; manual drag positions
 * are persisted and re-applied on load. Export (MD/PNG/PDF) lives in a corner
 * panel since it needs the live graph.
 */

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import { FileText, Image as ImageIcon, Printer, Loader2 } from "lucide-react";
import type { Mindmap, MindmapLayout } from "./types";
import { treeToFlow, type FlowGraph, type MindmapFlowNode } from "./treeToFlow";
import { layoutWithDagre } from "./layoutWithDagre";
import { MindmapFlowNode as MindmapNodeComponent } from "./MindmapFlowNode";
import { downloadMarkdown, downloadPng, downloadPdf } from "./flowExport";
import { useIsDark } from "./useIsDark";

const NODE_TYPES = { mindmap: MindmapNodeComponent };

export type NodePositions = Record<string, { x: number; y: number }>;

function layoutNodes(
  graph: FlowGraph,
  layout: MindmapLayout,
  positions: NodePositions | null,
): MindmapFlowNode[] {
  const laid = layoutWithDagre(graph.nodes, graph.edges, layout === "TD" ? "TB" : "LR");
  if (positions && Object.keys(positions).length) {
    return laid.map((n) => (positions[n.id] ? { ...n, position: positions[n.id] } : n));
  }
  return laid;
}

function styleEdges(edges: Edge[], isDark: boolean): Edge[] {
  return edges.map((e) => ({
    ...e,
    type: "smoothstep",
    style: { stroke: isDark ? "#a855f7" : "#9333ea", strokeWidth: 1.5 },
  }));
}

export function ReactFlowMindmap(props: {
  mindmap: Mindmap;
  layout: MindmapLayout;
  positions: NodePositions | null;
  onPositionsChange: (positions: NodePositions) => void;
  onExported: () => void;
}) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({
  mindmap,
  layout,
  positions,
  onPositionsChange,
  onExported,
}: {
  mindmap: Mindmap;
  layout: MindmapLayout;
  positions: NodePositions | null;
  onPositionsChange: (positions: NodePositions) => void;
  onExported: () => void;
}) {
  const { t } = useTranslation("study");
  const isDark = useIsDark();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rf = useReactFlow();
  const [busy, setBusy] = useState<null | "md" | "png" | "pdf">(null);

  const graph = useMemo(() => treeToFlow(mindmap.tree), [mindmap.tree]);
  const [nodes, setNodes, onNodesChange] = useNodesState<MindmapFlowNode>(
    layoutNodes(graph, layout, positions),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(styleEdges(graph.edges, isDark));

  // Re-layout when the tree, direction, or saved positions change.
  useEffect(() => {
    setNodes(layoutNodes(graph, layout, positions));
  }, [graph, layout, positions, setNodes]);

  // Recolour edges on theme flip.
  useEffect(() => {
    setEdges((es) => styleEdges(es, isDark));
  }, [isDark, setEdges]);

  // Persist node positions after a drag.
  const persist = useCallback(() => {
    const map: NodePositions = {};
    for (const n of rf.getNodes()) map[n.id] = { x: n.position.x, y: n.position.y };
    onPositionsChange(map);
  }, [rf, onPositionsChange]);

  const runExport = async (kind: "md" | "png" | "pdf") => {
    setBusy(kind);
    try {
      const bg = isDark ? "#10131a" : "#ffffff";
      if (kind === "md") await downloadMarkdown(mindmap);
      else if (kind === "png") await downloadPng(wrapRef.current!, rf.getNodes(), mindmap, bg);
      else await downloadPdf(wrapRef.current!, rf.getNodes(), mindmap, bg);
      onExported();
    } catch (err) {
      console.error("Mindmap export failed:", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      ref={wrapRef}
      className="w-full h-[640px] rounded-2xl border border-[#c2c6d6] dark:border-[#424754] overflow-hidden"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={persist}
        nodeTypes={NODE_TYPES}
        nodesConnectable={false}
        colorMode={isDark ? "dark" : "light"}
        fitView
        minZoom={0.2}
      >
        <Background gap={20} color={isDark ? "#2a2f3a" : "#e2e6ee"} />
        <Controls showInteractive={false} />
        <Panel position="top-right" className="flex gap-2">
          <ExportBtn
            label={t("mindmap.export.markdown")}
            title={t("mindmap.export.exportAs", { format: t("mindmap.export.markdown") })}
            busy={busy === "md"}
            onClick={() => runExport("md")}
          >
            <FileText size={14} />
          </ExportBtn>
          <ExportBtn
            label={t("mindmap.export.image")}
            title={t("mindmap.export.exportAs", { format: t("mindmap.export.image") })}
            busy={busy === "png"}
            onClick={() => runExport("png")}
          >
            <ImageIcon size={14} />
          </ExportBtn>
          <ExportBtn
            label={t("mindmap.export.pdf")}
            title={t("mindmap.export.exportAs", { format: t("mindmap.export.pdf") })}
            busy={busy === "pdf"}
            onClick={() => runExport("pdf")}
            primary
          >
            <Printer size={14} />
          </ExportBtn>
        </Panel>
      </ReactFlow>
    </div>
  );
}

function ExportBtn({
  label,
  title,
  busy,
  onClick,
  primary,
  children,
}: {
  label: string;
  title: string;
  busy: boolean;
  onClick: () => void;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
        primary
          ? "bg-[#a855f7] hover:bg-[#9333ea] text-white"
          : "bg-white/90 dark:bg-[#191b23]/90 border border-[#c2c6d6] dark:border-[#424754] text-ink-strong hover:border-[#a855f7]/50"
      }`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : children}
      {label}
    </button>
  );
}
