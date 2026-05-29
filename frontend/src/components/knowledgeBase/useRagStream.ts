/**
 * useRagStream — owns the "send a chat message and consume the /rag stream"
 * flow. Extracted from KnowledgeBase.tsx so the page stays focused on layout.
 *
 * Responsibilities:
 *  - Resolve the active session (create one on first send).
 *  - Persist user + AI messages into the React-Query history cache.
 *  - Delegate stream consumption to `consumeRagStream` in ragStream.ts.
 *  - Surface live citation metadata into the caller's `setContextItems`.
 *  - Time out gracefully and replace the empty bubble with a useful error.
 */

import { useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { generateThumbnail } from "../../lib/imageThumbnail";
import { computeScopeLabel } from "./scopeLabel";
import {
  cleanAssistantText,
  consumeRagStream,
  type MetadataPayload,
} from "./ragStream";
import type {
  Attachment,
  ChatSession,
  ContextItem,
  IndexedDocument,
  Message,
  MessageAttachment,
  SaveToKBFile,
} from "../../types/api";

export interface UseRagStreamArgs {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  setContextItems: Dispatch<SetStateAction<ContextItem[]>>;
  documentFilter: string[];
  setDocumentFilter: (next: string[]) => void;
  indexedDocs: IndexedDocument[];
  setPendingKBFiles: (files: SaveToKBFile[]) => void;
  resetKBSaveStatus: () => void;
  updateSessionMessages: (
    sessionId: string,
    updater: (prev: Message[]) => Message[],
  ) => void;
  updateSessionContextItems: (sessionId: string, items: ContextItem[]) => void;
  isNewChatRef: React.MutableRefObject<boolean>;
  saveHistory: (sessions: ChatSession[]) => void;
}

export function useRagStream(args: UseRagStreamArgs) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const buildAttachmentPreviews = async (
    attachments: Attachment[],
  ): Promise<{ previews: MessageAttachment[]; textFilesForKB: SaveToKBFile[] }> => {
    const previews: MessageAttachment[] = [];
    const textFilesForKB: SaveToKBFile[] = [];
    for (const att of attachments) {
      if (att.mime_type.startsWith("image/")) {
        const thumb = await generateThumbnail(att.data, att.mime_type);
        previews.push({ mime_type: att.mime_type, thumbnail: thumb, name: att.name });
      } else {
        previews.push({ mime_type: att.mime_type, name: att.name || "file.txt" });
        textFilesForKB.push({
          name: att.name || `file_${Date.now()}.txt`,
          mime_type: att.mime_type,
          data: att.data,
        });
      }
    }
    return { previews, textFilesForKB };
  };

  const ensureSession = (userMessage: string): string => {
    if (args.activeSessionId) return args.activeSessionId;
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id,
      title: userMessage.length > 25 ? userMessage.substring(0, 25) + "..." : userMessage,
      updatedAt: Date.now(),
      messages: [],
    };
    queryClient.setQueryData<ChatSession[]>(["history"], (old = []) => {
      const next = [newSession, ...old];
      args.saveHistory(next);
      return next;
    });
    args.setActiveSessionId(id);
    args.isNewChatRef.current = false;
    return id;
  };

  const resolveScope = (
    scopeOverride: string[] | undefined,
  ): { filter: string[] | undefined; label: string | undefined } => {
    let filter: string[] | undefined;
    if (scopeOverride && scopeOverride.length > 0) {
      filter = [...scopeOverride];
    } else if (args.documentFilter.length > 0) {
      filter = [...args.documentFilter];
      args.setDocumentFilter([]);
    }
    return { filter, label: filter ? computeScopeLabel(filter, args.indexedDocs) : undefined };
  };

  // ── Core send ────────────────────────────────────────────────────────────

  const send = async (
    attachments: Attachment[] = [],
    directQuery?: string,
    trimHistoryToTurns?: number,
    scopeOverride?: string[],
  ) => {
    const queryText = directQuery !== undefined ? directQuery : input.trim();
    if ((!queryText && attachments.length === 0) || isLoading) return;

    const userMessage = queryText || "[Attached files]";
    if (directQuery === undefined) setInput("");
    setIsLoading(true);
    args.setPendingKBFiles([]);
    args.resetKBSaveStatus();
    args.setContextItems([]);

    const { previews, textFilesForKB } = await buildAttachmentPreviews(attachments);
    const sessionId = ensureSession(userMessage);
    args.updateSessionContextItems(sessionId, []);

    const { filter: scopeFilter, label: scopeLabel } = resolveScope(scopeOverride);

    args.updateSessionMessages(sessionId, (prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        attachments: previews.length > 0 ? previews : undefined,
        scopeFilter,
        scopeLabel,
      },
    ]);

    const aiMsgId = Date.now().toString() + "-ai";
    let thinkingText = "";
    let fullText = "";

    try {
      const res = await api.ragStream(userMessage, attachments, sessionId, scopeFilter, trimHistoryToTurns);
      if (!res.body) throw new Error("No response body");

      args.updateSessionMessages(sessionId, (prev) => [
        ...prev,
        { id: aiMsgId, role: "ai", content: "" },
      ]);

      await consumeRagStream(res.body.getReader(), {
        onThinking: (text) => {
          thinkingText += text;
          args.updateSessionMessages(sessionId, (prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, thinking: thinkingText } : m)),
          );
        },
        onText: (text) => {
          fullText += text;
          const clean = cleanAssistantText(fullText);
          args.updateSessionMessages(sessionId, (prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, content: clean } : m)),
          );
        },
        onMetadata: (meta: MetadataPayload) => {
          const path = meta.source.includes(" > ")
            ? meta.source.split(" > ").slice(0, 2).join(" > ")
            : "Documents > Uploads";
          const title = meta.source.includes(" > ")
            ? (meta.source.split(" > ").pop() as string)
            : meta.source;
          args.setContextItems((prev) => {
            if (prev.some((item) => item.title === title)) return prev;
            const next = [
              ...prev,
              { title, type: meta.type, path, text: meta.content ?? meta.text, page: meta.page },
            ];
            args.updateSessionContextItems(sessionId, next);
            return next;
          });
        },
      });
    } catch (e) {
      console.error(e);
      const errorContent = thinkingText
        ? "The response took too long to arrive. This can happen with large or complex attachments — please try again."
        : "Error communicating with the knowledge base.";
      args.updateSessionMessages(sessionId, (prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, content: errorContent } : m)),
      );
    } finally {
      args.updateSessionMessages(sessionId, (prev) =>
        prev.map((m) =>
          m.id === aiMsgId && !m.content
            ? { ...m, content: "No response received. The server may have encountered an error — please try again." }
            : m,
        ),
      );
      setIsLoading(false);
      if (textFilesForKB.length > 0) args.setPendingKBFiles(textFilesForKB);
    }
  };

  return { input, setInput, isLoading, send };
}
