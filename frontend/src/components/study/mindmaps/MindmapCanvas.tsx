/**
 * SVG canvas hosting the radial mindmap.
 *
 * Pan: drag the background to pan the inner <g>.
 * Zoom: mouse wheel zooms toward the cursor position.
 *
 * Edges are drawn as cubic Bézier curves so the connections feel organic
 * rather than the clinical straight lines of a tree diagram.
 */

import { useEffect, useRef, useState } from "react";
import type { Edge, MindmapLayout, PositionedNode } from "./types";
import { MindmapNodeSvg } from "./MindmapNode";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

export function MindmapCanvas({
  layout,
  svgId,
}: {
  layout: MindmapLayout;
  /** Stable id so the export pipeline can grab the SVG element by id. */
  svgId: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
    null,
  );

  // Fit the layout into the wrapper on first mount.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = layout.bounds.maxX - layout.bounds.minX;
    const h = layout.bounds.maxY - layout.bounds.minY;
    const zoom = Math.min(rect.width / w, rect.height / h, 1);
    const cx = (layout.bounds.minX + layout.bounds.maxX) / 2;
    const cy = (layout.bounds.minY + layout.bounds.maxY) / 2;
    setView({
      x: rect.width / 2 - cx * zoom,
      y: rect.height / 2 - cy * zoom,
      zoom,
    });
  }, [layout]);

  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    setView((v) => ({
      ...v,
      x: drag.current!.vx + (e.clientX - drag.current!.x),
      y: drag.current!.vy + (e.clientY - drag.current!.y),
    }));
  };
  const onMouseUp = () => { drag.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setView((v) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor));
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return { ...v, zoom: newZoom };
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Zoom toward the cursor: keep the world point under the cursor fixed.
      return {
        zoom: newZoom,
        x: cx - (cx - v.x) * (newZoom / v.zoom),
        y: cy - (cy - v.y) * (newZoom / v.zoom),
      };
    });
  };

  return (
    <div
      ref={wrapperRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      className="w-full h-[640px] rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-[#fafbfc] dark:bg-[#10131a] overflow-hidden cursor-grab active:cursor-grabbing"
    >
      <svg
        id={svgId}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mm-grad-root" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <g transform={`translate(${view.x}, ${view.y}) scale(${view.zoom})`}>
          {layout.edges.map((e) => (
            <BezierEdge key={e.id} edge={e} nodes={layout.nodes} />
          ))}
          {layout.nodes.map((n) => (
            <MindmapNodeSvg key={n.id} node={n} />
          ))}
        </g>
      </svg>
    </div>
  );
}

function BezierEdge({ edge, nodes }: { edge: Edge; nodes: PositionedNode[] }) {
  const a = nodes.find((n) => n.id === edge.from);
  const b = nodes.find((n) => n.id === edge.to);
  if (!a || !b) return null;
  // Bezier control points: half way between, biased perpendicular for arc.
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // Perpendicular offset for a gentle curve.
  const perp = { x: -dy * 0.15, y: dx * 0.15 };
  const c1 = { x: mx + perp.x, y: my + perp.y };
  const d = `M ${a.x} ${a.y} Q ${c1.x} ${c1.y} ${b.x} ${b.y}`;
  return (
    <path
      d={d}
      fill="none"
      stroke="rgba(168, 85, 247, 0.45)"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  );
}
