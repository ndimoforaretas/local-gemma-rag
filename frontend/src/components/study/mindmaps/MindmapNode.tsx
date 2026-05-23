/**
 * One mindmap node rendered as a pure SVG group: rounded rect + wrapped text.
 *
 * Visual tier by level:
 *   0 (root)  — large pill, white text on purple→pink gradient
 *   1 (theme) — medium pill, purple-tinted bg, purple text
 *   2 (leaf)  — small pill, white bg, near-black text
 *
 * We use native SVG <text>/<tspan> (not <foreignObject>) so the canvas
 * doesn't get tainted during PNG export. Labels are wrapped client-side
 * into up to 3 lines; overflow is truncated with an ellipsis.
 */

import type { PositionedNode } from "./types";

interface SizeSpec {
  w: number;
  h: number;
  fontSize: number;
  maxCharsPerLine: number;
}

const SIZES: Record<0 | 1 | 2, SizeSpec> = {
  0: { w: 230, h: 80, fontSize: 17, maxCharsPerLine: 18 },
  1: { w: 190, h: 64, fontSize: 13, maxCharsPerLine: 22 },
  2: { w: 160, h: 54, fontSize: 12, maxCharsPerLine: 22 },
};

const MAX_LINES = 3;

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
  const fontWeight = node.level === 0 ? 800 : node.level === 1 ? 700 : 600;

  const lines = wrapLabel(node.label, s.maxCharsPerLine, MAX_LINES);
  const lineHeight = s.fontSize * 1.2;
  const totalHeight = lines.length * lineHeight;
  // First-line baseline so the whole block centers vertically in the pill.
  const firstLineY = s.h / 2 - totalHeight / 2 + lineHeight / 2;

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
      <text
        x={s.w / 2}
        y={firstLineY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={s.fontSize}
        fontWeight={fontWeight}
        fill={textColor}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {lines.map((line, i) => (
          <tspan key={i} x={s.w / 2} dy={i === 0 ? 0 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/**
 * Word-wrap a label into up to `maxLines` lines of `maxChars` each.
 * If the text doesn't fit, the last line is truncated with an ellipsis.
 */
function wrapLabel(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let i = 0;
  while (i < words.length && lines.length < maxLines) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (candidate.length <= maxChars) {
      current = candidate;
      i++;
    } else if (current) {
      lines.push(current);
      current = "";
    } else {
      // Single word longer than the limit — break it hard.
      lines.push(words[i].slice(0, maxChars - 1) + "…");
      i++;
      current = "";
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  // Overflow: more words remain — ellipsize the last line.
  if (i < words.length && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] =
      last.length + 1 > maxChars
        ? last.slice(0, maxChars - 1) + "…"
        : last + "…";
  }
  return lines;
}
