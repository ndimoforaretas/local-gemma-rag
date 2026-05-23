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
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizQuestionOut,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from backend.services import achievements as ach_service
from backend.services import progress_tracker, quiz_generator

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
