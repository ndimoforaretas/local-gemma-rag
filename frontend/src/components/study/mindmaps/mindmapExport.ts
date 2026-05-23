/**
 * Mindmap export pipeline — Markdown, PNG, PDF.
 *
 * Zero new dependencies:
 *   - Markdown: recursive bulleted tree, downloaded as a Blob.
 *   - PNG:      serialize the rendered SVG → rasterize via canvas → blob URL.
 *   - PDF:      embed the PNG in a hidden iframe and trigger print()
 *               (same trick we use for quiz export).
 */

import { saveBlob } from "../../../lib/saveBlob";
import type { Mindmap, MindmapNode } from "./types";

function dateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mindmap";
}

// ── Markdown ────────────────────────────────────────────────────────────────

export function buildMarkdown(mm: Mindmap): string {
  const lines: string[] = [`# ${mm.title}`, ``, `_Exported on ${dateStamp()}_`, ``];
  walk(mm.tree, 0, lines);
  return lines.join("\n");
}

function walk(node: MindmapNode, depth: number, out: string[]) {
  if (depth === 0) {
    out.push(`## ${node.label}`, ``);
  } else {
    out.push(`${"  ".repeat(depth - 1)}- ${node.label}`);
  }
  node.children?.forEach((c) => walk(c, depth + 1, out));
}

export async function downloadMarkdown(mm: Mindmap): Promise<void> {
  const md = buildMarkdown(mm);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  await saveBlob(blob, `${slugify(mm.title)}-${dateStamp()}.md`, {
    description: "Markdown file",
    mimeType: "text/markdown",
    extension: "md",
  });
}

// ── SVG → PNG ──────────────────────────────────────────────────────────────

const PNG_WIDTH = 2400;     // export at 2× for crisp printing
const PNG_BG = "#10131a";    // dark background to match the in-app canvas

/** Returns a PNG Blob of the given SVG element. */
async function svgToPng(svgEl: SVGSVGElement): Promise<Blob> {
  const cloned = svgEl.cloneNode(true) as SVGSVGElement;
  // Replace the % sizing with explicit pixels so the serialized SVG renders.
  const rect = svgEl.getBoundingClientRect();
  cloned.setAttribute("width", String(rect.width));
  cloned.setAttribute("height", String(rect.height));

  const xml = new XMLSerializer().serializeToString(cloned);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await loadImage(url);
    const aspect = rect.height / rect.width;
    const w = PNG_WIDTH;
    const h = Math.round(PNG_WIDTH * aspect);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not available");
    ctx.fillStyle = PNG_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export async function downloadPng(mm: Mindmap, svgId: string): Promise<void> {
  const svg = document.getElementById(svgId) as SVGSVGElement | null;
  if (!svg) throw new Error("Mindmap SVG element not found in DOM.");
  const blob = await svgToPng(svg);
  await saveBlob(blob, `${slugify(mm.title)}-${dateStamp()}.png`, {
    description: "PNG image",
    mimeType: "image/png",
    extension: "png",
  });
}

// ── PDF (via hidden-iframe print) ──────────────────────────────────────────

export async function printAsPdf(mm: Mindmap, svgId: string): Promise<void> {
  const svg = document.getElementById(svgId) as SVGSVGElement | null;
  if (!svg) throw new Error("Mindmap SVG element not found in DOM.");
  const pngBlob = await svgToPng(svg);
  const pngUrl = URL.createObjectURL(pngBlob);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(mm.title)}</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 0; color: #111; }
  header { padding: 24px 24px 12px; }
  h1 { font-size: 22px; margin: 0; }
  .meta { color: #666; font-size: 12px; margin-top: 2px; }
  img { display: block; width: 100%; height: auto; }
  @media print { body { margin: 0; } header { padding: 16px; } }
</style></head>
<body>
  <header>
    <h1>${escape(mm.title)}</h1>
    <div class="meta">Mindmap exported on ${dateStamp()}</div>
  </header>
  <img src="${pngUrl}" alt="${escape(mm.title)}" />
</body></html>`;

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);
  const cw = iframe.contentWindow;
  if (!cw) { document.body.removeChild(iframe); return; }
  cw.document.open();
  cw.document.write(html);
  cw.document.close();
  iframe.onload = () => {
    cw.focus();
    cw.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      URL.revokeObjectURL(pngUrl);
    }, 2000);
  };
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
