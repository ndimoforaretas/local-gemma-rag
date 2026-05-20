"""
Audio transcription router — POST /api/transcribe

Accepts an audio file (WebM, WAV, MP3, OGG, M4A) sent as multipart/form-data
and returns the transcribed text.  Uses faster-whisper running locally — no
data leaves the machine.

The Whisper model is lazy-loaded on the first request and kept in memory for
subsequent calls (typical cold-start: ~2 s for "tiny", ~8 s for "base").

Model size is configurable via the WHISPER_MODEL environment variable:
  tiny   — fastest, lowest accuracy (~75 MB)
  base   — good balance               (~145 MB)  [default]
  small  — better accuracy            (~465 MB)
  medium — high accuracy              (~1.5 GB)

If faster-whisper is not installed or the model fails to load, the endpoint
returns HTTP 503 with a clear message so the frontend can hide the mic button.
"""

import io
import logging
import os
import tempfile

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

logger = logging.getLogger("cognivault")
router = APIRouter(tags=["Audio"])

# ── Lazy model cache ──────────────────────────────────────────────────────────

_whisper_model = None
_whisper_available: bool | None = None   # None = not yet checked


def _get_whisper_model():
    """
    Return the cached Whisper model, loading it on first call.

    Raises RuntimeError if faster-whisper is unavailable or the model
    cannot be loaded (surfaced as HTTP 503 to the caller).
    """
    global _whisper_model, _whisper_available

    if _whisper_available is False:
        raise RuntimeError("faster-whisper is not available on this system.")

    if _whisper_model is not None:
        return _whisper_model

    try:
        from faster_whisper import WhisperModel

        model_size = os.environ.get("WHISPER_MODEL", "base")
        device = "cpu"          # Guaranteed to work on any machine
        compute_type = "int8"   # CPU-friendly quantisation

        logger.info("Loading Whisper '%s' model (first request)…", model_size)
        _whisper_model = WhisperModel(model_size, device=device, compute_type=compute_type)
        _whisper_available = True
        logger.info("Whisper model loaded successfully.")
        return _whisper_model

    except Exception as exc:
        _whisper_available = False
        logger.error("Failed to load Whisper model: %s", exc)
        raise RuntimeError(f"Whisper model could not be loaded: {exc}") from exc


# ── Response model ────────────────────────────────────────────────────────────

class TranscriptionResponse(BaseModel):
    text: str
    language: str
    duration_seconds: float


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/api/transcribe/status")
async def transcription_status():
    """
    Report whether the Whisper transcription feature is available.

    The frontend calls this on load to decide whether to show the mic button.
    Returns {"available": true/false, "model": "base"}.
    """
    try:
        _get_whisper_model()
        model_size = os.environ.get("WHISPER_MODEL", "base")
        return {"available": True, "model": model_size}
    except RuntimeError:
        return {"available": False, "model": None}


@router.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file (WebM, WAV, MP3, OGG, M4A)"),
):
    """
    Transcribe an audio recording to text using local Whisper.

    Accepts multipart/form-data with a single `file` field.
    Returns the transcription text and detected language.

    Raises
    ------
    503  If faster-whisper is not installed or the model failed to load.
    422  If the uploaded file is empty.
    500  If transcription fails for any other reason.
    """
    # ── Load model ────────────────────────────────────────────────────────────
    try:
        model = _get_whisper_model()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Transcription unavailable: {exc}",
        )

    # ── Read upload ───────────────────────────────────────────────────────────
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="Uploaded audio file is empty.")

    logger.info(
        "Transcribing audio: %s (%d bytes, type=%s)",
        file.filename or "recording",
        len(audio_bytes),
        file.content_type or "unknown",
    )

    # ── Transcribe ────────────────────────────────────────────────────────────
    try:
        # Write to a temp file because faster-whisper needs a file path
        suffix = _audio_suffix(file.content_type or "", file.filename or "")
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            segments, info = model.transcribe(
                tmp_path,
                beam_size=5,
                language=None,   # auto-detect
                vad_filter=True, # skip silences
            )
            text = " ".join(seg.text.strip() for seg in segments).strip()
        finally:
            os.unlink(tmp_path)

    except Exception as exc:
        logger.exception("Whisper transcription failed")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {exc}",
        )

    if not text:
        text = ""

    logger.info(
        "Transcription complete: %d chars, language=%s, duration=%.1fs",
        len(text),
        info.language,
        info.duration,
    )

    return TranscriptionResponse(
        text=text,
        language=info.language or "unknown",
        duration_seconds=round(info.duration, 2),
    )


def _audio_suffix(content_type: str, filename: str) -> str:
    """Infer the best file suffix so ffmpeg/whisper can identify the format."""
    ct = content_type.lower()
    if "webm" in ct or filename.endswith(".webm"):
        return ".webm"
    if "wav" in ct or filename.endswith(".wav"):
        return ".wav"
    if "ogg" in ct or filename.endswith(".ogg"):
        return ".ogg"
    if "mp4" in ct or "m4a" in ct or filename.endswith((".mp4", ".m4a")):
        return ".mp4"
    if "mpeg" in ct or "mp3" in ct or filename.endswith(".mp3"):
        return ".mp3"
    # Default: webm is what MediaRecorder produces in most browsers
    return ".webm"
