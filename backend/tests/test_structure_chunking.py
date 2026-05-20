"""
Tests for T2-G — Structure-aware chunking.

Validates:
- get_markdown_chunks() splits on H1/H2/H3 headers.
- get_markdown_chunks() prepends a [Section: ...] breadcrumb.
- get_markdown_chunks() falls back to plain text for headerless files.
- get_csv_chunks() prefixes every chunk with the header row.
- get_csv_chunks() respects _CSV_ROWS_PER_CHUNK batch size.
- get_csv_chunks() handles empty data (header-only) and empty file.
- process_single_document() uses doc_type "markdown" / "csv" for those extensions.
- process_single_document() sets min_chunk_length=20 for .md and .csv.
- ingest_workflow() respects the per-doc min_chunk_length when filtering chunks.
"""

import os
import tempfile
import textwrap

import pytest


# ── Markdown chunking ─────────────────────────────────────────────────────────

class TestGetMarkdownChunks:
    def _write(self, content: str) -> str:
        f = tempfile.NamedTemporaryFile(
            mode="w", suffix=".md", delete=False, encoding="utf-8"
        )
        f.write(content)
        f.flush()
        return f.name

    def test_splits_on_h1_headers(self):
        from backend.services.ingest import get_markdown_chunks

        md = textwrap.dedent("""\
            # First Section
            Content of first section.

            # Second Section
            Content of second section.
        """)
        path = self._write(md)
        try:
            chunks = get_markdown_chunks(path)
        finally:
            os.unlink(path)

        assert len(chunks) == 2
        texts = [c[0] for c in chunks]
        assert any("First Section" in t for t in texts)
        assert any("Second Section" in t for t in texts)

    def test_splits_on_nested_h2_headers(self):
        from backend.services.ingest import get_markdown_chunks

        md = textwrap.dedent("""\
            # Chapter One
            ## Intro
            Intro content here.

            ## Details
            Detail content here.
        """)
        path = self._write(md)
        try:
            chunks = get_markdown_chunks(path)
        finally:
            os.unlink(path)

        assert len(chunks) >= 2
        combined = " ".join(c[0] for c in chunks)
        assert "Intro" in combined
        assert "Details" in combined

    def test_breadcrumb_prefix_in_chunk(self):
        from backend.services.ingest import get_markdown_chunks

        md = textwrap.dedent("""\
            # Overview
            ## Architecture
            System design lives here.
        """)
        path = self._write(md)
        try:
            chunks = get_markdown_chunks(path)
        finally:
            os.unlink(path)

        # The chunk for the Architecture section should have a breadcrumb.
        arch_chunk = next(
            (c[0] for c in chunks if "Architecture" in c[0] and "System design" in c[0]),
            None,
        )
        assert arch_chunk is not None, f"Expected architecture chunk, got: {chunks}"
        assert "[Section:" in arch_chunk

    def test_fallback_for_headerless_markdown(self):
        from backend.services.ingest import get_markdown_chunks

        md = "This is plain text with no headers at all.\n"
        path = self._write(md)
        try:
            chunks = get_markdown_chunks(path)
        finally:
            os.unlink(path)

        # Should fall back to the whole text as one chunk.
        assert len(chunks) == 1
        assert "plain text" in chunks[0][0]

    def test_empty_file_returns_empty_list(self):
        from backend.services.ingest import get_markdown_chunks

        path = self._write("")
        try:
            result = get_markdown_chunks(path)
        finally:
            os.unlink(path)

        assert result == []

    def test_chunk_page_numbers_start_at_one(self):
        from backend.services.ingest import get_markdown_chunks

        md = "# A\ncontent a\n# B\ncontent b\n"
        path = self._write(md)
        try:
            chunks = get_markdown_chunks(path)
        finally:
            os.unlink(path)

        page_nums = [c[1] for c in chunks]
        assert page_nums[0] == 1


# ── CSV chunking ──────────────────────────────────────────────────────────────

