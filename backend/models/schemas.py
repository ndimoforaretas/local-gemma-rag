"""
Pydantic models for API request/response validation.

Centralises all data shapes in one place so routers stay slim and
the API contract is self-documenting via OpenAPI.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Requests ─────────────────────────────────────────────────────────────────

class Attachment(BaseModel):
    mime_type: str
    data: str
    name: Optional[str] = None


class RagRequest(BaseModel):
    """Body for the /rag streaming chat endpoint."""
    query: str = Field(..., min_length=1, max_length=5000)
    attachments: Optional[list[Attachment]] = None
    # Frontend session identifier for per-session conversation isolation.
    session_id: Optional[str] = None
    # When set, restricts search_knowledge_base to only these source filenames.
    document_filter: Optional[list[str]] = None
    # When set, rewinds the agent's conversation history to this many turn-pairs
    # before processing the new query.  Used by edit-and-resend / regenerate.
    trim_history_to_turns: Optional[int] = Field(None, ge=0)


# ── Responses ────────────────────────────────────────────────────────────────

class StatusResponse(BaseModel):
    """Generic success envelope used across multiple endpoints."""
    status: str


class IngestResponse(BaseModel):
    """Returned when a new ingestion workflow is started."""
    status: str
    workflow_id: Optional[str] = None


class UploadResponse(BaseModel):
    """Returned after files are uploaded to the docs/ directory."""
    status: str
    message: str
    files: list[str]


class HealthResponse(BaseModel):
    """Returned by the /health endpoint."""
    status: str
    ollama_connected: bool
    vector_db_loaded: bool
    indexed_chunks: int


class ErrorResponse(BaseModel):
    """Standard error envelope for non-200 responses."""
    error: str
    detail: Optional[str] = None


class SuggestionItem(BaseModel):
    """A single clickable starter question for the chat empty state."""
    label: str
    prompt: str


class SuggestionsResponse(BaseModel):
    """Returned by GET /rag/suggestions."""
    suggestions: list[SuggestionItem]


# ── Knowledge Base ───────────────────────────────────────────────────────────

class KBFile(BaseModel):
    """A single indexed file within a KB subfolder."""
    name: str
    type: str
    size: str = "N/A"
    modified: str = "N/A"


class KBSubfolder(BaseModel):
    """A logical grouping of files within a KB folder."""
    name: str
    files: list[KBFile] = []


class KBFolder(BaseModel):
    """A top-level knowledge base category."""
    name: str
    description: str
    icon: str
    updated: str
    subfolders: list[KBSubfolder] = []


class KBResponse(BaseModel):
    """Returned by the /kb endpoint."""
    folders: list[KBFolder] = []


# ── Workflow Status ──────────────────────────────────────────────────────────

class WorkflowStep(BaseModel):
    """A single step in a DBOS workflow execution."""
    name: str
    status: str
    output: list = []


class WorkflowStatusResponse(BaseModel):
    """Returned by the /ingest/status/{workflow_id} endpoint."""
    workflow_id: str
    status: str
    steps: list[WorkflowStep] = []


# ── Study Hub: Quiz ─────────────────────────────────────────────────────────

class QuizGenerateRequest(BaseModel):
    """Body for /api/study/quiz/generate."""
    difficulty: str = Field(..., pattern="^(beginner|intermediate|advanced)$")
    num_questions: int = Field(..., ge=1, le=20)
    question_types: list[str] = Field(..., min_length=1)
    document_filter: Optional[list[str]] = None


class QuizQuestionOut(BaseModel):
    """One quiz question shipped to the frontend."""
    type: str
    question: str
    options: list[str]
    correct_index: int
    explanation: str = ""


class QuizGenerateResponse(BaseModel):
    questions: list[QuizQuestionOut]
    source_chunks_used: int


class QuizSubmitRequest(BaseModel):
    """Body for /api/study/quiz/submit."""
    difficulty: str = Field(..., pattern="^(beginner|intermediate|advanced)$")
    num_questions: int = Field(..., ge=1, le=20)
    correct_count: int = Field(..., ge=0, le=20)
    scope_used: Optional[list[str]] = None


class QuizSubmitResponse(BaseModel):
    """Returned after recording an attempt — includes any badges just unlocked."""
    score_pct: int
    newly_earned_achievements: list[str] = []


# ── Study Hub: Workshops ────────────────────────────────────────────────────

class WorkshopCreateRequest(BaseModel):
    """Body for POST /api/study/workshop/outline."""
    difficulty: str = Field(..., pattern="^(beginner|intermediate|advanced)$")
    num_lessons: int = Field(..., ge=3, le=15)
    document_filter: list[str] = Field(..., min_length=1)


class WorkshopLessonOut(BaseModel):
    lesson_idx: int
    title: str
    est_minutes: int
    completed_at: Optional[float] = None
    has_content: bool = False  # whether content_md is cached


class WorkshopOut(BaseModel):
    id: int
    created_at: float
    difficulty: str
    scope: list[str]
    title: str
    summary: str
    key_points: list[str]
    objectives: list[str]
    completed_at: Optional[float] = None
    lessons: list[WorkshopLessonOut]


class WorkshopListItem(BaseModel):
    id: int
    created_at: float
    difficulty: str
    title: str
    summary: str
    total_lessons: int
    completed_lessons: int
    completed_at: Optional[float] = None


class WorkshopListResponse(BaseModel):
    workshops: list[WorkshopListItem]


class LessonContentResponse(BaseModel):
    lesson_idx: int
    title: str
    content_md: str
    completed_at: Optional[float] = None


class LessonCompleteResponse(BaseModel):
    lessons_total: int
    lessons_done: int
    workshop_completed: bool
    newly_earned_achievements: list[str] = []


# ── Study Hub: Flashcards ───────────────────────────────────────────────────

class FlashcardCreateRequest(BaseModel):
    """Body for POST /api/study/flashcards/deck."""
    difficulty: str = Field(..., pattern="^(beginner|intermediate|advanced)$")
    num_cards: int = Field(..., ge=5, le=60)
    document_filter: list[str] = Field(..., min_length=1)


class FlashcardOut(BaseModel):
    card_idx: int
    front: str
    back: str
    status: Optional[str] = None  # 'mastered' | 'review' | None
    flip_count: int = 0


class FlashcardDeckOut(BaseModel):
    id: int
    created_at: float
    difficulty: str
    scope: list[str]
    title: str
    card_count: int
    cards: list[FlashcardOut]


class FlashcardDeckListItem(BaseModel):
    id: int
    created_at: float
    difficulty: str
    title: str
    card_count: int
    mastered_count: int


class FlashcardDeckListResponse(BaseModel):
    decks: list[FlashcardDeckListItem]


class FlashcardStatusRequest(BaseModel):
    status: Optional[str] = Field(None, pattern="^(mastered|review)$")
    # If true, also increment flip_count (used when the user flips the card).
    record_flip: bool = False


class FlashcardStatusResponse(BaseModel):
    newly_earned_achievements: list[str] = []


# ── Study Hub: Mindmaps ─────────────────────────────────────────────────────

class MindmapCreateRequest(BaseModel):
    document_filter: list[str] = Field(..., min_length=1)
    # Depth is locked at 2 for MVP but kept in the request for forward-compat.
    depth: int = Field(2, ge=2, le=3)


class MindmapNode(BaseModel):
    label: str
    children: list["MindmapNode"] = []


class MindmapOut(BaseModel):
    id: int
    created_at: float
    scope: list[str]
    depth: int
    title: str
    tree: MindmapNode
    export_count: int


class MindmapListItem(BaseModel):
    id: int
    created_at: float
    depth: int
    title: str
    export_count: int


class MindmapListResponse(BaseModel):
    mindmaps: list[MindmapListItem]


class MindmapExportResponse(BaseModel):
    export_count: int
    newly_earned_achievements: list[str] = []
