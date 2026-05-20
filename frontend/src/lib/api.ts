/**
 * Centralized API client for Gemma CogniVault.
 *
 * All non-streaming calls return JSON-parsed data matching the types
 * defined in `types/api.ts`. Errors are thrown as `Error` with the
 * server-provided message so callers can catch and display them.
 */

import type {
  KBResponse,
  IngestResponse,
  UploadResponse,
  StatusResponse,
  WorkflowStatusResponse,
  HealthResponse,
  ChatSession,
  Attachment,
  RagRequest,
  SaveToKBFile,
  SaveToKBResponse,
  SuggestionsResponse,
  IndexedDocument,
} from "../types/api";

const API_BASE = ""; // same-origin in dev and production

// ── Helpers ───────────────────────────────────────────────────────────

async function handleJsonResponse<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let msg = `Request failed (${resp.status})`;
    try {
      const body = await resp.json();
      msg = body.error ?? body.detail ?? msg;
    } catch {
      /* response may not be JSON */
    }
    throw new Error(msg);
  }
  return resp.json() as Promise<T>;
}

// ── Public API ──────────────────────────────────────────────────────

export const api = {
  // RAG streaming — returns the raw Response so the caller can read
  // the body as a stream.  NOT parsed as JSON.
  ragStream: async (
    query: string,
    attachments?: Attachment[],
    sessionId?: string,
    documentFilter?: string[],
  ): Promise<Response> => {
    const payload: RagRequest = { query };
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }
    if (sessionId) {
      payload.session_id = sessionId;
    }
    if (documentFilter && documentFilter.length > 0) {
      payload.document_filter = documentFilter;
    }
    const resp = await fetch(`${API_BASE}/rag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      let msg = "RAG request failed";
      try {
        const body = await resp.json();
        msg = body.error ?? body.detail ?? msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return resp;
  },

  // Knowledge base browsing
  getKB: async (): Promise<KBResponse> => {
    const resp = await fetch(`${API_BASE}/kb`);
    return handleJsonResponse<KBResponse>(resp);
  },

  // Upload PDF documents
  upload: async (formData: FormData): Promise<UploadResponse> => {
    const resp = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });
    return handleJsonResponse<UploadResponse>(resp);
  },

  // Delete a document from the knowledge base
  deleteDoc: async (filename: string): Promise<StatusResponse> => {
    const resp = await fetch(
      `${API_BASE}/api/docs/${encodeURIComponent(filename)}`,
      {
        method: "DELETE",
      },
    );
    return handleJsonResponse<StatusResponse>(resp);
  },

  // Start a durable ingestion workflow
  ingest: async (): Promise<IngestResponse> => {
    const resp = await fetch(`${API_BASE}/ingest`, { method: "POST" });
    return handleJsonResponse<IngestResponse>(resp);
  },

  // Fetch a URL, extract text, save to docs/, and trigger ingestion
  ingestUrl: async (url: string): Promise<{ status: string; filename: string; workflow_id: string; chars_extracted: number }> => {
    const resp = await fetch(`${API_BASE}/ingest/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return handleJsonResponse(resp);
  },

  // Poll ingestion workflow status
  ingestStatus: async (workflowId: string): Promise<WorkflowStatusResponse> => {
    const resp = await fetch(
      `${API_BASE}/ingest/status/${encodeURIComponent(workflowId)}`,
    );
    return handleJsonResponse<WorkflowStatusResponse>(resp);
  },

  // Chat history
  getHistory: async (): Promise<ChatSession[]> => {
    const resp = await fetch(`${API_BASE}/api/history`);
    return handleJsonResponse<ChatSession[]>(resp);
  },

  saveHistory: async (sessions: ChatSession[]): Promise<StatusResponse> => {
    const resp = await fetch(`${API_BASE}/api/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessions),
    });
    return handleJsonResponse<StatusResponse>(resp);
  },

  deleteHistorySession: async (sessionId: string): Promise<StatusResponse> => {
    const resp = await fetch(
      `${API_BASE}/api/history/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
      },
    );
    return handleJsonResponse<StatusResponse>(resp);
  },

  // Save chat attachments to KB
  saveToKB: async (files: SaveToKBFile[]): Promise<SaveToKBResponse> => {
    const resp = await fetch(`${API_BASE}/api/save-to-kb`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    return handleJsonResponse<SaveToKBResponse>(resp);
  },

  // Flat list of indexed documents (for the scope filter)
  listIndexedDocs: async (): Promise<{ documents: IndexedDocument[] }> => {
    const resp = await fetch(`${API_BASE}/api/docs/list`);
    return handleJsonResponse(resp);
  },

  // Privacy vault audit stats
  getVaultStats: async (): Promise<{
    total_documents: number;
    total_chunks: number;
    index_size_kb: number;
    last_ingested_at: string | null;
    ollama_host: string;
    external_calls: number;
    storage: { vector_index: string; metadata: string; documents: string };
  }> => {
    const resp = await fetch(`${API_BASE}/api/vault/stats`);
    return handleJsonResponse(resp);
  },

  // Audio transcription (local Whisper)
  transcriptionStatus: async (): Promise<{ available: boolean; model: string | null }> => {
    const resp = await fetch(`${API_BASE}/api/transcribe/status`);
    return handleJsonResponse(resp);
  },

  transcribeAudio: async (
    audioBlob: Blob,
    filename = "recording.webm",
  ): Promise<{ text: string; language: string; duration_seconds: number }> => {
    const form = new FormData();
    form.append("file", audioBlob, filename);
    const resp = await fetch(`${API_BASE}/api/transcribe`, {
      method: "POST",
      body: form,
    });
    return handleJsonResponse(resp);
  },

  // System health
  health: async (): Promise<HealthResponse> => {
    const resp = await fetch(`${API_BASE}/health`);
    return handleJsonResponse<HealthResponse>(resp);
  },

  // Chat suggestion cards
  getSuggestions: async (): Promise<SuggestionsResponse> => {
    const resp = await fetch(`${API_BASE}/rag/suggestions`);
    return handleJsonResponse<SuggestionsResponse>(resp);
  },
};

export default api;
