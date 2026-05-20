"""
Tests for Step 2 — Document Intelligence Tools.

Validates the three new agent tools:
  - list_documents: discovery, empty vault, chunk counts.
  - analyze_document: error for unknown file, calls Gemma for known file.
  - compare_documents: errors for unknown files, calls Gemma for known files.

All Ollama calls are mocked so tests run without infrastructure.
"""

from unittest.mock import MagicMock, patch

import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

def _mock_metadata(chunks: list[dict]) -> list[dict]:
    """Return a list of metadata dicts formatted as the VectorDB stores them."""
    return chunks


def _make_chunk(source: str, content: str, chunk_id: int = 0, doc_type: str = "pdf") -> dict:
    return {
        "source": source,
        "content": content,
        "chunk_id": chunk_id,
        "page": 1,
        "type": doc_type,
    }


def _ollama_response(text: str) -> dict:
    return {"message": {"content": text}}


# ── list_documents tests ──────────────────────────────────────────────────────

class TestListDocuments:
    """Tests for list_documents()."""

    def test_returns_non_empty_string_when_kb_has_documents(self):
        """list_documents returns a formatted list when chunks exist."""
        metadata = [
            _make_chunk("report.pdf", "Annual revenue was $1M."),
            _make_chunk("report.pdf", "Expenses totalled $500k.", chunk_id=1),
            _make_chunk("notes.txt", "Meeting notes.", doc_type="txt"),
        ]
        with patch("backend.tools.agent_tools.vector_db") as mock_db:
            mock_db.metadata = metadata
            from backend.tools.agent_tools import list_documents

            result = list_documents()

        assert "report.pdf" in result
        assert "notes.txt" in result
        # report.pdf has 2 chunks
        assert "2 chunk" in result

    def test_returns_graceful_message_when_vault_is_empty(self):
        """list_documents returns a helpful message when no docs are indexed."""
        with patch("backend.tools.agent_tools.vector_db") as mock_db:
            mock_db.metadata = []
            from backend.tools.agent_tools import list_documents

            result = list_documents()

        assert "empty" in result.lower() or "no documents" in result.lower()

    def test_excludes_deleted_chunks(self):
        """Soft-deleted chunks are not counted or listed."""
        metadata = [
            _make_chunk("active.pdf", "Active content."),
            {**_make_chunk("deleted.pdf", "Old content."), "deleted": True},
        ]
        with patch("backend.tools.agent_tools.vector_db") as mock_db:
            mock_db.metadata = metadata
            from backend.tools.agent_tools import list_documents

            result = list_documents()

        assert "active.pdf" in result
        assert "deleted.pdf" not in result

    def test_shows_document_count(self):
        """The result states how many documents are in the vault."""
        metadata = [
            _make_chunk("a.pdf", "Content A."),
            _make_chunk("b.pdf", "Content B."),
            _make_chunk("c.md", "Content C.", doc_type="md"),
        ]
        with patch("backend.tools.agent_tools.vector_db") as mock_db:
            mock_db.metadata = metadata
            from backend.tools.agent_tools import list_documents

            result = list_documents()

        assert "3" in result  # 3 distinct documents


# ── analyze_document tests ────────────────────────────────────────────────────

