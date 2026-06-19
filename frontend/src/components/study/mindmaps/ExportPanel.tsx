/**
 * Top-right export panel (MD / PNG / PDF). Lives inside the React Flow canvas
 * because PNG/PDF capture the live viewport; collapsed (hidden) nodes are
 * excluded from the framing.
 */

import { useState } from "react";
import { Panel, useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { FileText, Image as ImageIcon, Loader2, Printer } from "lucide-react";
import { downloadMarkdown, downloadPdf, downloadPng } from "./flowExport";
import type { Mindmap } from "./types";

type ExportKind = "md" | "png" | "pdf";

export function ExportPanel({
  mindmap,
  wrapRef,
  isDark,
  onExported,
}: {
  mindmap: Mindmap;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  isDark: boolean;
  onExported: () => void;
}) {
  const { t } = useTranslation("study");
  const rf = useReactFlow();
  const [busy, setBusy] = useState<null | ExportKind>(null);

  const runExport = async (kind: ExportKind) => {
    setBusy(kind);
    try {
      const bg = isDark ? "#10131a" : "#ffffff";
      const visible = rf.getNodes().filter((n) => !n.hidden);
      if (kind === "md") await downloadMarkdown(mindmap);
      else if (kind === "png") await downloadPng(wrapRef.current!, visible, mindmap, bg);
      else await downloadPdf(wrapRef.current!, visible, mindmap, bg);
      onExported();
    } catch (err) {
      console.error("Mindmap export failed:", err);
    } finally {
      setBusy(null);
    }
  };

  return (
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
