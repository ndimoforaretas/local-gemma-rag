/**
 * KnowledgeBase — the chat page. Composes the header, message list, scope
 * filter, composer, KB-bridge action card, context sidebar (desktop), and
 * mobile context drawer.
 *
 * Heavy logic lives in dedicated hooks under ./knowledgeBase/:
 *  - `useRagStream`: send a message and consume the NDJSON stream.
 *  - `useKBBridge`: post-message "Add to KB" action + polling.
 */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { DocScopeFilter } from "./DocScopeFilter";
import { ContextSidebar } from "./ContextSidebar";
import { HistorySidebar } from "./HistorySidebar";
import { ConfirmationModal } from "./ConfirmationModal";
import { ChatHeaderBar } from "./knowledgeBase/ChatHeaderBar";
import { KBBridgeCard } from "./knowledgeBase/KBBridgeCard";
import { ContextSidebarDrawer } from "./knowledgeBase/ContextSidebarDrawer";
import { useKBBridge } from "./knowledgeBase/useKBBridge";
import { useRagStream } from "./knowledgeBase/useRagStream";
import { api } from "../lib/api";
import type { ChatSession, ContextItem, Message } from "../types/api";

export function KnowledgeBase() {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [documentFilter, setDocumentFilter] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNewChatRef = useRef(false);

  // ── Data fetching ──────────────────────────────────────────────────
  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ["history"],
    queryFn: async () => {
      try {
        const data = await api.getHistory();
        if (data && data.length > 0) {
          // Handle legacy flat-message format.
          const first = data[0] as unknown as { id?: string; role?: string };
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
    mutationFn: (next: ChatSession[]) => api.saveHistory(next),
  });

  const { data: indexedDocsData } = useQuery({
    queryKey: ["indexedDocs"],
    queryFn: () => api.listIndexedDocs(),
    staleTime: 30_000,
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: (sessionId: string) => api.deleteHistorySession(sessionId),
  });

  // ── Session message helpers ────────────────────────────────────────
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

  const updateSessionContextItems = (sessionId: string, items: ContextItem[]) => {
    queryClient.setQueryData<ChatSession[]>(["history"], (old = []) => {
      const next = old.map((s) =>
        s.id === sessionId ? { ...s, contextItems: items } : s,
      );
      saveHistoryMutation.mutate(next);
      return next;
    });
  };

  // ── Hooks: KB bridge + RAG streaming ───────────────────────────────
  const kb = useKBBridge();
  const rag = useRagStream({
    activeSessionId,
    setActiveSessionId,
    setContextItems,
    documentFilter,
    setDocumentFilter,
    indexedDocs: indexedDocsData?.documents ?? [],
    setPendingKBFiles: kb.setPendingKBFiles,
    resetKBSaveStatus: kb.reset,
    updateSessionMessages,
    updateSessionContextItems,
    isNewChatRef,
    saveHistory: (next) => saveHistoryMutation.mutate(next),
  });

  // ── Derived state + scroll-to-bottom ───────────────────────────────
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId && !isNewChatRef.current) {
      const first = sessions[0];
      setActiveSessionId(first.id);
      setContextItems(first.contextItems ?? []);
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];
  const contextCount = contextItems.length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, rag.isLoading]);

  // ── Per-message actions ────────────────────────────────────────────
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

  /**
   * Edit a user message at `messageIndex` and resend. Trims the UI and
   * rewinds the agent history to the turn-pairs that existed *before*
   * this message.
   */
  const handleEdit = (messageIndex: number, newContent: string) => {
    if (!activeSessionId) return;
    updateSessionMessages(activeSessionId, (prev) => prev.slice(0, messageIndex));
    rag.send([], newContent, Math.floor(messageIndex / 2));
  };

  /** Regenerate the AI response at `messageIndex` by resending its prompt. */
  const handleRegenerate = (messageIndex: number) => {
    if (!activeSessionId) return;
    const currentMessages = activeSession?.messages ?? [];
    const userMsg = currentMessages[messageIndex - 1];
    if (!userMsg || userMsg.role !== "user") return;
    updateSessionMessages(activeSessionId, (prev) => prev.slice(0, messageIndex));
    rag.send([], userMsg.content, Math.floor((messageIndex - 1) / 2));
  };

  // ── Session list actions ───────────────────────────────────────────
  const handleSelectSession = (id: string) => {
    isNewChatRef.current = false;
    setActiveSessionId(id);
    const session = sessions.find((s) => s.id === id);
    setContextItems(session?.contextItems ?? []);
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

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-4 lg:p-6 gap-3 lg:gap-4 min-w-0">
        <ChatHeaderBar
          sessionTitle={activeSession?.title || "New Conversation"}
          contextCount={contextCount}
          isHistoryOpen={isHistoryOpen}
          onOpenContextDrawer={() => setIsContextOpen(true)}
          onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
          onNewChat={() => {
            isNewChatRef.current = true;
            setActiveSessionId(null);
            setContextItems([]);
          }}
        />

        <ChatMessageList
          messages={messages}
          isLoading={rag.isLoading}
          copiedId={copiedId}
          onCopy={handleCopyMessage}
          onExport={handleExportMessage}
          messagesEndRef={messagesEndRef}
          onSuggestionSelect={(prompt, scope) =>
            rag.send([], prompt, undefined, scope)
          }
          onEdit={handleEdit}
          onRegenerate={handleRegenerate}
        />

        {!rag.isLoading && (
          <KBBridgeCard
            files={kb.pendingKBFiles}
            status={kb.kbSaveStatus}
            onSave={kb.saveToKB}
            onDismiss={kb.dismiss}
          />
        )}

        <div className="flex flex-col gap-2 shrink-0">
          <DocScopeFilter selected={documentFilter} onChange={setDocumentFilter} />
          <ChatInput
            input={rag.input}
            isLoading={rag.isLoading}
            onInputChange={rag.setInput}
            onSend={rag.send}
          />
        </div>
      </div>

      <div className="hidden lg:contents">
        <ContextSidebar contextItems={contextItems} />
      </div>

      <ContextSidebarDrawer
        isOpen={isContextOpen}
        contextItems={contextItems}
        onClose={() => setIsContextOpen(false)}
      />

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
