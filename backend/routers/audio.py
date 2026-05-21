"""
Audio transcription router — POST /api/transcribe

Accepts an audio file (WebM, WAV, MP3, OGG, M4A) sent as multipart/form-data
and returns the transcribed text.  Uses faster-whisper running locally — no
data leaves the machine.

The Whisper model is lazy-loaded on the first *transcription* request and kept
in memory for subsequent calls (typical cold-start: ~2 s for "tiny", ~8 s for
"base").  Loading and inference both run in a thread-pool executor so the
asyncio event loop is never blocked.

Model size is configurable via the WHISPER_MODEL environment variable:
  tiny   — fastest, lowest accuracy (~75 MB)
  base   — good balance               (~145 MB)  [default]
  small  — better accuracy            (~465 MB)
  medium — high accuracy              (~1.5 GB)

If faster-whisper is not installed or the model fails to load, the endpoint
returns HTTP 503 with a clear message so the frontend can hide the mic button.
"""

import asyncio
import importlib.util
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
_whisper_lock = asyncio.Lock()           # prevents concurrent cold-start races


def _load_whisper_model_sync():
    """
    Blocking model load — must be called inside run_in_executor.
    Returns the loaded WhisperModel or raises RuntimeError.
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


async def _get_whisper_model_async():
    """
    Return the cached Whisper model, loading it in a thread executor on first
    call so the event loop is never blocked.
    """
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model
    async with _whisper_lock:
        # Re-check after acquiring lock — another coroutine may have loaded it.
        if _whisper_model is not None:
            return _whisper_model
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _load_whisper_model_sync)


# ── Response model ────────────────────────────────────────────────────────────

class TranscriptionResponse(BaseModel):
    text: str
    language: str
    duration_seconds: float


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/api/transcribe/status")
async def transcription_status():
    """
    Report whether the Whisper transcription feature is available.

    The frontend calls this on load to decide whether to show the mic button.
    This endpoint NEVER triggers a model load — it only checks whether
    faster-whisper is installed and whether a previous load succeeded/failed.
    Returns {"available": true/false, "model": "base"}.
    """
    # If a previous attempt already determined availability, return fast.
    if _whisper_available is False:
        return {"available": False, "model": None}
    if _whisper_model is not None:
        model_size = os.environ.get("WHISPER_MODEL", "base")
        return {"available": True, "model": model_size}

    # No load attempted yet — just check if the package is importable.
    spec = importlib.util.find_spec("faster_whisper")
    if spec is None:
        return {"available": False, "model": None}

    model_size = os.environ.get("WHISPER_MODEL", "base")
    return {"available": True, "model": model_size}


@router.post("/api/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file (WebM, WAV, MP3, OGG, M4A)"),
):
    """
    Transcribe an audio recording to text using local Whisper.

    Accepts multipart/form-data with a single `file` field.
    Returns the transcription text and detected language.

    Both model loading (first call) and inference run in a thread executor
    so the asyncio event loop is never blocked.

    Raises
    ------
    503  If faster-whisper is not installed or the model failed to load.
    422  If the uploaded file is empty.
    500  If transcription fails for any other reason.
    """
    # ── Load model (non-blocking) ─────────────────────────────────────────────
    try:
        model = await _get_whisper_model_async()
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

    # ── Transcribe (non-blocking) ─────────────────────────────────────────────
    suffix = _audio_suffix(file.content_type or "", file.filename or "")

    def _run_transcription() -> tuple[str, object]:
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
            return text, info
        finally:
            os.unlink(tmp_path)

    try:
        loop = asyncio.get_running_loop()
        text, info = await loop.run_in_executor(None, _run_transcription)
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
