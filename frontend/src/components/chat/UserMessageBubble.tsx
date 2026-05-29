import { CornerDownLeft, FileText, X as XIcon } from "lucide-react";
import type { MessageAttachment } from "../../types/api";

interface UserMessageBubbleProps {
  content: string;
  attachments?: MessageAttachment[];
  isEditing: boolean;
  editDraft: string;
  editTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onEditDraftChange: (v: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
}

export function UserMessageBubble({
  content, attachments, isEditing, editDraft,
  editTextareaRef, onEditDraftChange, onEditSubmit, onEditCancel,
}: UserMessageBubbleProps) {
  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 w-full min-w-[220px]">
        <textarea
          ref={editTextareaRef}
          value={editDraft}
          onChange={(e) => onEditDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onEditSubmit(); }
            if (e.key === "Escape") onEditCancel();
          }}
          rows={3}
          className="w-full rounded-xl bg-white/15 text-white placeholder-white/50 text-sm leading-relaxed p-2 resize-none border border-white/30 focus:outline-none focus:border-white/60"
          aria-label="Edit your message"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onEditCancel}
            className="flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
          >
            <XIcon size={12} /> Cancel
          </button>
          <button
            type="button"
            onClick={onEditSubmit}
            disabled={!editDraft.trim()}
            className="flex items-center gap-1 text-xs font-semibold text-white bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1 rounded-lg transition-colors"
          >
            <CornerDownLeft size={12} /> Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {attachments && attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) =>
            att.mime_type.startsWith("image/") && att.thumbnail ? (
              <img key={i} src={att.thumbnail} alt={att.name || "attachment"} className="w-16 h-16 rounded-lg object-cover border border-white/30" />
            ) : (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/20 text-white/90 text-xs font-medium">
                <FileText size={14} />
                <span className="max-w-[100px] truncate">{att.name || "file"}</span>
              </div>
            ),
          )}
        </div>
      )}
      <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
    </div>
  );
}
