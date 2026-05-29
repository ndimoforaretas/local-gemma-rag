/**
 * ChatMessageList — the scrollable message feed.
 *
 * Sub-components live under ./chat/:
 *  EmptyState · ThinkingPanel · ScopeFilterBadge
 *  UserMessageBubble · AIMessageBubble · TypingIndicator
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Pencil, User } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { EmptyState } from "./chat/EmptyState";
import { ThinkingPanel } from "./chat/ThinkingPanel";
import { ScopeFilterBadge } from "./chat/ScopeFilterBadge";
import { UserMessageBubble } from "./chat/UserMessageBubble";
import { AIMessageBubble } from "./chat/AIMessageBubble";
import { formatMessageTime } from "../lib/markdownTable";
import type { Message } from "../types/api";

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onExport: (content: string, id: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSuggestionSelect: (prompt: string, scope?: string[]) => void;
  onEdit?: (messageIndex: number, newContent: string) => void;
  onRegenerate?: (messageIndex: number) => void;
}

export function ChatMessageList({
  messages, isLoading, copiedId, onCopy, onExport,
  messagesEndRef, onSuggestionSelect, onEdit, onRegenerate,
}: ChatMessageListProps) {
  const prefersReducedMotion = useReducedMotion();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingIndex !== null && editTextareaRef.current) {
      const el = editTextareaRef.current;
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, [editingIndex]);

  const startEdit = (index: number, content: string) => { setEditingIndex(index); setEditDraft(content); };
  const cancelEdit = () => { setEditingIndex(null); setEditDraft(""); };
  const submitEdit = (index: number) => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    setEditingIndex(null); setEditDraft("");
    onEdit?.(index, trimmed);
  };

  return (
    <div className="flex-1 rounded-2xl bg-[#f2f4f6] dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] transition-colors duration-300 overflow-hidden relative">
      <div role="log" aria-live="polite" aria-relevant="additions text" aria-label="Conversation messages" className="h-full overflow-y-auto p-6">
        {messages.length === 0 ? (
          <EmptyState onSuggestionSelect={onSuggestionSelect} />
        ) : (
          <div className="flex flex-col gap-6" role="list">
            <AnimatePresence initial={false}>
              {messages.map((msg, msgIndex) => (
                <motion.div
                  key={msg.id}
                  role="listitem"
                  aria-label={msg.role === "user" ? "User message" : "Assistant message"}
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  {msg.role === "user" ? (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 bg-[#a855f7] text-white">
                      <User size={16} />
                    </div>
                  ) : (
                    <img src="/mark.svg" alt="CogniVault AI" className="w-8 h-8 shrink-0 mt-1 drop-shadow-[0_1px_6px_rgba(167,139,250,0.35)]" />
                  )}

                  {/* Bubble container */}
                  <div className={`flex flex-col gap-2 ${msg.role === "user" ? "max-w-[82%] items-end" : "w-full max-w-[min(100%,74ch)] items-start"}`}>
                    <div className={`flex items-center gap-2 text-[11px] font-medium ${msg.role === "user" ? "text-[#6f4ab3] dark:text-[#cba6ff]" : "text-[#727785] dark:text-[#8c909f]"}`}>
                      <span>{msg.role === "user" ? "You" : "Gemma CogniVault AI"}</span>
                      {formatMessageTime(msg.id) && <span className="opacity-70">{formatMessageTime(msg.id)}</span>}
                    </div>

                    {msg.role === "user" && msg.scopeFilter && msg.scopeFilter.length > 0 && (
                      <ScopeFilterBadge scopeFilter={msg.scopeFilter} scopeLabel={msg.scopeLabel} />
                    )}

                    {msg.role === "ai" && msg.thinking && (
                      <ThinkingPanel thinking={msg.thinking} isStreaming={isLoading && !msg.content} />
                    )}

                    {msg.role === "user" ? (
                      <div className="w-fit bg-[#a855f7] text-white rounded-2xl rounded-tr-sm p-5 text-base leading-relaxed shadow-[0_4px_20px_rgba(168,85,247,0.3)]">
                        <UserMessageBubble
                          content={msg.content}
                          attachments={msg.attachments}
                          isEditing={editingIndex === msgIndex}
                          editDraft={editDraft}
                          editTextareaRef={editTextareaRef}
                          onEditDraftChange={setEditDraft}
                          onEditSubmit={() => submitEdit(msgIndex)}
                          onEditCancel={cancelEdit}
                        />
                      </div>
                    ) : (
                      <AIMessageBubble
                        content={msg.content}
                        msgId={msg.id}
                        isLoading={isLoading}
                        copiedId={copiedId}
                        onCopy={onCopy}
                        onExport={onExport}
                        onRegenerate={onRegenerate}
                        msgIndex={msgIndex}
                      />
                    )}

                    {msg.role === "user" && onEdit && !isLoading && editingIndex !== msgIndex && !msg.attachments?.length && (
                      <div className="flex justify-end mt-1">
                        <Tooltip content="Edit and resend" position="top">
                          <button
                            onClick={() => startEdit(msgIndex, msg.content)}
                            aria-label="Edit message"
                            className="flex items-center gap-1 text-xs font-medium text-[#c4a3f0] hover:text-white transition-colors opacity-60 hover:opacity-100"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
