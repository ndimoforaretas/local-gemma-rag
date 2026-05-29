import { X } from "lucide-react";
import { classifyFile, MAX_ATTACHMENTS } from "../../lib/attachmentUtils";
import { FileBadge } from "./FileBadge";
import type { Attachment } from "../../types/api";

interface AttachmentTrayProps {
  attachments: Attachment[];
  onRemove: (index: number) => void;
}

export function AttachmentTray({ attachments, onRemove }: AttachmentTrayProps) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 px-1">
      {attachments.map((att, idx) => {
        const kind = classifyFile({ name: att.name ?? "" }, att.mime_type);
        return (
          <div
            key={idx}
            className="relative w-14 h-14 bg-white dark:bg-[#272a31] rounded-lg border border-[#c2c6d6] dark:border-[#424754] flex items-center justify-center overflow-hidden group"
          >
            {kind === "image" ? (
              <img
                src={`data:${att.mime_type};base64,${att.data}`}
                alt={att.name || "attachment"}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileBadge kind={kind} name={att.name || "file"} />
            )}
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <div className="flex items-center text-xs text-[#727785] dark:text-[#8c909f] self-center">
        {attachments.length}/{MAX_ATTACHMENTS} files
      </div>
    </div>
  );
}
