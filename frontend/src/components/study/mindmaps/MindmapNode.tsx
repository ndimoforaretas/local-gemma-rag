/**
 * One mindmap node rendered as an SVG group: rounded rect + centered label.
 *
 * Visual tier by level:
 *   0 (root)  — large purple pill with white text
 *   1 (theme) — medium purple-tinted pill
 *   2 (leaf)  — small outlined pill
 *
 * Label uses an SVG <foreignObject> wrapping HTML so it word-wraps cleanly.
 */

import type { PositionedNode } from "./types";

const SIZES: Record<0 | 1 | 2, { w: number; h: number; fontSize: number; pad: number }> = {
  0: { w: 220, h: 80, fontSize: 18, pad: 10 },
  1: { w: 180, h: 64, fontSize: 14, pad: 8 },
  2: { w: 150, h: 52, fontSize: 12, pad: 6 },
};

export function MindmapNodeSvg({ node }: { node: PositionedNode }) {
  const s = SIZES[node.level];
  const fill =
    node.level === 0
      ? "url(#mm-grad-root)"
      : node.level === 1
        ? "rgba(168, 85, 247, 0.18)"
        : "white";
  const stroke =
    node.level === 0
      ? "#a855f7"
      : node.level === 1
        ? "rgba(168, 85, 247, 0.55)"
        : "rgba(168, 85, 247, 0.35)";
  const strokeWidth = node.level === 0 ? 2 : 1.5;
  const textColor =
    node.level === 0
      ? "#ffffff"
      : node.level === 1
        ? "#a855f7"
        : "#191c1e";

  return (
    <g transform={`translate(${node.x - s.w / 2}, ${node.y - s.h / 2})`}>
      <rect
        width={s.w}
        height={s.h}
        rx={s.h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <foreignObject x={s.pad} y={0} width={s.w - 2 * s.pad} height={s.h}>
        <div
          // xmlns required so foreignObject children render in some browsers.
          // Cast suppresses TS — the attribute is valid here even though
          // React's HTML div type doesn't enumerate it.
          {...({ xmlns: "http://www.w3.org/1999/xhtml" } as Record<string, string>)}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: s.fontSize,
            fontWeight: node.level === 0 ? 800 : node.level === 1 ? 700 : 600,
            color: textColor,
            lineHeight: 1.15,
            wordBreak: "break-word",
            overflow: "hidden",
          }}
        >
          {node.label}
        </div>
      </foreignObject>
    </g>
  );
}
