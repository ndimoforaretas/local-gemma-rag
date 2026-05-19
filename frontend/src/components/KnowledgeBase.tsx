import { useState, useRef, useEffect } from "react";
import {
  Bot,
  History,
  Plus,
  FolderPlus,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tooltip } from "./Tooltip";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ContextSidebar } from "./ContextSidebar";
import { HistorySidebar } from "./HistorySidebar";
import { ConfirmationModal } from "./ConfirmationModal";
import { api } from "../lib/api";
import type {
  ChatSession,
  Message,
  ContextItem,
  Attachment,
  MessageAttachment,
  SaveToKBFile,
} from "../types/api";

function generateThumbnail(
  base64: string,
  mimeType: string,
  maxSize = 120,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve("");
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

export function KnowledgeBase() {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingKBFiles, setPendingKBFiles] = useState<SaveToKBFile[]>([]);
  const [kbSaveStatus, setKbSaveStatus] = useState<"idle" | "saving" | "done">(
    "idle",
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNewChatRef = useRef(false);

  // Custom modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────

  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ["history"],
    queryFn: async () => {
      try {
        const data = await api.getHistory();
        if (data && data.length > 0) {
          // Handle legacy flat-message format
          const first = data[0] as any;
          if (!first.id || first.role) {
            return [
              {
                id: "legacy-1",
                title: "Previous Chat",
                updatedAt: Date.now(),
                messages: data as unknown as Message[],
              },
            ];
          }
          return (data as ChatSession[]).sort(
            (a, b) => b.updatedAt - a.updatedAt,
          );
        }
        return [];
      } catch {
        return [];
      }
    },
  });

  const saveHistoryMutation = useMutation({
    mutationFn: (newSessions: ChatSession[]) => api.saveHistory(newSessions),
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: (sessionId: string) => api.deleteHistorySession(sessionId),
  });

  // ── Derived state ─────────────────────────────────────────────────

  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId && !isNewChatRef.current) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];
  const contextCount = contextItems.length;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // ── Helpers ───────────────────────────────────────────────────────

  const updateSessionMessages = (
    sessionId: string,
    updater: (prev: Message[]) => Message[],
  ) => {
    queryClient.setQueryData<ChatSession[]>(["history"], (old = []) => {
      const next = old.map((s) =>
        s.id === sessionId
          ? { ...s, messages: updater(s.messages), updatedAt: Date.now() }
          : s,
      );
      saveHistoryMutation.mutate(next);
      return next;
    });
  };

  const handleExportMessage = (content: string, id: string) => {
    const md = `**Gemma CogniVault AI**\n\n${content}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CogniVault_Response_${id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Send message (streaming) ──────────────────────────────────────

  const handleSend = async (attachments: Attachment[] = []) => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage = input.trim() || "[Attached files]";
    setInput("");
    setIsLoading(true);
    setPendingKBFiles([]);
    setKbSaveStatus("idle");

    // Build lightweight previews for chat history persistence
    const messagePreviews: MessageAttachment[] = [];
    const textFilesForKB: SaveToKBFile[] = [];
    for (const att of attachments) {
      if (att.mime_type.startsWith("image/")) {
        const thumb = await generateThumbnail(att.data, att.mime_type);
        messagePreviews.push({
          mime_type: att.mime_type,
          thumbnail: thumb,
          name: att.name,
        });
      } else {
        messagePreviews.push({
          mime_type: att.mime_type,
          name: att.name || "file.txt",
        });
        textFilesForKB.push({
          name: att.name || `file_${Date.now()}.txt`,
          mime_type: att.mime_type,
          data: att.data,
        });
      }
    }

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: currentSessionId,
        title:
          userMessage.length > 25
            ? userMessage.substring(0, 25) + "..."
            : userMessage,
        updatedAt: Date.now(),
        messages: [],
      };
      queryClient.setQueryData<ChatSession[]>(["history"], (old = []) => {
        const next = [newSession, ...old];
        saveHistoryMutation.mutate(next);
        return next;
      });
      setActiveSessionId(currentSessionId);
      isNewChatRef.current = false;
    }

    const newMsgId = Date.now().toString();
    updateSessionMessages(currentSessionId, (prev) => [
      ...prev,
      {
        id: newMsgId,
        role: "user",
        content: userMessage,
        attachments: messagePreviews.length > 0 ? messagePreviews : undefined,
      },
    ]);

    try {
      const res = await api.ragStream(userMessage, attachments);

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let streamMode: "unknown" | "ndjson" | "plain" = "unknown";
      const FIRST_CHUNK_TIMEOUT_MS = 30000;
      const STREAM_IDLE_TIMEOUT_MS = 15000;
      const MAX_TIMEOUT_RETRIES = 2;
      let hasReceivedChunk = false;
      let timeoutRetries = 0;

      const aiMsgId = Date.now().toString() + "-ai";
      updateSessionMessages(currentSessionId, (prev) => [
        ...prev,
        { id: aiMsgId, role: "ai", content: "" },
      ]);

      const appendText = (text: string) => {
        if (!text) return;
        fullText += text;
        updateSessionMessages(currentSessionId, (prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId ? { ...msg, content: fullText } : msg,
          ),
        );
      };

      const handleMetadataEvent = (meta: any) => {
        const path = meta.source.includes(" > ")
          ? meta.source.split(" > ").slice(0, 2).join(" > ")
          : "Documents > Uploads";
        const title = meta.source.includes(" > ")
          ? meta.source.split(" > ").pop()
          : meta.source;

        setContextItems((prev) => {
          if (prev.some((item) => item.title === title)) return prev;
          return [...prev, { title, type: meta.type, path }];
        });
      };

      const processNdjsonLine = (line: string): boolean => {
        try {
          const event = JSON.parse(line);

          if (event.type === "text" && event.data) {
            appendText(String(event.data));
          } else if (event.type === "metadata" && event.data) {
            handleMetadataEvent(event.data);
          } else if (event.type === "error") {
            console.error("RAG error:", event.data);
          }
          return true;
        } catch {
          return false;
        }
      };

      const normalizeSseText = (raw: string): string => {
        if (!raw.includes("data:")) return raw;
        return raw
          .split("\n")
          .map((line) => {
            if (line.startsWith("data:")) return line.slice(5).trimStart();
            return "";
          })
          .join("\n");
      };

      const readWithTimeout = async (
        timeoutMs: number,
      ): Promise<ReadableStreamReadResult<Uint8Array>> => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        try {
          return await Promise.race([
            reader.read(),
            new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                reject(new Error("Stream read timeout"));
              }, timeoutMs);
            }),
          ]);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      };

      while (true) {
        let done = false;
        let value: Uint8Array | undefined;

        try {
          const result = await readWithTimeout(
            hasReceivedChunk ? STREAM_IDLE_TIMEOUT_MS : FIRST_CHUNK_TIMEOUT_MS,
          );
          done = result.done;
          value = result.value;
          timeoutRetries = 0;
        } catch (err) {
          const isTimeoutError =
            err instanceof Error && err.message.includes("Stream read timeout");

          if (isTimeoutError && timeoutRetries < MAX_TIMEOUT_RETRIES) {
            timeoutRetries += 1;
            continue;
          }

          // If we already have useful text, end gracefully instead of hanging forever.
          if (fullText.trim()) {
            await reader.cancel().catch(() => undefined);
            break;
          }
          throw err;
        }

        if (done) {
          const tail = buffer.trim();
          if (tail) {
            if (streamMode === "ndjson") {
              if (!processNdjsonLine(tail)) {
                appendText(normalizeSseText(tail));
              }
            } else {
              appendText(normalizeSseText(buffer));
            }
          }
          break;
        }

        hasReceivedChunk = true;
        const chunk = decoder.decode(value, { stream: true });

        // Fallback compatibility: handle plain text/SSE streams in addition to NDJSON.
        if (streamMode === "plain") {
          appendText(normalizeSseText(chunk));
          continue;
        }

        buffer += chunk;

        if (streamMode === "unknown") {
          const probe = buffer.trimStart();
          if (probe && !probe.startsWith("{")) {
            streamMode = "plain";
            appendText(normalizeSseText(buffer));
            buffer = "";
            continue;
          }
        }

        // Process complete lines for NDJSON mode.
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (processNdjsonLine(trimmed)) {
            streamMode = "ndjson";
            continue;
          }

          if (streamMode === "unknown") {
            streamMode = "plain";
            appendText(normalizeSseText(trimmed + "\n"));
          } else if (streamMode === "plain") {
            appendText(normalizeSseText(trimmed + "\n"));
          } else {
            console.error("Failed to parse NDJSON line:", line);
          }
        }
      }
    } catch (e) {
      console.error(e);
      updateSessionMessages(currentSessionId, (prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: "Error communicating with the knowledge base.",
        },
      ]);
    } finally {
      setIsLoading(false);
      if (textFilesForKB.length > 0) {
        setPendingKBFiles(textFilesForKB);
      }
    }
  };

  const handleSelectSession = (id: string) => {
    isNewChatRef.current = false;
    setActiveSessionId(id);
    setContextItems([]);
  };

  const handleDeleteSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    if (!target) return;
    setSessionToDelete({ id: target.id, title: target.title });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    const { id } = sessionToDelete;
    setIsDeleteModalOpen(false);
    setDeletingSessionId(id);
    try {
      await deleteHistoryMutation.mutateAsync(id);

      queryClient.setQueryData<ChatSession[]>(["history"], (old = []) => {
        const next = old.filter((s) => s.id !== id);

        if (activeSessionId === id) {
          setActiveSessionId(next.length > 0 ? next[0].id : null);
          setContextItems([]);
        }

        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingSessionId(null);
      setSessionToDelete(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full relative">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4 lg:p-6 gap-3 lg:gap-4 min-w-0">
        {/* Header Bar */}
        <div className="flex flex-col gap-3 sm:gap-2 sm:flex-row sm:items-center sm:justify-between bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-3 sm:p-4 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff] flex items-center justify-center border border-[#c2c6d6] dark:border-[#424754]">
              <Bot size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[#191c1e] dark:text-[#e1e2ec] tracking-tight truncate">
                Gemma CogniVault AI
              </h2>
              <p className="text-xs sm:text-sm text-[#424754] dark:text-[#8c909f] font-medium truncate">
                {activeSession?.title || "New Conversation"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 sm:pr-2 flex-wrap">
            {contextCount > 0 && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff]">
                {contextCount} sources
              </span>
            )}
            <Tooltip content="Start a fresh conversation" position="bottom">
              <button
                onClick={() => {
                  isNewChatRef.current = true;
                  setActiveSessionId(null);
                  setContextItems([]);
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-[#191c1e] dark:text-[#c2c6d6] text-sm font-medium transition-colors">
                <Plus size={18} /> New Chat
              </button>
            </Tooltip>
            <Tooltip
              content={
                isHistoryOpen ? "Hide chat history" : "Browse past sessions"
              }
              position="bottom">
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`hidden sm:inline-flex p-2.5 rounded-xl transition-colors ${isHistoryOpen ? "bg-[#a855f7] text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]" : "bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-[#191c1e] dark:text-[#c2c6d6]"}`}>
                <History size={20} />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Messages */}
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          copiedId={copiedId}
          onCopy={handleCopyMessage}
          onExport={handleExportMessage}
          messagesEndRef={messagesEndRef}
        />

        {/* KB Bridge Action Card */}
        {pendingKBFiles.length > 0 && !isLoading && (
          <div className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 flex items-center justify-between gap-3 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <FolderPlus
                size={20}
                className="text-emerald-600 dark:text-emerald-400 shrink-0"
              />
              <span className="text-sm text-[#191c1e] dark:text-[#e1e2ec] font-medium truncate">
                {kbSaveStatus === "done"
                  ? `✅ "${pendingKBFiles[0].name}" added & ingestion started`
                  : `Add "${pendingKBFiles[0].name}" to Knowledge Base?`}
              </span>
            </div>
            {kbSaveStatus === "idle" && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    setKbSaveStatus("saving");
                    try {
                      await api.saveToKB(pendingKBFiles);
                      setKbSaveStatus("done");
                      setTimeout(() => {
                        setPendingKBFiles([]);
                        setKbSaveStatus("idle");
                      }, 4000);
                    } catch (e) {
                      console.error(e);
                      setKbSaveStatus("idle");
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">
                  Add to KB
                </button>
                <button
                  onClick={() => {
                    setPendingKBFiles([]);
                    setKbSaveStatus("idle");
                  }}
                  className="p-1.5 rounded-lg text-[#727785] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] hover:bg-[#e0e3e5] dark:hover:bg-[#32353c] transition-colors">
                  <X size={16} />
                </button>
              </div>
            )}
            {kbSaveStatus === "saving" && (
              <Loader2
                size={18}
                className="animate-spin text-emerald-600 dark:text-emerald-400 shrink-0"
              />
            )}
            {kbSaveStatus === "done" && (
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            )}
          </div>
        )}

        {/* Input */}
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSend={handleSend}
        />
      </div>

      {/* Context Sidebar */}
      <div className="hidden xl:block">
        <ContextSidebar contextItems={contextItems} />
      </div>

      {/* History Sidebar */}
      <div className="hidden lg:block">
        <HistorySidebar
          isOpen={isHistoryOpen}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          deletingSessionId={deletingSessionId}
        />
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Chat Session"
        message={`Delete session "${sessionToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        type="destructive"
        onConfirm={confirmDeleteSession}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSessionToDelete(null);
        }}
      />
    </div>
  );
}
