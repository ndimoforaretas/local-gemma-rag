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
  CategoriesResponse,
} from "../types/api";

const API_BASE = ""; // same-origin in dev and production

// ── Helpers ───────────────────────────────────────────────────────────

async function handleJsonResponse<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    let msg = `Request failed (${resp.status})`;
    try {
      const body = await resp.json();
      // detail is the specific message; error is the generic category
      // (set by our middleware). Prefer the specific one.
      msg = body.detail ?? body.error ?? msg;
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
    trimHistoryToTurns?: number,
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
    if (trimHistoryToTurns !== undefined) {
      payload.trim_history_to_turns = trimHistoryToTurns;
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
        // detail is the specific message; error is the generic category
      // (set by our middleware). Prefer the specific one.
      msg = body.detail ?? body.error ?? msg;
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

  // Upload documents, optionally assigning them to a category
  upload: async (formData: FormData, category?: string): Promise<UploadResponse> => {
    if (category) {
      formData.append("category", category);
    }
    const resp = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });
    return handleJsonResponse<UploadResponse>(resp);
  },

  // List all known category names
  getCategories: async (): Promise<CategoriesResponse> => {
    const resp = await fetch(`${API_BASE}/api/categories`);
    return handleJsonResponse<CategoriesResponse>(resp);
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

  // ── Study Hub ────────────────────────────────────────────────────────
  generateQuiz: async (req: {
    difficulty: "beginner" | "intermediate" | "advanced";
    num_questions: number;
    question_types: ("mcq" | "true_false")[];
    document_filter?: string[];
  }): Promise<{
    questions: {
      type: "mcq" | "true_false";
      question: string;
      options: string[];
      correct_index: number;
      explanation: string;
    }[];
    source_chunks_used: number;
  }> => {
    const resp = await fetch(`${API_BASE}/api/study/quiz/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    return handleJsonResponse(resp);
  },

  // ── Progress Dashboard ───────────────────────────────────────────────
  getProgressSummary: async () => {
    const resp = await fetch(`${API_BASE}/api/progress/summary`);
    return handleJsonResponse<import("../types/api").ProgressSummary>(resp);
  },

  getProgressDaily: async (days = 30) => {
    const resp = await fetch(`${API_BASE}/api/progress/daily?days=${days}`);
    return handleJsonResponse<import("../types/api").DailyActivityResponse>(resp);
  },

  getProgressBreakdown: async () => {
    const resp = await fetch(`${API_BASE}/api/progress/breakdown`);
    return handleJsonResponse<import("../types/api").ModeBreakdown>(resp);
  },

  getProgressAchievements: async () => {
    const resp = await fetch(`${API_BASE}/api/progress/achievements`);
    return handleJsonResponse<import("../types/api").AchievementsResponse>(resp);
  },

  // ── Workshops ────────────────────────────────────────────────────────
  listWorkshops: async () => {
    const resp = await fetch(`${API_BASE}/api/study/workshops`);
    return handleJsonResponse<import("../types/api").WorkshopListResponse>(resp);
  },

  getWorkshop: async (id: number) => {
    const resp = await fetch(`${API_BASE}/api/study/workshop/${id}`);
    return handleJsonResponse<import("../types/api").Workshop>(resp);
  },

  createWorkshopOutline: async (req: {
    difficulty: import("../types/api").WorkshopDifficulty;
    num_lessons: number;
    document_filter: string[];
  }) => {
    const resp = await fetch(`${API_BASE}/api/study/workshop/outline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    return handleJsonResponse<import("../types/api").Workshop>(resp);
  },

  getOrGenerateLesson: async (workshopId: number, lessonIdx: number) => {
    const resp = await fetch(
      `${API_BASE}/api/study/workshop/${workshopId}/lesson/${lessonIdx}`,
      { method: "POST" },
    );
    return handleJsonResponse<import("../types/api").LessonContent>(resp);
  },

  completeLesson: async (workshopId: number, lessonIdx: number) => {
    const resp = await fetch(
      `${API_BASE}/api/study/workshop/${workshopId}/lesson/${lessonIdx}/complete`,
      { method: "POST" },
    );
    return handleJsonResponse<import("../types/api").LessonCompleteResponse>(resp);
  },

  deleteWorkshop: async (id: number) => {
    const resp = await fetch(`${API_BASE}/api/study/workshop/${id}`, {
      method: "DELETE",
    });
    return handleJsonResponse<{ status: string }>(resp);
  },

  // ── Flashcards ───────────────────────────────────────────────────────
  listFlashcardDecks: async () => {
    const resp = await fetch(`${API_BASE}/api/study/flashcards/decks`);
    return handleJsonResponse<import("../types/api").FlashcardDeckListResponse>(resp);
  },

  getFlashcardDeck: async (id: number) => {
    const resp = await fetch(`${API_BASE}/api/study/flashcards/deck/${id}`);
    return handleJsonResponse<import("../types/api").FlashcardDeck>(resp);
  },

  createFlashcardDeck: async (req: {
    difficulty: import("../types/api").WorkshopDifficulty;
    num_cards: number;
    document_filter: string[];
  }) => {
    const resp = await fetch(`${API_BASE}/api/study/flashcards/deck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    return handleJsonResponse<import("../types/api").FlashcardDeck>(resp);
  },

  setFlashcardStatus: async (
    deckId: number,
    cardIdx: number,
    req: { status: import("../types/api").FlashcardStatus; record_flip: boolean },
  ) => {
    const resp = await fetch(
      `${API_BASE}/api/study/flashcards/deck/${deckId}/card/${cardIdx}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      },
    );
    return handleJsonResponse<import("../types/api").FlashcardStatusResponse>(resp);
  },

  deleteFlashcardDeck: async (id: number) => {
    const resp = await fetch(`${API_BASE}/api/study/flashcards/deck/${id}`, {
      method: "DELETE",
    });
    return handleJsonResponse<{ status: string }>(resp);
  },

  // ── Mindmaps ─────────────────────────────────────────────────────────
  listMindmaps: async () => {
    const resp = await fetch(`${API_BASE}/api/study/mindmaps`);
    return handleJsonResponse<import("../types/api").MindmapListResponse>(resp);
  },

  getMindmap: async (id: number) => {
    const resp = await fetch(`${API_BASE}/api/study/mindmaps/mindmap/${id}`);
    return handleJsonResponse<import("../types/api").Mindmap>(resp);
  },

  createMindmap: async (req: { document_filter: string[]; depth?: number }) => {
    const resp = await fetch(`${API_BASE}/api/study/mindmaps/mindmap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depth: 2, ...req }),
    });
    return handleJsonResponse<import("../types/api").Mindmap>(resp);
  },

  recordMindmapExport: async (id: number) => {
    const resp = await fetch(
      `${API_BASE}/api/study/mindmaps/mindmap/${id}/export`,
      { method: "POST" },
    );
    return handleJsonResponse<import("../types/api").MindmapExportResponse>(resp);
  },

  deleteMindmap: async (id: number) => {
    const resp = await fetch(`${API_BASE}/api/study/mindmaps/mindmap/${id}`, {
      method: "DELETE",
    });
    return handleJsonResponse<{ status: string }>(resp);
  },

  submitQuiz: async (req: {
    difficulty: "beginner" | "intermediate" | "advanced";
    num_questions: number;
    correct_count: number;
    scope_used?: string[];
  }): Promise<{
    score_pct: number;
    newly_earned_achievements: string[];
  }> => {
    const resp = await fetch(`${API_BASE}/api/study/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    return handleJsonResponse(resp);
  },
};

export default api;
