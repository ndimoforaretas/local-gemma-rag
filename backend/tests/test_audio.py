"""
Tests for P2 — Audio transcription via Whisper.

Validates:
- GET /api/transcribe/status returns {available, model} correctly.
- POST /api/transcribe returns the transcribed text from a valid audio file.
- POST /api/transcribe returns 422 for an empty upload.
- POST /api/transcribe returns 503 when faster-whisper is unavailable.
- _audio_suffix() correctly infers file extensions from MIME types.
"""

import io
from unittest.mock import MagicMock, patch

import pytest


# ── _audio_suffix unit tests ──────────────────────────────────────────────────

class TestAudioSuffix:
    def test_webm_content_type(self):
        from backend.routers.audio import _audio_suffix
        assert _audio_suffix("audio/webm", "recording") == ".webm"

    def test_wav_content_type(self):
        from backend.routers.audio import _audio_suffix
        assert _audio_suffix("audio/wav", "clip") == ".wav"

    def test_mp3_from_filename(self):
        from backend.routers.audio import _audio_suffix
        assert _audio_suffix("application/octet-stream", "track.mp3") == ".mp3"

    def test_ogg_content_type(self):
        from backend.routers.audio import _audio_suffix
        assert _audio_suffix("audio/ogg", "") == ".ogg"

    def test_unknown_defaults_to_webm(self):
        from backend.routers.audio import _audio_suffix
        assert _audio_suffix("", "") == ".webm"


# ── /api/transcribe/status ────────────────────────────────────────────────────

class TestTranscriptionStatus:
    def test_returns_available_when_model_loads(self, client):
        """When faster-whisper loads successfully, status is available=true."""
        mock_model = MagicMock()

        import backend.routers.audio as audio_mod
        # Reset the module-level cache so our mock is used
        original_model = audio_mod._whisper_model
        original_available = audio_mod._whisper_available
        audio_mod._whisper_model = mock_model
        audio_mod._whisper_available = True

        try:
            resp = client.get("/api/transcribe/status")
            assert resp.status_code == 200
            data = resp.json()
            assert data["available"] is True
        finally:
            audio_mod._whisper_model = original_model
            audio_mod._whisper_available = original_available

    def test_returns_unavailable_when_faster_whisper_missing(self, client):
        """When faster-whisper cannot be imported, status is available=false."""
        import backend.routers.audio as audio_mod
        original_model = audio_mod._whisper_model
        original_available = audio_mod._whisper_available
        audio_mod._whisper_model = None
        audio_mod._whisper_available = False

        try:
            resp = client.get("/api/transcribe/status")
            assert resp.status_code == 200
            data = resp.json()
            assert data["available"] is False
            assert data["model"] is None
        finally:
            audio_mod._whisper_model = original_model
            audio_mod._whisper_available = original_available


# ── POST /api/transcribe ──────────────────────────────────────────────────────

class TestTranscribeEndpoint:
    def _mock_whisper_model(self, text: str = "Hello world"):
        """Build a mock Whisper model that returns a fixed transcription."""
        mock_info = MagicMock()
        mock_info.language = "en"
        mock_info.duration = 3.5

        seg = MagicMock()
        seg.text = text

        mock_model = MagicMock()
        mock_model.transcribe.return_value = ([seg], mock_info)
        return mock_model

    def test_transcribes_audio_successfully(self, client):
        """A non-empty audio upload returns transcribed text."""
        import backend.routers.audio as audio_mod
        original_model = audio_mod._whisper_model
        original_available = audio_mod._whisper_available

        audio_mod._whisper_model = self._mock_whisper_model("Hello world")
        audio_mod._whisper_available = True

        try:
            # Patch os.unlink so we don't need a real temp file cycle
            with patch("backend.routers.audio.os.unlink"):
                resp = client.post(
                    "/api/transcribe",
                    files={"file": ("recording.webm", b"fake-audio-data", "audio/webm")},
                )
            assert resp.status_code == 200
            data = resp.json()
            assert data["text"] == "Hello world"
            assert data["language"] == "en"
            assert data["duration_seconds"] == 3.5
        finally:
            audio_mod._whisper_model = original_model
            audio_mod._whisper_available = original_available

    def test_returns_422_for_empty_audio(self, client):
        """An empty audio file is rejected with HTTP 422."""
        import backend.routers.audio as audio_mod
        original_model = audio_mod._whisper_model
        original_available = audio_mod._whisper_available

        audio_mod._whisper_model = self._mock_whisper_model()
        audio_mod._whisper_available = True

        try:
            resp = client.post(
                "/api/transcribe",
                files={"file": ("empty.webm", b"", "audio/webm")},
            )
            assert resp.status_code == 422
        finally:
            audio_mod._whisper_model = original_model
            audio_mod._whisper_available = original_available

    def test_returns_503_when_whisper_unavailable(self, client):
        """When faster-whisper is unavailable, the endpoint returns HTTP 503."""
        import backend.routers.audio as audio_mod
        original_model = audio_mod._whisper_model
        original_available = audio_mod._whisper_available

        audio_mod._whisper_model = None
        audio_mod._whisper_available = False

        try:
            resp = client.post(
                "/api/transcribe",
                files={"file": ("recording.webm", b"fake-audio", "audio/webm")},
            )
            assert resp.status_code == 503
            assert "unavailable" in resp.json()["detail"].lower()
        finally:
            audio_mod._whisper_model = original_model
            audio_mod._whisper_available = original_available

    def test_handles_whisper_runtime_error_gracefully(self, client):
        """If transcription raises at runtime, the endpoint returns 500."""
        mock_model = MagicMock()
        mock_model.transcribe.side_effect = RuntimeError("CUDA out of memory")

        import backend.routers.audio as audio_mod
        original_model = audio_mod._whisper_model
        original_available = audio_mod._whisper_available

        audio_mod._whisper_model = mock_model
        audio_mod._whisper_available = True

        try:
            with patch("backend.routers.audio.os.unlink"):
                resp = client.post(
                    "/api/transcribe",
                    files={"file": ("clip.webm", b"fake-audio", "audio/webm")},
                )
            assert resp.status_code == 500
        finally:
            audio_mod._whisper_model = original_model
            audio_mod._whisper_available = original_available