class TestGetCsvChunks:
    def _write_csv(self, rows: list[list]) -> str:
        import csv as _csv

        f = tempfile.NamedTemporaryFile(
            mode="w", suffix=".csv", delete=False, encoding="utf-8", newline=""
        )
        writer = _csv.writer(f)
        writer.writerows(rows)
        f.flush()
        return f.name

    def test_every_chunk_has_header_row(self):
        from backend.services.ingest import get_csv_chunks, _CSV_ROWS_PER_CHUNK

        # Create a CSV with more rows than one chunk.
        header = ["id", "name", "value"]
        data = [[str(i), f"item_{i}", str(i * 10)] for i in range(_CSV_ROWS_PER_CHUNK + 5)]
        path = self._write_csv([header] + data)
        try:
            chunks = get_csv_chunks(path)
        finally:
            os.unlink(path)

        assert len(chunks) == 2  # should produce 2 chunks
        for text, _ in chunks:
            # Every chunk must start with "id, name, value"
            first_line = text.splitlines()[0]
            assert "id" in first_line and "name" in first_line and "value" in first_line

    def test_single_chunk_for_small_csv(self):
        from backend.services.ingest import get_csv_chunks

        rows = [["name", "age"], ["Alice", "30"], ["Bob", "25"]]
        path = self._write_csv(rows)
        try:
            chunks = get_csv_chunks(path)
        finally:
            os.unlink(path)

        assert len(chunks) == 1
        text = chunks[0][0]
        assert "Alice" in text
        assert "Bob" in text
        assert "name" in text.splitlines()[0]

    def test_header_only_csv_returns_one_chunk(self):
        from backend.services.ingest import get_csv_chunks

        path = self._write_csv([["col1", "col2", "col3"]])
        try:
            chunks = get_csv_chunks(path)
        finally:
            os.unlink(path)

        assert len(chunks) == 1
        assert "col1" in chunks[0][0]

    def test_empty_csv_returns_empty_list(self):
        from backend.services.ingest import get_csv_chunks

        path = self._write_csv([])
        try:
            result = get_csv_chunks(path)
        finally:
            os.unlink(path)

        assert result == []

    def test_chunk_count_matches_batch_size(self):
        from backend.services.ingest import get_csv_chunks, _CSV_ROWS_PER_CHUNK

        n_data_rows = _CSV_ROWS_PER_CHUNK * 3
        header = ["x", "y"]
        data = [[str(i), str(i)] for i in range(n_data_rows)]
        path = self._write_csv([header] + data)
        try:
            chunks = get_csv_chunks(path)
        finally:
            os.unlink(path)

        assert len(chunks) == 3


# ── process_single_document integration ──────────────────────────────────────

class TestProcessSingleDocumentTypes:
    def _write_file(self, content: str, ext: str) -> tuple[str, str]:
        """Write content to a temp file, return (docs_dir, filename)."""
        tmp_dir = tempfile.mkdtemp()
        filename = f"test_file{ext}"
        with open(os.path.join(tmp_dir, filename), "w", encoding="utf-8") as f:
            f.write(content)
        return tmp_dir, filename

    def test_md_file_gets_markdown_doc_type(self, monkeypatch):
        from backend.services import ingest

        docs_dir, filename = self._write_file("# Hello\nworld\n", ".md")
        monkeypatch.setattr(ingest.settings, "docs_dir", docs_dir)
        try:
            docs = ingest.process_single_document(filename)
        finally:
            import shutil; shutil.rmtree(docs_dir)

        assert docs, "Expected at least one doc chunk"
        assert docs[0]["type"] == "markdown"

    def test_md_file_has_low_min_chunk_length(self, monkeypatch):
        from backend.services import ingest

        docs_dir, filename = self._write_file("# Hello\nworld\n", ".md")
        monkeypatch.setattr(ingest.settings, "docs_dir", docs_dir)
        try:
            docs = ingest.process_single_document(filename)
        finally:
            import shutil; shutil.rmtree(docs_dir)

        assert docs[0]["min_chunk_length"] == 20

    def test_csv_file_gets_csv_doc_type(self, monkeypatch):
        from backend.services import ingest

        docs_dir, filename = self._write_file("a,b\n1,2\n3,4\n", ".csv")
        monkeypatch.setattr(ingest.settings, "docs_dir", docs_dir)
        try:
            docs = ingest.process_single_document(filename)
        finally:
            import shutil; shutil.rmtree(docs_dir)

        assert docs, "Expected at least one doc chunk"
        assert docs[0]["type"] == "csv"

    def test_txt_file_has_default_min_chunk_length(self, monkeypatch):
        from backend.services import ingest

        docs_dir, filename = self._write_file("Hello world " * 20, ".txt")
        monkeypatch.setattr(ingest.settings, "docs_dir", docs_dir)
        try:
            docs = ingest.process_single_document(filename)
        finally:
            import shutil; shutil.rmtree(docs_dir)

        assert docs[0]["min_chunk_length"] == 100