class TestAnalyzeDocument:
    """Tests for analyze_document()."""

    def test_returns_error_for_unknown_filename(self):
        """analyze_document returns an error message for a non-existent file."""
        with patch("backend.tools.agent_tools.vector_db") as mock_db:
            mock_db.metadata = []
            from backend.tools.agent_tools import analyze_document

            result = analyze_document(filename="nonexistent.pdf")

        assert "not found" in result.lower()
        assert "nonexistent.pdf" in result

    def test_calls_ollama_and_returns_analysis_for_known_file(self):
        """analyze_document calls Gemma and returns its structured analysis."""
        metadata = [
            _make_chunk("report.pdf", "Annual revenue was $1M."),
            _make_chunk("report.pdf", "Expenses totalled $500k.", chunk_id=1),
        ]
        fake_analysis = "1. Key Topics: Finance\n2. Entities: None\n3. Summary: Good report."

        with (
            patch("backend.tools.agent_tools.vector_db") as mock_db,
            patch("backend.tools.agent_tools.ollama") as mock_ollama,
        ):
            mock_db.metadata = metadata
            mock_ollama.chat.return_value = _ollama_response(fake_analysis)
            from backend.tools.agent_tools import analyze_document

            result = analyze_document(filename="report.pdf")

        assert result == fake_analysis
        mock_ollama.chat.assert_called_once()
        call_args = mock_ollama.chat.call_args
        # Filename should appear in the prompt
        prompt = call_args[1]["messages"][0]["content"]
        assert "report.pdf" in prompt

    def test_handles_ollama_error_gracefully(self):
        """An Ollama error returns a user-friendly error string."""
        metadata = [_make_chunk("report.pdf", "Some content.")]
        with (
            patch("backend.tools.agent_tools.vector_db") as mock_db,
            patch("backend.tools.agent_tools.ollama") as mock_ollama,
        ):
            mock_db.metadata = metadata
            mock_ollama.chat.side_effect = ConnectionError("Ollama down")
            from backend.tools.agent_tools import analyze_document

            result = analyze_document(filename="report.pdf")

        assert "error" in result.lower()


# ── compare_documents tests ───────────────────────────────────────────────────

class TestCompareDocuments:
    """Tests for compare_documents()."""

    def test_returns_error_when_doc_a_is_unknown(self):
        """compare_documents reports an error if doc_a is not in the KB."""
        metadata = [_make_chunk("b.pdf", "Document B content.")]
        with patch("backend.tools.agent_tools.vector_db") as mock_db:
            mock_db.metadata = metadata
            from backend.tools.agent_tools import compare_documents

            result = compare_documents(
                doc_a="missing.pdf",
                doc_b="b.pdf",
                question="Which is better?",
            )

        assert "not found" in result.lower()
        assert "missing.pdf" in result

    def test_returns_error_when_doc_b_is_unknown(self):
        """compare_documents reports an error if doc_b is not in the KB."""
        metadata = [_make_chunk("a.pdf", "Document A content.")]
        with patch("backend.tools.agent_tools.vector_db") as mock_db:
            mock_db.metadata = metadata
            from backend.tools.agent_tools import compare_documents

            result = compare_documents(
                doc_a="a.pdf",
                doc_b="missing.pdf",
                question="Which is better?",
            )

        assert "not found" in result.lower()
        assert "missing.pdf" in result

    def test_calls_ollama_with_both_document_contents(self):
        """compare_documents calls Gemma with content from both documents."""
        metadata = [
            _make_chunk("a.pdf", "Document A unique content here."),
            _make_chunk("b.pdf", "Document B unique content here."),
        ]
        fake_comparison = "Document A is more comprehensive."

        with (
            patch("backend.tools.agent_tools.vector_db") as mock_db,
            patch("backend.tools.agent_tools.ollama") as mock_ollama,
        ):
            mock_db.metadata = metadata
            mock_ollama.chat.return_value = _ollama_response(fake_comparison)
            from backend.tools.agent_tools import compare_documents

            result = compare_documents(
                doc_a="a.pdf",
                doc_b="b.pdf",
                question="Which document is more comprehensive?",
            )

        assert result == fake_comparison
        mock_ollama.chat.assert_called_once()
        prompt = mock_ollama.chat.call_args[1]["messages"][0]["content"]
        assert "a.pdf" in prompt
        assert "b.pdf" in prompt
        assert "Document A unique content here." in prompt
        assert "Document B unique content here." in prompt

    def test_question_appears_in_prompt(self):
        """The comparison question is passed verbatim in the Ollama prompt."""
        metadata = [
            _make_chunk("x.pdf", "X content."),
            _make_chunk("y.pdf", "Y content."),
        ]
        question = "Which document covers risk management more thoroughly?"

        with (
            patch("backend.tools.agent_tools.vector_db") as mock_db,
            patch("backend.tools.agent_tools.ollama") as mock_ollama,
        ):
            mock_db.metadata = metadata
            mock_ollama.chat.return_value = _ollama_response("X covers it better.")
            from backend.tools.agent_tools import compare_documents

            compare_documents(doc_a="x.pdf", doc_b="y.pdf", question=question)

        prompt = mock_ollama.chat.call_args[1]["messages"][0]["content"]
        assert question in prompt
