/**
 * Mindmap export for the React Flow renderer — Markdown, PNG, PDF.
 *
 *   - Markdown: recursive bulleted tree (zero deps).
 *   - PNG:      html-to-image over the whole graph (real DOM → text always
 *               captured), framed to the node bounds regardless of zoom.
 *   - PDF:      that PNG embedded in a jsPDF page (lazy-loaded).
 */

import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";
import { toPng } from "html-to-image";
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
  const walk = (node: MindmapNode, depth: number) => {
    if (depth === 0) lines.push(`## ${node.label}`, ``);
    else lines.push(`${"  ".repeat(depth - 1)}- ${node.label}`);
    node.children?.forEach((c) => walk(c, depth + 1));
  };
  walk(mm.tree, 0);
  return lines.join("\n");
}

export async function downloadMarkdown(mm: Mindmap): Promise<void> {
  const blob = new Blob([buildMarkdown(mm)], { type: "text/markdown;charset=utf-8" });
  await saveBlob(blob, `${slugify(mm.title)}-${dateStamp()}.md`, {
    description: "Markdown file",
    mimeType: "text/markdown",
    extension: "md",
  });
}

// ── Image rendering ──────────────────────────────────────────────────────────

const PAD = 48;

/** Render the whole graph (all nodes, any zoom) to a PNG data URL. */
async function graphToPngDataUrl(
  wrapper: HTMLElement,
  nodes: Node[],
  bg: string,
): Promise<string> {
  const viewport = wrapper.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport) throw new Error("React Flow viewport not found.");

  const bounds = getNodesBounds(nodes);
  const width = Math.ceil(bounds.width) + PAD * 2;
  const height = Math.ceil(bounds.height) + PAD * 2;
  const vp = getViewportForBounds(bounds, width, height, 0.5, 2, PAD);

  return toPng(viewport, {
    backgroundColor: bg,
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
    },
  });
}

export async function downloadPng(
  wrapper: HTMLElement,
  nodes: Node[],
  mm: Mindmap,
  bg: string,
): Promise<void> {
  const dataUrl = await graphToPngDataUrl(wrapper, nodes, bg);
  const blob = await (await fetch(dataUrl)).blob();
  await saveBlob(blob, `${slugify(mm.title)}-${dateStamp()}.png`, {
    description: "PNG image",
    mimeType: "image/png",
    extension: "png",
  });
}

export async function downloadPdf(
  wrapper: HTMLElement,
  nodes: Node[],
  mm: Mindmap,
  bg: string,
): Promise<void> {
  const dataUrl = await graphToPngDataUrl(wrapper, nodes, bg);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const { jsPDF } = await import("jspdf");
  const landscape = img.width >= img.height;
  const doc = new jsPDF({ orientation: landscape ? "l" : "p", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;

  doc.setFontSize(16);
  doc.text(mm.title, margin, margin + 4);

  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - 28;
  const scale = Math.min(availW / img.width, availH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  doc.addImage(dataUrl, "PNG", margin + (availW - w) / 2, margin + 24, w, h);
  doc.save(`${slugify(mm.title)}-${dateStamp()}.pdf`);
}
