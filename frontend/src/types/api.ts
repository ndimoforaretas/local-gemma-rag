/**
 * Shared TypeScript interfaces for the Gemma CogniVault API.
 *
 * These mirror the backend Pydantic models defined in
 * `backend/models/schemas.py` so the frontend is always in sync.
 */

// ── Requests ────────────────────────────────────────────────────────

export interface Attachment {
  mime_type: string;
  data: string; // base64 encoded string
  name?: string;
}

export interface RagRequest {
  query: string;
  attachments?: Attachment[];
}

// ── Generic ─────────────────────────────────────────────────────────

export interface StatusResponse {
  status: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
}

// ── RAG / Chat ──────────────────────────────────────────────────────

export interface Suggestion {
  label: string;
  prompt: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

export interface MessageAttachment {
  mime_type: string;
  thumbnail?: string; // small base64 data URI for images
  name?: string; // original file name
}

export interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  attachments?: MessageAttachment[];
}

export interface ContextItem {
  title: string;
  type: string;
  path: string;
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

// ── Knowledge Base ──────────────────────────────────────────────────

export interface KBFile {
  name: string;
  type: string;
  size: string;
  modified: string;
}

export interface KBSubfolder {
  name: string;
  files: KBFile[];
}

export interface KBFolder {
  name: string;
  description: string;
  icon: string;
  updated: string;
  subfolders: KBSubfolder[];
}

export interface KBResponse {
  folders: KBFolder[];
}

// ── Ingestion ───────────────────────────────────────────────────────

export interface IngestResponse extends StatusResponse {
  workflow_id?: string;
}

export interface UploadResponse extends StatusResponse {
  message: string;
  files: string[];
}

export interface WorkflowStep {
  name: string;
  status: string;
  output: Record<string, unknown>[];
}

export interface WorkflowStatusResponse {
  workflow_id: string;
  status: string;
  steps: WorkflowStep[];
}

// ── Save to KB ──────────────────────────────────────────────────────

export interface SaveToKBFile {
  name: string;
  mime_type: string;
  data: string; // base64
}

export interface SaveToKBResponse extends StatusResponse {
  workflow_id?: string;
  saved_files: string[];
}

// ── System ──────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  ollama_connected: boolean;
  vector_db_loaded: boolean;
  indexed_chunks: number;
}
