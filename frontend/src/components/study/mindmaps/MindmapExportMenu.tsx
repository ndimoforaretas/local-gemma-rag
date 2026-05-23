/**
 * Compact export menu for the mindmap view — 3 buttons: MD, PNG, PDF.
 *
 * Each click triggers the corresponding export helper and notifies the parent
 * (so the backend export_count can be incremented + achievements re-evaluated).
 */

import { useState } from "react";
import { FileText, Image as ImageIcon, Printer, Loader2 } from "lucide-react";
import { downloadMarkdown, downloadPng, printAsPdf } from "./mindmapExport";
import type { Mindmap } from "./types";

export function MindmapExportMenu({
  mindmap,
  svgId,
  onExported,
}: {
  mindmap: Mindmap;
  svgId: string;
  onExported: () => void;
}) {
  const [busy, setBusy] = useState<null | "md" | "png" | "pdf">(null);

  const run = async (kind: "md" | "png" | "pdf") => {
    setBusy(kind);
    try {
      if (kind === "md") await downloadMarkdown(mindmap);
      else if (kind === "png") await downloadPng(mindmap, svgId);
      else await printAsPdf(mindmap, svgId);
      onExported();
    } catch (err) {
      // Cancellation of the native Save-As dialog is benign; real errors
      // bubble up here so we surface them to the dev console.
      console.error("Mindmap export failed:", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <ExportBtn
        onClick={() => run("md")}
        busy={busy === "md"}
        icon={<FileText size={14} />}
        label="Markdown"
        tooltip="Download as Markdown (.md) — opens a Save As dialog where you can rename and choose a folder"
      />
      <ExportBtn
        onClick={() => run("png")}
        busy={busy === "png"}
        icon={<ImageIcon size={14} />}
        label="Image"
        tooltip="Download as PNG image (.png) — opens a Save As dialog where you can rename and choose a folder"
      />
      <ExportBtn
        onClick={() => run("pdf")}
        busy={busy === "pdf"}
        icon={<Printer size={14} />}
        label="PDF"
        tooltip="Save as PDF via the browser print dialog"
        primary
      />
    </div>
  );
}

function ExportBtn({
  onClick,
  busy,
  icon,
  label,
  tooltip,
  primary = false,
}: {
  onClick: () => void;
  busy: boolean;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  primary?: boolean;
}) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50";
  const variant = primary
    ? "bg-[#a855f7] hover:bg-[#9333ea] text-white"
    : "border border-[#c2c6d6] dark:border-[#424754] hover:border-[#a855f7]/50 text-[#191c1e] dark:text-[#e1e2ec]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={tooltip}
      aria-label={tooltip}
      className={`${base} ${variant}`}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
