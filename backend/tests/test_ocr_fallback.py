"""
Tests for T2-H — OCR fallback for scanned PDFs.

Validates:
- Pages with sufficient pypdf text are NOT sent to OCR.
- Pages below the threshold trigger _ocr_pdf_page().
- OCR text is used when returned.
- Pages with no pypdf text AND failed OCR are still excluded from output.
- _ocr_pdf_page() returns "" gracefully when pymupdf is missing.
- _ocr_pdf_page() returns "" gracefully when pytesseract is missing.
- _ocr_pdf_page() returns "" and warns when the tesseract binary is absent.
"""

import sys
from unittest.mock import MagicMock, patch, call
import pytest


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_pdf_page(text: str) -> MagicMock:
    """Return a fake pypdf page whose extract_text() returns ``text``."""
    page = MagicMock()
    page.extract_text.return_value = text
    return page


def _make_pdf_reader(pages: list[MagicMock]) -> MagicMock:
    """Return a fake PdfReader with the given pages."""
    reader = MagicMock()
    reader.pages = pages
    return reader


# ── get_pdf_pages: OCR not triggered for normal pages ─────────────────────────

class TestGetPdfPagesNoOcr:
    def test_rich_text_page_skips_ocr(self):
        """A page with >50 chars of pypdf text should not call _ocr_pdf_page."""
        from backend.services.ingest import get_pdf_pages, _OCR_TEXT_THRESHOLD

        rich_text = "A" * (_OCR_TEXT_THRESHOLD + 1)
        fake_reader = _make_pdf_reader([_make_pdf_page(rich_text)])

        with (
            patch("backend.services.ingest.PdfReader", return_value=fake_reader),
            patch("backend.services.ingest._ocr_pdf_page") as mock_ocr,
        ):
            pages = get_pdf_pages("dummy.pdf")

        mock_ocr.assert_not_called()
        assert len(pages) == 1
        assert rich_text in pages[0][0]

    def test_page_numbers_are_1_indexed(self):
        """Pages should be numbered starting from 1."""
        from backend.services.ingest import get_pdf_pages

        rich_text = "X" * 100
        fake_reader = _make_pdf_reader([_make_pdf_page(rich_text)])

        with patch("backend.services.ingest.PdfReader", return_value=fake_reader):
            pages = get_pdf_pages("dummy.pdf")

        assert pages[0][1] == 1


# ── get_pdf_pages: OCR triggered for sparse/empty pages ──────────────────────

class TestGetPdfPagesOcrTriggered:
    def test_empty_page_triggers_ocr(self):
        """A page with no pypdf text should call _ocr_pdf_page."""
        from backend.services.ingest import get_pdf_pages

        fake_reader = _make_pdf_reader([_make_pdf_page("")])

        with (
            patch("backend.services.ingest.PdfReader", return_value=fake_reader),
            patch(
                "backend.services.ingest._ocr_pdf_page",
                return_value="OCR extracted text",
            ) as mock_ocr,
        ):
            pages = get_pdf_pages("scan.pdf")

        mock_ocr.assert_called_once_with("scan.pdf", 0)
        assert len(pages) == 1
        assert pages[0][0] == "OCR extracted text"

    def test_sparse_page_triggers_ocr(self):
        """A page with fewer than threshold chars should call _ocr_pdf_page."""
        from backend.services.ingest import get_pdf_pages, _OCR_TEXT_THRESHOLD

        sparse = "x" * (_OCR_TEXT_THRESHOLD - 1)
        fake_reader = _make_pdf_reader([_make_pdf_page(sparse)])

        with (
            patch("backend.services.ingest.PdfReader", return_value=fake_reader),
            patch(
                "backend.services.ingest._ocr_pdf_page",
                return_value="Better OCR text",
            ) as mock_ocr,
        ):
            pages = get_pdf_pages("scan.pdf")

        mock_ocr.assert_called_once()
        assert pages[0][0] == "Better OCR text"

    def test_failed_ocr_page_excluded(self):
        """If OCR returns empty string and pypdf extracted nothing, the page is dropped."""
        from backend.services.ingest import get_pdf_pages

        fake_reader = _make_pdf_reader([_make_pdf_page("")])

        with (
            patch("backend.services.ingest.PdfReader", return_value=fake_reader),
            patch("backend.services.ingest._ocr_pdf_page", return_value=""),
        ):
            pages = get_pdf_pages("blank.pdf")

        assert pages == []

    def test_mixed_pages_ocr_only_on_sparse(self):
        """OCR is only called for the pages that need it."""
        from backend.services.ingest import get_pdf_pages, _OCR_TEXT_THRESHOLD

        rich = "A" * (_OCR_TEXT_THRESHOLD + 10)
        empty = ""
        fake_reader = _make_pdf_reader([
            _make_pdf_page(rich),
            _make_pdf_page(empty),
        ])

        with (
            patch("backend.services.ingest.PdfReader", return_value=fake_reader),
            patch(
                "backend.services.ingest._ocr_pdf_page",
                return_value="scanned page text",
            ) as mock_ocr,
        ):
            pages = get_pdf_pages("mixed.pdf")

        # OCR called once, for page index 1 only.
        mock_ocr.assert_called_once_with("mixed.pdf", 1)
        assert len(pages) == 2
        assert pages[0][1] == 1   # rich text page
        assert pages[1][1] == 2   # OCR page


