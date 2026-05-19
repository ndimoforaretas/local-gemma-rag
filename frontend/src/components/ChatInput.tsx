import { useEffect, useId, useRef, useState } from "react";
import { Send, Paperclip, Loader2, X, AlertTriangle } from "lucide-react";
import { Tooltip } from "./Tooltip";
import type { Attachment } from "../types/api";

// ── Attachment limits ─────────────────────────────────────────────────────
const MAX_IMAGES = 3;
const MAX_TEXT_FILES = 3;
const MAX_IMAGE_SIZE_MB = 10;
const MAX_TEXT_SIZE_MB = 5;

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: (attachments: Attachment[]) => void;
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSend,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const helperTextId = useId();
  const charCountId = useId();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isLoading;

  const showWarning = (msg: string) => {
    setWarning(msg);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setWarning(null), 5000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const currentImages = attachments.filter((a) => a.mime_type.startsWith("image/")).length;
    const currentTexts = attachments.filter((a) => !a.mime_type.startsWith("image/")).length;
    let addedImages = 0;
    let addedTexts = 0;

    const newAttachments: Attachment[] = [];
    for (const file of Array.from(e.target.files)) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("text/")) continue;

      const isImage = file.type.startsWith("image/");
      const maxSizeBytes = (isImage ? MAX_IMAGE_SIZE_MB : MAX_TEXT_SIZE_MB) * 1024 * 1024;

      // Size check
      if (file.size > maxSizeBytes) {
        showWarning(
          `"${file.name}" exceeds the ${isImage ? MAX_IMAGE_SIZE_MB : MAX_TEXT_SIZE_MB}MB limit and was skipped.`
        );
        continue;
      }

      // Count check
      if (isImage && currentImages + addedImages >= MAX_IMAGES) {
        showWarning(
          `Maximum ${MAX_IMAGES} images per message. Use the Knowledge Base for bulk document processing.`
        );
        continue;
      }
      if (!isImage && currentTexts + addedTexts >= MAX_TEXT_FILES) {
        showWarning(
          `Maximum ${MAX_TEXT_FILES} text files per message. Use the Knowledge Base to index more documents.`
        );
        continue;
      }

      const buffer = await file.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      newAttachments.push({
        mime_type: file.type,
        data: base64String,
        name: file.name,
      });

      if (isImage) addedImages++;
      else addedTexts++;
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (e.nativeEvent.isComposing) return;
    if (e.shiftKey) return;

    e.preventDefault();
    if (canSend) {
      onSend(attachments);
      setAttachments([]);
    }
  };

  const imageCount = attachments.filter((a) => a.mime_type.startsWith("image/")).length;
  const textCount = attachments.filter((a) => !a.mime_type.startsWith("image/")).length;

  return (
    <div className="flex flex-col gap-2">
      {/* Warning toast */}
      {warning && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm animate-in fade-in slide-in-from-bottom-2">
          <AlertTriangle size={16} className="shrink-0 text-amber-400" />
          <span className="flex-1">{warning}</span>
          <button
            type="button"
            onClick={() => setWarning(null)}
            className="shrink-0 p-0.5 rounded hover:bg-amber-500/20 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative w-14 h-14 bg-white dark:bg-[#272a31] rounded-lg border border-[#c2c6d6] dark:border-[#424754] flex items-center justify-center overflow-hidden group">
              {att.mime_type.startsWith("image/") ? (
                <img src={`data:${att.mime_type};base64,${att.data}`} alt="attachment" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-center break-words px-1 font-semibold text-[#727785] dark:text-[#8c909f]">TXT</span>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl px-3 py-2 flex items-end gap-2 transition-all focus-within:border-[#0058be] dark:focus-within:border-[#a855f7] focus-within:ring-2 focus-within:ring-[#0058be]/20 dark:focus-within:ring-[#a855f7]/20">
        <Tooltip content={`Attach image or text (${imageCount}/${MAX_IMAGES} img, ${textCount}/${MAX_TEXT_FILES} files)`} position="right">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach a file"
            disabled={isLoading || (imageCount >= MAX_IMAGES && textCount >= MAX_TEXT_FILES)}
            className="w-9 h-9 mb-1 flex items-center justify-center rounded-full text-[#727785] dark:text-[#988d9f] hover:text-[#0058be] dark:hover:text-[#ddb7ff] hover:bg-[#d0e1fb] dark:hover:bg-[#3d2f4b] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            <Paperclip size={18} />
          </button>
        </Tooltip>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*,text/*,.md,.csv" 
          multiple 
          className="hidden" 
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Gemma CogniVault..."
          rows={1}
          aria-label="Message input"
          aria-describedby={`${helperTextId} ${charCountId}`}
          aria-busy={isLoading}
          className="flex-1 bg-transparent border-0 outline-none resize-none min-h-[44px] max-h-44 py-2 px-1 text-base leading-6 text-[#191c1e] dark:text-[#e1e2ec] placeholder-[#727785] dark:placeholder-[#8c909f]"
        />

        <Tooltip
          content={isLoading ? "Generating response..." : "Send message"}
          position="top">
          <button
            type="button"
            onClick={() => {
              if (canSend) {
                onSend(attachments);
                setAttachments([]);
              }
            }}
            aria-label={isLoading ? "Generating response" : "Send message"}
            aria-disabled={!canSend}
            disabled={!canSend}
            className="w-10 h-10 rounded-full mb-1 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#e0e3e5] dark:disabled:bg-[#3d2f4b] disabled:text-[#727785] dark:disabled:text-[#988d9f] text-white flex items-center justify-center transition-all hover:shadow-[0_0_16px_rgba(168,85,247,0.5)] active:scale-95 disabled:scale-100">
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-between px-2 text-xs text-[#727785] dark:text-[#8c909f]">
        <span id={helperTextId}>
          {isLoading
            ? "Generating response..."
            : "Enter to send, Shift+Enter for new line"}
        </span>
        <span id={charCountId} aria-live="polite">
          {input.length} chars
        </span>
      </div>
    </div>
  );
}
