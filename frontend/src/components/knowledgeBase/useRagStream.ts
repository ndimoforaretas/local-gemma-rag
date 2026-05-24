/**
 * useRagStream — owns the entire "send a chat message and consume the
 * NDJSON streaming response" flow. Extracted from KnowledgeBase.tsx so the
 * page component can stay focused on layout and high-level state.
 *
 * Responsibilities:
 *  - Resolve the active session (create one on first send).
 *  - Persist user + AI messages into the React-Query history cache.
 *  - Stream-parse the NDJSON / SSE / plain-text response from /rag.
 *  - Surface live citation metadata into the caller's `setContextItems`.
 *  - Time out gracefully and replace the empty bubble with a useful error.
 */

import { useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { generateThumbnail } from "../../lib/imageThumbnail";
import { computeScopeLabel } from "./scopeLabel";
import {
  FIRST_CHUNK_TIMEOUT_MS,
  MAX_TIMEOUT_RETRIES,
  STREAM_IDLE_TIMEOUT_MS,
  cleanAssistantText,
  normalizeSseText,
  parseNdjsonLine,
  readChunkWithTimeout,
  type MetadataPayload,
  type StreamMode,
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

export interface SendOptions {
  attachments?: Attachment[];
  directQuery?: string;
  trimHistoryToTurns?: number;
  /**
   * Optional one-shot scope (e.g. from a starter-suggestion click). When set,
   * it is used **instead of** the user's current `documentFilter` and the
   * filter pill is left untouched.
   */
  scopeOverride?: string[];
}

export function useRagStream(args: UseRagStreamArgs) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const buildAttachmentPreviews = async (
    attachments: Attachment[],
  ): Promise<{
    previews: MessageAttachment[];
    textFilesForKB: SaveToKBFile[];
  }> => {
    const previews: MessageAttachment[] = [];
    const textFilesForKB: SaveToKBFile[] = [];
    for (const att of attachments) {
      if (att.mime_type.startsWith("image/")) {
        const thumb = await generateThumbnail(att.data, att.mime_type);
        previews.push({
          mime_type: att.mime_type,
          thumbnail: thumb,
          name: att.name,
        });
      } else {
        previews.push({
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
    return { previews, textFilesForKB };
  };

  const ensureSession = (userMessage: string): string => {
    if (args.activeSessionId) return args.activeSessionId;
    const id = Date.now().toString();
    const newSession: ChatSession = {
      id,
      title:
        userMessage.length > 25
          ? userMessage.substring(0, 25) + "..."
          : userMessage,
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

  const resolveActiveScope = (
    scopeOverride: string[] | undefined,
  ): { filter: string[] | undefined; label: string | undefined } => {
    let filter: string[] | undefined;
    if (scopeOverride && scopeOverride.length > 0) {
      filter = [...scopeOverride];
    } else if (args.documentFilter.length > 0) {
      filter = [...args.documentFilter];
      args.setDocumentFilter([]);
    }
    const label = filter
      ? computeScopeLabel(filter, args.indexedDocs)
      : undefined;
    return { filter, label };
  };

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
    // Every new send starts with a clean citation slate — old citations
    // from the same session must not bleed into the new response's sidebar.
    args.setContextItems([]);

    const { previews, textFilesForKB } =
      await buildAttachmentPreviews(attachments);
    const currentSessionId = ensureSession(userMessage);
    // Persist the cleared citations now that we have a confirmed session id.
    args.updateSessionContextItems(currentSessionId, []);

    const { filter: activeScopeFilter, label: activeScopeLabel } =
      resolveActiveScope(scopeOverride);

    const newMsgId = Date.now().toString();
    args.updateSessionMessages(currentSessionId, (prev) => [
      ...prev,
      {
        id: newMsgId,
        role: "user",
        content: userMessage,
        attachments: previews.length > 0 ? previews : undefined,
        scopeFilter: activeScopeFilter,
        scopeLabel: activeScopeLabel,
      },
    ]);

    // Hoist so the catch block can reference them for targeted error updates.
    const aiMsgId = Date.now().toString() + "-ai";
    let thinkingText = "";

    try {
      const res = await api.ragStream(
        userMessage,
        attachments,
        currentSessionId,
        activeScopeFilter,
        trimHistoryToTurns,
      );
      if (!res.body) throw new Error("No response body");

      args.updateSessionMessages(currentSessionId, (prev) => [
        ...prev,
        { id: aiMsgId, role: "ai", content: "" },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let streamMode: StreamMode = "unknown";
      let hasReceivedChunk = false;
      let timeoutRetries = 0;

      const appendThinking = (text: string) => {
        if (!text) return;
        thinkingText += text;
        args.updateSessionMessages(currentSessionId, (prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, thinking: thinkingText } : m,
          ),
        );
      };

      const appendText = (text: string) => {
        if (!text) return;
        fullText += text;
        const cleanText = cleanAssistantText(fullText);
        args.updateSessionMessages(currentSessionId, (prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: cleanText } : m,
          ),
        );
      };

      const handleMetadataEvent = (meta: MetadataPayload) => {
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
            {
              title,
              type: meta.type,
              path,
              text: meta.content ?? meta.text ?? undefined,
              page: meta.page ?? undefined,
            },
          ];
          args.updateSessionContextItems(currentSessionId, next);
          return next;
        });
      };

      const processNdjsonLine = (line: string): boolean => {
        const event = parseNdjsonLine(line);
        if (!event) return false;
        if (event.type === "thinking" && event.data) {
          appendThinking(String(event.data));
        } else if (event.type === "text" && event.data) {
          appendText(String(event.data));
        } else if (event.type === "metadata" && event.data) {
          handleMetadataEvent(event.data as MetadataPayload);
        } else if (event.type === "error") {
          console.error("RAG error:", event.data);
        }
        return true;
      };

      while (true) {
        let done = false;
        let value: Uint8Array | undefined;

        try {
          const result = await readChunkWithTimeout(
            reader,
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
              if (!processNdjsonLine(tail)) appendText(normalizeSseText(tail));
            } else {
              appendText(normalizeSseText(buffer));
            }
          }
          break;
        }

        hasReceivedChunk = true;
        const chunk = decoder.decode(value, { stream: true });

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

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (processNdjsonLine(trimmed)) {
            streamMode = "ndjson";
            continue;
          }

          if (streamMode === "unknown" || streamMode === "plain") {
            streamMode = "plain";
            appendText(normalizeSseText(trimmed + "\n"));
          } else {
            console.error("Failed to parse NDJSON line:", line);
          }
        }
      }
    } catch (e) {
      console.error(e);
      const errorContent = thinkingText
        ? "The response took too long to arrive. This can happen with large or complex attachments — please try again."
        : "Error communicating with the knowledge base.";
      args.updateSessionMessages(currentSessionId, (prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, content: errorContent } : m,
        ),
      );
    } finally {
      // Guard: if the stream ended with no text and no error, show a fallback.
      args.updateSessionMessages(currentSessionId, (prev) =>
        prev.map((m) =>
          m.id === aiMsgId && !m.content
            ? {
                ...m,
                content:
                  "No response received. The server may have encountered an error — please try again.",
              }
            : m,
        ),
      );
      setIsLoading(false);
      if (textFilesForKB.length > 0) {
        args.setPendingKBFiles(textFilesForKB);
      }
    }
  };

  return {
    input,
    setInput,
    isLoading,
    send,
  };
}
