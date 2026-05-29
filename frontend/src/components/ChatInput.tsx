/**
 * ChatInput — the composer bar at the bottom of the chat view.
 *
 * Sub-components/hooks under ./chat/:
 *  useFileAttachments · useVoiceRecorder
 *  AttachmentTray · WarningToast
 */

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Mic, Paperclip, Send, Square } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { AttachmentTray } from "./chat/AttachmentTray";
import { WarningToast } from "./chat/WarningToast";
import { useFileAttachments } from "./chat/useFileAttachments";
import { useVoiceRecorder } from "./chat/useVoiceRecorder";
import { MAX_ATTACHMENTS } from "../lib/attachmentUtils";
import type { Attachment } from "../types/api";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: (attachments: Attachment[]) => void;
}

export function ChatInput({ input, isLoading, onInputChange, onSend }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const helperTextId = useId();
  const charCountId = useId();
  const [warning, setWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const showWarning = (msg: string) => {
    setWarning(msg);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setWarning(null), 5000);
  };

  const files = useFileAttachments({ onWarning: showWarning });
  const voice = useVoiceRecorder({
    onTranscript: onInputChange,
    onWarning: showWarning,
    currentInput: input,
  });

  // Auto-resize textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
  }, [input]);

  const canSend = (input.trim().length > 0 || files.attachments.length > 0) && !isLoading;
  const attachmentsAtLimit = files.attachments.length >= MAX_ATTACHMENTS;

  const handleSend = () => {
    if (!canSend) return;
    onSend(files.attachments);
    files.clearAttachments();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || e.shiftKey) return;
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="flex flex-col gap-2">
      {warning && <WarningToast message={warning} onDismiss={() => setWarning(null)} />}

      <AttachmentTray attachments={files.attachments} onRemove={files.removeAttachment} />

      <div className="bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl px-3 py-2 flex items-end gap-2 transition-all focus-within:border-[#0058be] dark:focus-within:border-[#a855f7] focus-within:ring-2 focus-within:ring-[#0058be]/20 dark:focus-within:ring-[#a855f7]/20">
        {/* Attach button */}
        <Tooltip
          content={attachmentsAtLimit ? `Maximum ${MAX_ATTACHMENTS} attachments reached` : isLoading ? "Generating response..." : "Attach files (images, PDF, DOCX, text — up to 5)"}
          position="top-start"
        >
          <button
            type="button"
            onClick={() => { if (!isLoading && !attachmentsAtLimit) files.fileInputRef.current?.click(); }}
            aria-label="Attach files"
            aria-disabled={isLoading || attachmentsAtLimit}
            className={`w-9 h-9 mb-1 flex items-center justify-center rounded-full transition-all ${isLoading || attachmentsAtLimit ? "opacity-40 cursor-not-allowed text-ink-muted" : "text-ink-muted hover:text-[#0058be] dark:hover:text-[#ddb7ff] hover:bg-[#d0e1fb] dark:hover:bg-[#3d2f4b]"}`}
          >
            <Paperclip size={18} />
          </button>
        </Tooltip>
        <input
          type="file"
          ref={files.fileInputRef}
          onChange={files.handleFileChange}
          accept="image/*,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,text/*,.md,.csv,.json,.xml,.yaml,.yml,.log,.py,.js,.ts,.tsx,.jsx,.sql"
          multiple
          className="hidden"
        />

        {/* Mic button — only when Whisper is available */}
        {voice.transcriptionAvailable && (
          <Tooltip
            content={isLoading ? "Generating response…" : voice.isTranscribing ? "Transcribing…" : voice.isRecording ? "Stop recording" : "Record voice message (Whisper)"}
            position="top"
          >
            <button
              type="button"
              onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
              disabled={isLoading || voice.isTranscribing}
              aria-label={voice.isRecording ? "Stop recording" : "Record voice message"}
              className={`w-9 h-9 mb-1 flex items-center justify-center rounded-full transition-all ${isLoading || voice.isTranscribing ? "opacity-40 cursor-not-allowed text-ink-muted" : voice.isRecording ? "bg-red-500/90 text-white animate-pulse hover:bg-red-600" : "text-ink-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"}`}
            >
              {voice.isTranscribing ? <Loader2 size={18} className="animate-spin" /> : voice.isRecording ? <Square size={16} className="fill-current" /> : <Mic size={18} />}
            </button>
          </Tooltip>
        )}

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
          className="flex-1 bg-transparent border-0 outline-none resize-none min-h-[44px] max-h-44 py-2 px-1 text-base leading-6 text-ink placeholder-[#586271] dark:placeholder-[#9aa1b2]"
        />

        {/* Send button */}
        <Tooltip content={isLoading ? "Generating response..." : "Send message"} position="top">
          <button
            type="button"
            onClick={handleSend}
            aria-label={isLoading ? "Generating response" : "Send message"}
            aria-disabled={!canSend}
            disabled={!canSend}
            className="w-10 h-10 rounded-full mb-1 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#e0e3e5] dark:disabled:bg-[#3d2f4b] disabled:text-[#727785] dark:disabled:text-[#988d9f] text-white flex items-center justify-center transition-all hover:shadow-[0_0_16px_rgba(168,85,247,0.5)] active:scale-95 disabled:scale-100"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-between px-2 text-xs text-ink-faint">
        <span id={helperTextId}>
          {isLoading ? "Generating response..." : "Enter to send · Shift+Enter for new line · attach up to 5 files"}
        </span>
        <span id={charCountId} aria-live="polite">{input.length} chars</span>
      </div>
    </div>
  );
}
