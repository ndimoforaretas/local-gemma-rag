import { useId } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { Tooltip } from "../Tooltip";
import type { SyncStatus } from "./syncTimeline";

export interface UploadDropZoneProps {
  syncStatus: SyncStatus;
  isDragActive: boolean;
  canUpload: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dragHandlers: {
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  };
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadDropZone(p: UploadDropZoneProps) {
  const dropZoneHintId = useId();
  return (
    <div className="bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col gap-5 transition-colors duration-300">
      <div className="min-w-0">
        <h3 className="text-xl sm:text-2xl font-semibold mb-1.5 sm:mb-2 text-ink-strong">
          Knowledge Base Management
        </h3>
        <p className="text-sm sm:text-base text-ink-muted">
          Upload documents and sync them into your local vector store.
        </p>
        <div className="mt-3 inline-flex items-center text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff]">
          Status: {p.syncStatus}
        </div>
      </div>

      <input
        type="file"
        ref={p.fileInputRef}
        onChange={p.onFileChange}
        multiple
        accept=".pdf,.txt,.md,.csv,.docx,.pptx,.xlsx,.html,.htm"
        className="hidden"
        aria-hidden="true"
      />

      <div
        {...p.dragHandlers}
        onKeyDown={p.onKeyDown}
        tabIndex={0}
        role="group"
        aria-label="File upload drop zone"
        aria-describedby={dropZoneHintId}
        aria-disabled={!p.canUpload}
        className={`rounded-2xl border-2 border-dashed px-4 py-8 sm:px-6 sm:py-10 text-center transition-all duration-300 ${
          p.isDragActive
            ? "border-[#a855f7] bg-[#d9c1f3]/45 dark:bg-[#3d2f4b]/55"
            : "border-[#727785] dark:border-[#8c909f] bg-[#f2f4f6] dark:bg-[#191b23]"
        }`}
      >
        <div className="mx-auto max-w-md flex flex-col items-center gap-3 sm:gap-4">
          {p.syncStatus === "UPLOADING"
            ? <Loader2 className="animate-spin text-[#0058be] dark:text-[#adc6ff]" size={46} />
            : <UploadCloud className="text-ink-muted" size={46} />
          }
          <p className="text-2xl sm:text-3xl font-semibold text-ink-muted tracking-tight">
            {p.isDragActive ? "Drop Files to Upload" : "Drag & Drop Files Here"}
          </p>
          <p className="text-sm sm:text-base text-ink-muted">or</p>
          <Tooltip content="Select files to add to your knowledge base" position="top">
            <button
              onClick={() => p.fileInputRef.current?.click()}
              disabled={!p.canUpload}
              className="inline-flex items-center justify-center gap-2 border border-[#0058be] dark:border-[#adc6ff] text-[#0058be] dark:text-[#adc6ff] bg-transparent hover:bg-[#d0e1fb] dark:hover:bg-[#32353c] disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-lg font-semibold transition-colors"
            >
              {p.syncStatus === "UPLOADING" && <Loader2 className="animate-spin" size={18} />}
              {p.syncStatus === "UPLOADING" ? "Uploading..." : "Browse Files"}
            </button>
          </Tooltip>
          <p id={dropZoneHintId} className="text-xs sm:text-sm text-ink-muted">
            PDF · DOCX · MD · TXT · CSV · PPTX · XLSX · HTML — up to 500 MB
          </p>
        </div>
      </div>
    </div>
  );
}
