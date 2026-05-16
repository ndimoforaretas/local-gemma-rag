"""
Tests for the FastAPI application routes.

Uses FastAPI's TestClient (backed by httpx) so no real server
is started. External services (DBOS, Ollama) are mocked.
"""

import json
import os

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


@pytest.fixture()
def client():
    """Create a test client with DBOS mocked."""
    with patch("backend.services.ingest.dbos") as mock_dbos:
        mock_dbos.launch = MagicMock()
        from backend.main import app
        with TestClient(app) as c:
            yield c


class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "ollama_connected" in data
        assert "vector_db_loaded" in data
        assert "indexed_chunks" in data

    def test_health_reports_chunk_count(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert isinstance(data["indexed_chunks"], int)


class TestUploadEndpoint:
    """Tests for POST /upload."""

    def test_upload_rejects_non_pdf(self, client):
        resp = client.post(
            "/upload",
            files=[("files", ("test.txt", b"hello world", "text/plain"))],
        )
        assert resp.status_code == 400

    def test_upload_rejects_too_many_files(self, client):
        files = [
            ("files", (f"doc_{i}.pdf", b"%PDF-1.4 fake", "application/pdf"))
            for i in range(21)
        ]
        resp = client.post("/upload", files=files)
        assert resp.status_code == 400
        assert "Too many files" in resp.json()["detail"]

    def test_upload_accepts_valid_pdf(self, client, tmp_path, monkeypatch):
        monkeypatch.setattr("backend.routers.knowledge.settings.docs_dir", str(tmp_path))
        resp = client.post(
            "/upload",
            files=[("files", ("test.pdf", b"%PDF-1.4 fake content", "application/pdf"))],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert "test.pdf" in data["files"]
        assert (tmp_path / "test.pdf").exists()

    def test_upload_sanitizes_path_traversal(self, client, tmp_path, monkeypatch):
        monkeypatch.setattr("backend.routers.knowledge.settings.docs_dir", str(tmp_path))
        resp = client.post(
            "/upload",
            files=[("files", ("../../../etc/passwd.pdf", b"%PDF-1.4 evil", "application/pdf"))],
        )
        assert resp.status_code == 200
        data = resp.json()
        # The filename should be sanitized — no path traversal
        assert data["files"][0] == "passwd.pdf"
        assert (tmp_path / "passwd.pdf").exists()


class TestDeleteEndpoint:
    """Tests for DELETE /api/docs/{filename}."""

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete("/api/docs/nonexistent.pdf")
        assert resp.status_code == 404

    def test_delete_sanitizes_filename(self, client):
        resp = client.delete("/api/docs/..%2F..%2Fetc%2Fpasswd")
        # FastAPI decodes %2F into / which changes the path — route won't match (405)
        # or the sanitized name won't exist (404). Either is correct.
        assert resp.status_code in (404, 405)


class TestHistoryEndpoint:
    """Tests for GET/POST /api/history."""

    def test_get_history_returns_list(self, client):
        resp = client.get("/api/history")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_save_history(self, client):
        sessions = [{"id": "1", "title": "Test", "updatedAt": 123, "messages": []}]
        resp = client.post(
            "/api/history",
            json=sessions,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"


class TestKBEndpoint:
    """Tests for GET /kb."""

    def test_kb_returns_folders_key(self, client):
        resp = client.get("/kb")
        assert resp.status_code == 200
        data = resp.json()
        assert "folders" in data


class TestMiddleware:
    """Tests for request tracing middleware."""

    def test_request_id_header_present(self, client):
        resp = client.get("/health")
        assert "x-request-id" in resp.headers

    def test_custom_request_id_echoed(self, client):
        resp = client.get("/health", headers={"X-Request-ID": "test-123"})
        assert resp.headers["x-request-id"] == "test-123"


class TestRagEndpoint:
    """Tests for POST /rag."""

    def test_rag_rejects_empty_query(self, client):
        resp = client.post("/rag", json={"query": ""})
        assert resp.status_code == 422

    def test_rag_rejects_missing_query(self, client):
        resp = client.post("/rag", json={})
        assert resp.status_code == 422
