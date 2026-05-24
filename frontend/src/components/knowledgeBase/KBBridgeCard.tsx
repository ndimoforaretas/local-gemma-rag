/**
 * Post-message offer to add text-like attachments into the persistent
 * Knowledge Base. Hidden once the user dismisses, saves, or after a
 * successful indexing run.
 */

import { CheckCircle2, FolderPlus, Loader2, X } from "lucide-react";
import type { SaveToKBFile } from "../../types/api";
import type { KBSaveStatus } from "./useKBBridge";

export interface KBBridgeCardProps {
  files: SaveToKBFile[];
  status: KBSaveStatus;
  onSave: () => void;
  onDismiss: () => void;
}

function statusMessage(status: KBSaveStatus, firstFile?: string): string {
  if (!firstFile) return "";
  switch (status) {
    case "done":
      return `✅ "${firstFile}" indexed and ready`;
    case "indexing":
      return `⚙️ Indexing "${firstFile}"…`;
    case "error":
      return `❌ Failed to save "${firstFile}" — try again`;
    default:
      return `Add "${firstFile}" to Knowledge Base?`;
  }
}

export function KBBridgeCard({
  files,
  status,
  onSave,
  onDismiss,
}: KBBridgeCardProps) {
  if (files.length === 0) return null;
  const firstFile = files[0]?.name;
  const isWorking = status === "saving" || status === "indexing";

  return (
    <div className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 flex items-center justify-between gap-3 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <FolderPlus
          size={20}
          className="text-emerald-600 dark:text-emerald-400 shrink-0"
        />
        <span className="text-sm text-[#191c1e] dark:text-[#e1e2ec] font-medium truncate">
          {statusMessage(status, firstFile)}
        </span>
      </div>

      {status === "idle" && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onSave}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            Add to KB
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-[#727785] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] hover:bg-[#e0e3e5] dark:hover:bg-[#32353c] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {isWorking && (
        <Loader2
          size={18}
          className="animate-spin text-emerald-600 dark:text-emerald-400 shrink-0"
        />
      )}

      {status === "done" && (
        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
      )}

      {status === "error" && (
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-[#727785] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] hover:bg-[#e0e3e5] dark:hover:bg-[#32353c] transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
