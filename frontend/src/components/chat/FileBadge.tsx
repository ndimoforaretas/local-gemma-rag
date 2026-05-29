import type { AttachmentKind } from "../../lib/attachmentUtils";

/** Small coloured badge shown in the attachment tray for non-image files. */
export function FileBadge({ kind, name }: { kind: AttachmentKind; name: string }) {
  const label = kind === "pdf" ? "PDF" : kind === "docx" ? "DOC" : "TXT";
  const colours =
    kind === "pdf"
      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
      : kind === "docx"
      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
      : "bg-[#f2f4f6] dark:bg-[#272a31] text-ink-muted";
  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full px-1">
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${colours}`}>{label}</span>
      <span className="text-xs text-ink-faint truncate w-full text-center leading-tight">
        {name.length > 10 ? name.slice(0, 9) + "…" : name}
      </span>
    </div>
  );
}
