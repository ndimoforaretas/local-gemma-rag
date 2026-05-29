import { Trash2 } from "lucide-react";
import { Tooltip } from "../Tooltip";
import type { KBFile } from "../../types/api";

interface KBFileCardProps {
  file: KBFile;
  isDeleting: boolean;
  onDelete: (e: React.MouseEvent, filename: string) => void;
}

export function KBFileCard({ file, isDeleting, onDelete }: KBFileCardProps) {
  return (
    <div
      role="listitem"
      className="bg-[#f2f4f6] dark:bg-[#272a31] p-3 rounded-xl border border-[#c2c6d6] dark:border-[#424754] flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-[#0058be] dark:text-[#adc6ff] bg-[#d0e1fb] dark:bg-[#32353c] p-1.5 rounded-md shrink-0">
            📄
          </span>
          <span className="text-sm sm:text-base text-[#191c1e] dark:text-[#c2c6d6] break-words">
            {file.name}
          </span>
        </div>
        <Tooltip content="Remove this document from knowledge base" position="top">
          <button
            onClick={(e) => onDelete(e, file.name)}
            disabled={isDeleting}
            className="text-[#8c909f] hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1 shrink-0"
            aria-label={`Delete ${file.name}`}
          >
            <Trash2 size={16} />
          </button>
        </Tooltip>
      </div>
      <div className="flex items-center justify-between text-xs text-[#727785] dark:text-[#8c909f]">
        <span>{isDeleting ? "Removing..." : file.size}</span>
        <span>{file.modified}</span>
      </div>
    </div>
  );
}