# ── _ocr_pdf_page: graceful degradation ──────────────────────────────────────

class TestOcrPdfPageDegradation:
    def test_returns_empty_when_fitz_missing(self):
        """When pymupdf (fitz) is not importable, return '' without raising."""
        from backend.services import ingest

        with patch.dict(sys.modules, {"fitz": None}):
            result = ingest._ocr_pdf_page("any.pdf", 0)

        assert result == ""

    def test_returns_empty_when_pytesseract_missing(self):
        """When pytesseract is not importable, return '' without raising."""
        import types
        from backend.services import ingest

        fake_fitz = types.SimpleNamespace(
            open=MagicMock(),
            Matrix=MagicMock(return_value=MagicMock()),
        )

        with (
            patch.dict(sys.modules, {"fitz": fake_fitz, "pytesseract": None}),
        ):
            result = ingest._ocr_pdf_page("any.pdf", 0)

        assert result == ""

    def test_returns_empty_when_tesseract_binary_missing(self):
        """TesseractNotFoundError should be caught; returns '' and logs a warning."""
        import types
        from backend.services import ingest

        # Build minimal fakes for fitz and PIL
        fake_pixmap = MagicMock()
        fake_pixmap.width = 100
        fake_pixmap.height = 100
        fake_pixmap.samples = b"\xff" * (100 * 100 * 3)

        fake_page = MagicMock()
        fake_page.get_pixmap.return_value = fake_pixmap

        fake_doc = MagicMock()
        fake_doc.__getitem__ = MagicMock(return_value=fake_page)
        fake_doc.close = MagicMock()

        fake_fitz = MagicMock()
        fake_fitz.open.return_value = fake_doc
        fake_fitz.Matrix.return_value = MagicMock()

        fake_image = MagicMock()
        fake_pil_image = MagicMock()
        fake_pil_image.frombytes = MagicMock(return_value=fake_image)

        class FakeTesseractNotFoundError(Exception):
            pass

        fake_pytesseract = MagicMock()
        fake_pytesseract.TesseractNotFoundError = FakeTesseractNotFoundError
        fake_pytesseract.image_to_string.side_effect = FakeTesseractNotFoundError("not found")

        with (
            patch.dict(
                sys.modules,
                {
                    "fitz": fake_fitz,
                    "pytesseract": fake_pytesseract,
                    "PIL": fake_pil_image,
                    "PIL.Image": fake_pil_image,
                },
            ),
        ):
            result = ingest._ocr_pdf_page("scan.pdf", 0)

        assert result == ""

    def test_returns_text_on_success(self):
        """When everything works, the OCR text is returned cleaned."""
        import types
        from backend.services import ingest

        fake_pixmap = MagicMock()
        fake_pixmap.width = 50
        fake_pixmap.height = 50
        fake_pixmap.samples = b"\x00" * (50 * 50 * 3)

        fake_page = MagicMock()
        fake_page.get_pixmap.return_value = fake_pixmap

        fake_doc = MagicMock()
        fake_doc.__getitem__ = MagicMock(return_value=fake_page)
        fake_doc.close = MagicMock()

        fake_fitz = MagicMock()
        fake_fitz.open.return_value = fake_doc
        fake_fitz.Matrix.return_value = MagicMock()

        fake_image = MagicMock()
        fake_pil = MagicMock()
        fake_pil.frombytes.return_value = fake_image

        fake_pytesseract = MagicMock()
        fake_pytesseract.TesseractNotFoundError = Exception
        fake_pytesseract.image_to_string.return_value = "  Hello   World  \n"

        with (
            patch.dict(
                sys.modules,
                {
                    "fitz": fake_fitz,
                    "pytesseract": fake_pytesseract,
                    "PIL": fake_pil,
                    "PIL.Image": fake_pil,
                },
            ),
        ):
            result = ingest._ocr_pdf_page("scan.pdf", 0)

        assert result == "Hello World"
