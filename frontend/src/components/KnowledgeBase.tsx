import { useState, useRef, useEffect } from "react";
import { Bot, History, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tooltip } from "./Tooltip";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ContextSidebar } from "./ContextSidebar";
import { HistorySidebar } from "./HistorySidebar";
import { api } from "../lib/api";
import type { ChatSession, Message, ContextItem } from "../types/api";

export function KnowledgeBase() {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNewChatRef = useRef(false);

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

  // ── Derived state ─────────────────────────────────────────────────

  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId && !isNewChatRef.current) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

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
      { id: newMsgId, role: "user", content: userMessage },
    ]);

    try {
      const res = await api.ragStream(userMessage);

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      const aiMsgId = Date.now().toString() + "-ai";
      updateSessionMessages(currentSessionId, (prev) => [
        ...prev,
        { id: aiMsgId, role: "ai", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (JSON Lines format)
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);

            if (event.type === "text" && event.data) {
              fullText += event.data;
              updateSessionMessages(currentSessionId, (prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId ? { ...msg, content: fullText } : msg,
                ),
              );
            } else if (event.type === "metadata" && event.data) {
              const meta = event.data;
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
            } else if (event.type === "error") {
              console.error("RAG error:", event.data);
            }
          } catch (e) {
            console.error("Failed to parse JSON Line:", line, e);
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
    }
  };

  const handleSelectSession = (id: string) => {
    isNewChatRef.current = false;
    setActiveSessionId(id);
    setContextItems([]);
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full relative">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff] flex items-center justify-center border border-[#c2c6d6] dark:border-[#424754]">
              <Bot size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e] dark:text-[#e1e2ec] tracking-tight">
                Gemma CogniVault AI
              </h2>
              <p className="text-sm text-[#424754] dark:text-[#8c909f] font-medium">
                {activeSession?.title || "New Conversation"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pr-2">
            <Tooltip content="Start a fresh conversation" position="bottom">
              <button
                onClick={() => {
                  isNewChatRef.current = true;
                  setActiveSessionId(null);
                  setContextItems([]);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-[#191c1e] dark:text-[#c2c6d6] font-medium transition-colors">
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
                className={`p-2.5 rounded-xl transition-colors ${isHistoryOpen ? "bg-[#a855f7] text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]" : "bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-[#191c1e] dark:text-[#c2c6d6]"}`}>
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

        {/* Input */}
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSend={handleSend}
        />
      </div>

      {/* Context Sidebar */}
      <ContextSidebar contextItems={contextItems} />

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
      />
    </div>
  );
}
