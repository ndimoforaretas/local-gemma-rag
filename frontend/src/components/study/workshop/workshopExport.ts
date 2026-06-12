/**
 * Workshop export — the whole workshop (outline + all generated lessons) as
 * one Markdown file or a real multi-page PDF.
 *
 * Mirrors quizExport.ts: Markdown via Blob download, PDF via lazily-imported
 * jsPDF with a paginating `write()` helper. Lesson Markdown is rendered into
 * the PDF through a small line-based block parser (headings, bullets, code
 * fences, inline-marker stripping) — readable typography without an HTML
 * rendering dependency.
 *
 * Lessons without generated content are listed with a placeholder note —
 * export NEVER triggers generation.
 */

import { saveBlob } from "../../../lib/saveBlob";
import type { Workshop } from "./types";

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function dateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workshop";
}

/** Lesson bodies keyed by lesson_idx — only generated lessons are present. */
export type LessonContents = Map<number, string>;

// ── Markdown ────────────────────────────────────────────────────────────────

/** Demote every heading one level so lesson `#` titles nest under the doc title. */
function demoteHeadings(md: string): string {
  return md
    .split("\n")
    .map((line) => (/^\s*#{1,5}\s/.test(line.trimStart()) ? `#${line.trimStart()}` : line))
    .join("\n");
}

export function buildWorkshopMarkdown(
  workshop: Workshop,
  contents: LessonContents,
  notGeneratedNote: string,
): string {
  const lines: string[] = [
    `# ${workshop.title}`,
    ``,
    `_Exported on ${todayLabel()} · ${workshop.difficulty} · ${workshop.lessons.length} lessons_`,
    ``,
    workshop.summary,
    ``,
    `## Key points`,
    ...workshop.key_points.map((p) => `- ${p}`),
    ``,
    `## Learning objectives`,
    ...workshop.objectives.map((o) => `- ${o}`),
    ``,
  ];
  const ordered = [...workshop.lessons].sort((a, b) => a.lesson_idx - b.lesson_idx);
  for (const lesson of ordered) {
    lines.push(`---`, ``);
    const body = contents.get(lesson.lesson_idx);
    if (body) {
      lines.push(demoteHeadings(body), ``);
    } else {
      lines.push(`## ${lesson.title}`, ``, `_${notGeneratedNote}_`, ``);
    }
  }
  return lines.join("\n");
}

export async function downloadWorkshopMarkdown(
  workshop: Workshop,
  contents: LessonContents,
  notGeneratedNote: string,
): Promise<void> {
  const md = buildWorkshopMarkdown(workshop, contents, notGeneratedNote);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  await saveBlob(blob, `${slugify(workshop.title)}-${dateStamp()}.md`, {
    description: "Markdown file",
    mimeType: "text/markdown",
    extension: "md",
  });
}

// ── PDF ─────────────────────────────────────────────────────────────────────

type Block =
  | { kind: "h1" | "h2" | "h3" | "p" | "code"; text: string }
  | { kind: "li"; text: string }
  | { kind: "gap" };

/** Strip inline Markdown markers for plain-text PDF rendering. */
function stripInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

/** Line-based Markdown → render blocks (headings, bullets, code fences, prose). */
function mdToBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  let inFence = false;
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      blocks.push({ kind: "code", text: raw });
      continue;
    }
    if (!line.trim()) {
      blocks.push({ kind: "gap" });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line.trim());
    if (h) {
      const kind = h[1].length === 1 ? "h1" : h[1].length === 2 ? "h2" : "h3";
      blocks.push({ kind, text: stripInline(h[2]) });
      continue;
    }
    const li = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (li) {
      blocks.push({ kind: "li", text: `•  ${stripInline(li[1])}` });
      continue;
    }
    const num = /^\s*(\d+[.)])\s+(.*)$/.exec(line);
    if (num) {
      blocks.push({ kind: "li", text: `${num[1]}  ${stripInline(num[2])}` });
      continue;
    }
    blocks.push({ kind: "p", text: stripInline(line) });
  }
  return blocks;
}

export async function downloadWorkshopPdf(
  workshop: Workshop,
  contents: LessonContents,
  notGeneratedNote: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const MARGIN = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensure = (space: number) => {
    if (y + space > pageH - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const write = (
    str: string,
    opts: {
      size: number;
      bold?: boolean;
      color?: [number, number, number];
      indent?: number;
      gap?: number;
      mono?: boolean;
    },
  ) => {
    const { size, bold = false, color = [17, 17, 17], indent = 0, gap = 4, mono = false } = opts;
    doc.setFont(mono ? "courier" : "helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lineH = size * 1.4;
    const lines = doc.splitTextToSize(str, maxW - indent) as string[];
    for (const line of lines) {
      ensure(lineH);
      doc.text(line, MARGIN + indent, y);
      y += lineH;
    }
    y += gap;
  };

  const writeBlock = (b: Block) => {
    if (b.kind === "gap") {
      y += 4;
      return;
    }
    if (b.kind === "h1") return write(b.text, { size: 14, bold: true, gap: 6 });
    if (b.kind === "h2") return write(b.text, { size: 12.5, bold: true, gap: 5 });
    if (b.kind === "h3") return write(b.text, { size: 11.5, bold: true, gap: 4 });
    if (b.kind === "li") return write(b.text, { size: 10.5, indent: 14, gap: 2 });
    if (b.kind === "code") return write(b.text || " ", { size: 9.5, mono: true, color: [80, 80, 80], indent: 14, gap: 1 });
    return write(b.text, { size: 10.5, gap: 3 });
  };

  // ── Cover block ──
  write(workshop.title, { size: 20, bold: true, gap: 2 });
  write(
    `Exported on ${todayLabel()} · ${workshop.difficulty} · ${workshop.lessons.length} lessons`,
    { size: 9, color: [120, 120, 120], gap: 12 },
  );
  write(workshop.summary, { size: 10.5, gap: 12 });
  write("Key points", { size: 12, bold: true, gap: 4 });
  workshop.key_points.forEach((p) => write(`•  ${p}`, { size: 10.5, indent: 14, gap: 2 }));
  y += 8;
  write("Learning objectives", { size: 12, bold: true, gap: 4 });
  workshop.objectives.forEach((o) => write(`•  ${o}`, { size: 10.5, indent: 14, gap: 2 }));

  // ── Lessons ──
  const ordered = [...workshop.lessons].sort((a, b) => a.lesson_idx - b.lesson_idx);
  for (const lesson of ordered) {
    doc.addPage();
    y = MARGIN;
    const body = contents.get(lesson.lesson_idx);
    if (!body) {
      write(lesson.title, { size: 14, bold: true, gap: 6 });
      write(notGeneratedNote, { size: 10.5, color: [120, 120, 120] });
      continue;
    }
    mdToBlocks(body).forEach(writeBlock);
  }

  doc.save(`${slugify(workshop.title)}-${dateStamp()}.pdf`);
}
