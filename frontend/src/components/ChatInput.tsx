import { useEffect, useId, useRef } from "react";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { Tooltip } from "./Tooltip";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSend,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const helperTextId = useId();
  const charCountId = useId();
  const canSend = input.trim().length > 0 && !isLoading;

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
      onSend();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl px-3 py-2 flex items-end gap-2 transition-all focus-within:border-[#0058be] dark:focus-within:border-[#a855f7] focus-within:ring-2 focus-within:ring-[#0058be]/20 dark:focus-within:ring-[#a855f7]/20">
        <Tooltip content="Attachment upload is coming soon" position="top">
          <button
            type="button"
            aria-label="Attach a file (coming soon)"
            disabled={isLoading}
            className="w-9 h-9 mb-1 flex items-center justify-center rounded-full text-[#727785] dark:text-[#988d9f] hover:text-[#0058be] dark:hover:text-[#ddb7ff] hover:bg-[#d0e1fb] dark:hover:bg-[#3d2f4b] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            <Paperclip size={18} />
          </button>
        </Tooltip>

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
            onClick={onSend}
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
