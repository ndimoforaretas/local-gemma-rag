"""
Study Hub API — quiz generation and submission.

Endpoints
---------
- POST /api/study/quiz/generate — produce a quiz from scoped KB content
- POST /api/study/quiz/submit   — record a finished attempt + unlock badges
"""

from __future__ import annotations

import logging
from typing import cast

from fastapi import APIRouter, HTTPException

from backend.models.schemas import (
    LessonCompleteResponse,
    LessonContentResponse,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizQuestionOut,
    QuizSubmitRequest,
    QuizSubmitResponse,
    WorkshopCreateRequest,
    WorkshopLessonOut,
    WorkshopListItem,
    WorkshopListResponse,
    WorkshopOut,
)
from backend.services import achievements as ach_service
from backend.services import progress_tracker, quiz_generator, workshop_generator

logger = logging.getLogger("cognivault.study")

router = APIRouter(prefix="/api/study", tags=["Study"])


# Only these question-type strings are accepted; anything else 422s.
_ALLOWED_QUESTION_TYPES = {"mcq", "true_false"}
# Allowed quiz lengths per UI spec. Anything else 422s.
_ALLOWED_QUESTION_COUNTS = {5, 10, 20}


@router.post("/quiz/generate", response_model=QuizGenerateResponse)
def generate_quiz(req: QuizGenerateRequest) -> QuizGenerateResponse:
    """
    Generate a quiz from the user's scoped knowledge base.

    Validates the discrete config values (question count, types) up-front so
    bad input gets a clear 422 instead of a vague 500 from the generator.
    """
    if req.num_questions not in _ALLOWED_QUESTION_COUNTS:
        raise HTTPException(
            status_code=422,
            detail=f"num_questions must be one of {sorted(_ALLOWED_QUESTION_COUNTS)}",
        )

    invalid_types = [t for t in req.question_types if t not in _ALLOWED_QUESTION_TYPES]
    if invalid_types:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported question types: {invalid_types}. "
                   f"Allowed: {sorted(_ALLOWED_QUESTION_TYPES)}",
        )

    try:
        result = quiz_generator.generate_quiz(
            difficulty=cast(quiz_generator.Difficulty, req.difficulty),
            num_questions=req.num_questions,
            question_types=cast(list[quiz_generator.QuestionType], req.question_types),
            source_filter=req.document_filter,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        logger.exception("Quiz generation failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate quiz. The model may be unavailable.",
        )

    if not result.questions:
        raise HTTPException(
            status_code=502,
            detail="The model did not return a usable quiz. Try again or change scope.",
        )

    return QuizGenerateResponse(
        questions=[
            QuizQuestionOut(
                type=q.type,
                question=q.question,
                options=q.options,
                correct_index=q.correct_index,
                explanation=q.explanation,
            )
            for q in result.questions
        ],
        source_chunks_used=result.source_chunks_used,
    )


@router.post("/quiz/submit", response_model=QuizSubmitResponse)
def submit_quiz(req: QuizSubmitRequest) -> QuizSubmitResponse:
    """Record a finished quiz attempt and return any newly-unlocked badges."""
    if req.correct_count > req.num_questions:
        raise HTTPException(
            status_code=422,
            detail="correct_count cannot exceed num_questions.",
        )

    score_pct = (
        round(100 * req.correct_count / req.num_questions)
        if req.num_questions
        else 0
    )

    try:
        progress_tracker.record_quiz_attempt(
            difficulty=req.difficulty,
            num_questions=req.num_questions,
            correct_count=req.correct_count,
            score_pct=score_pct,
        )
        newly_earned = ach_service.evaluate_and_persist()
    except Exception:
        logger.exception("Quiz submit failed (non-fatal)")
        newly_earned = []

    return QuizSubmitResponse(
        score_pct=score_pct,
        newly_earned_achievements=newly_earned,
    )


# ── Workshops ────────────────────────────────────────────────────────────────


_ALLOWED_LESSON_COUNTS = {5, 10}


@router.post("/workshop/outline", response_model=WorkshopOut)
def create_workshop_outline(req: WorkshopCreateRequest) -> WorkshopOut:
    """Pass 1: generate the workshop outline and persist it. Returns full record."""
    if req.num_lessons not in _ALLOWED_LESSON_COUNTS:
        raise HTTPException(
            status_code=422,
            detail=f"num_lessons must be one of {sorted(_ALLOWED_LESSON_COUNTS)}",
        )
    try:
        outline = workshop_generator.generate_outline(
            difficulty=req.difficulty,  # type: ignore[arg-type]
            num_lessons=req.num_lessons,
            source_filter=req.document_filter,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        logger.exception("Workshop outline generation failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate workshop outline. The model may be unavailable.",
        )

    ws_id = progress_tracker.create_workshop(
        difficulty=req.difficulty,
        scope=req.document_filter,
        title=outline.title,
        summary=outline.summary,
        key_points=outline.key_points,
        objectives=outline.objectives,
        lessons=outline.lessons,
    )
    # Fire achievement evaluation now (covers "Workshop Outline" badge).
    try:
        ach_service.evaluate_and_persist()
    except Exception:
        logger.exception("Achievement eval after workshop create failed (non-fatal)")

    return _workshop_to_response(progress_tracker.get_workshop(ws_id))


@router.get("/workshops", response_model=WorkshopListResponse)
def list_workshops() -> WorkshopListResponse:
    items = progress_tracker.list_workshops()
    return WorkshopListResponse(
        workshops=[WorkshopListItem(**i) for i in items],
    )


@router.get("/workshop/{workshop_id}", response_model=WorkshopOut)
def get_workshop(workshop_id: int) -> WorkshopOut:
    ws = progress_tracker.get_workshop(workshop_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workshop not found.")
    return _workshop_to_response(ws)


@router.post("/workshop/{workshop_id}/lesson/{lesson_idx}", response_model=LessonContentResponse)
def get_or_generate_lesson(workshop_id: int, lesson_idx: int) -> LessonContentResponse:
    """Return cached lesson content, or generate it on demand and cache."""
    ws = progress_tracker.get_workshop(workshop_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workshop not found.")
    if lesson_idx < 0 or lesson_idx >= len(ws["lessons"]):
        raise HTTPException(status_code=404, detail="Lesson index out of range.")

    lesson = ws["lessons"][lesson_idx]
    if lesson["content_md"]:
        return LessonContentResponse(
            lesson_idx=lesson_idx,
            title=lesson["title"],
            content_md=lesson["content_md"],
            completed_at=lesson["completed_at"],
        )

    try:
        content_md = workshop_generator.generate_lesson(
            workshop_title=ws["title"],
            workshop_summary=ws["summary"],
            key_points=ws["key_points"],
            objectives=ws["objectives"],
            all_lesson_titles=[l["title"] for l in ws["lessons"]],
            lesson_idx=lesson_idx,
            difficulty=ws["difficulty"],
            source_filter=ws["scope"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        logger.exception("Lesson generation failed")
        raise HTTPException(status_code=500, detail="Failed to generate this lesson.")

    progress_tracker.save_lesson_content(workshop_id, lesson_idx, content_md)
    return LessonContentResponse(
        lesson_idx=lesson_idx,
        title=lesson["title"],
        content_md=content_md,
        completed_at=None,
    )


@router.post("/workshop/{workshop_id}/lesson/{lesson_idx}/complete", response_model=LessonCompleteResponse)
def complete_lesson(workshop_id: int, lesson_idx: int) -> LessonCompleteResponse:
    ws = progress_tracker.get_workshop(workshop_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workshop not found.")
    if lesson_idx < 0 or lesson_idx >= len(ws["lessons"]):
        raise HTTPException(status_code=404, detail="Lesson index out of range.")

    summary = progress_tracker.mark_lesson_complete(workshop_id, lesson_idx)
    newly_earned: list[str] = []
    try:
        newly_earned = ach_service.evaluate_and_persist()
    except Exception:
        logger.exception("Achievement eval after lesson complete failed (non-fatal)")

    return LessonCompleteResponse(
        lessons_total=summary["lessons_total"],
        lessons_done=summary["lessons_done"],
        workshop_completed=summary["workshop_completed"],
        newly_earned_achievements=newly_earned,
    )


@router.delete("/workshop/{workshop_id}", response_model=dict)
def delete_workshop(workshop_id: int) -> dict:
    ok = progress_tracker.delete_workshop(workshop_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Workshop not found.")
    return {"status": "deleted"}


def _workshop_to_response(ws: dict | None) -> WorkshopOut:
    assert ws is not None
    return WorkshopOut(
        id=ws["id"],
        created_at=ws["created_at"],
        difficulty=ws["difficulty"],
        scope=ws["scope"],
        title=ws["title"],
        summary=ws["summary"],
        key_points=ws["key_points"],
        objectives=ws["objectives"],
        completed_at=ws["completed_at"],
        lessons=[
            WorkshopLessonOut(
                lesson_idx=l["lesson_idx"],
                title=l["title"],
                est_minutes=l["est_minutes"],
                completed_at=l["completed_at"],
                has_content=bool(l["content_md"]),
            )
            for l in ws["lessons"]
        ],
    )
