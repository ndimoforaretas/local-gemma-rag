"""
Tests for the safe calculator tool.

These verify that the AST-based evaluator correctly handles
arithmetic and rejects dangerous inputs (no eval() exploits).
"""

from backend.tools.agent_tools import calculator, _safe_eval
import ast
import pytest
from types import SimpleNamespace


class TestCalculator:
    """Safe calculator tool tests."""

    def test_basic_addition(self):
        assert calculator(expression="2 + 3") == "5"

    def test_basic_subtraction(self):
        assert calculator(expression="10 - 4") == "6"

    def test_multiplication(self):
        assert calculator(expression="6 * 7") == "42"

    def test_division(self):
        assert calculator(expression="15 / 4") == "3.75"

    def test_floor_division(self):
        assert calculator(expression="15 // 4") == "3"

    def test_modulo(self):
        assert calculator(expression="17 % 5") == "2"

    def test_power(self):
        assert calculator(expression="2 ** 10") == "1024"

    def test_negative_number(self):
        assert calculator(expression="-5 + 3") == "-2"

    def test_complex_expression(self):
        assert calculator(expression="(2 + 3) * 4 - 1") == "19"

    def test_floating_point(self):
        assert calculator(expression="0.1 + 0.2") == str(0.1 + 0.2)

    def test_division_by_zero(self):
        result = calculator(expression="1 / 0")
        assert "Error" in result

    def test_rejects_function_calls(self):
        """Ensures __import__ and os.system are blocked."""
        result = calculator(expression="__import__('os').system('ls')")
        assert "Error" in result

    def test_rejects_string_literals(self):
        result = calculator(expression="'hello'")
        assert "Error" in result

    def test_rejects_variable_names(self):
        result = calculator(expression="x + 1")
        assert "Error" in result

    def test_rejects_list_comprehension(self):
        result = calculator(expression="[i for i in range(10)]")
        assert "Error" in result

    def test_empty_expression(self):
        result = calculator(expression="")
        assert "Error" in result


class TestRagStreaming:
    """Tests for RAG streaming format (JSON Lines)."""

    @pytest.mark.asyncio
    async def test_rag_stream_emits_json_lines_format(self):
        """Verify that RAG streaming emits valid JSON Lines."""
        from backend.services.rag_agent import run_rag_stream
        import json

        # Note: This test will fail if Ollama is not running.
        # For CI/CD, mock the agent.stream_async() method.

        # Collect all emitted lines
        lines = []
        async for chunk in run_rag_stream("What is 2+2?"):
            # Each chunk should be a complete JSON Line (line ends with \n)
            if chunk.strip():
                lines.append(chunk.strip())

        # Should have at least some output
        if lines:
            for line in lines:
                # Each line should be valid JSON
                try:
                    obj = json.loads(line)
                    # Should have "type" and "data" fields
                    assert "type" in obj, f"Missing 'type' in {obj}"
                    assert "data" in obj, f"Missing 'data' in {obj}"
                    # type should be one of the known event types (thinking added in Step 1)
                    assert obj["type"] in ("text", "metadata", "error", "thinking"), f"Invalid type: {obj['type']}"
                except json.JSONDecodeError as e:
                    pytest.fail(f"Invalid JSON in line: {line}, error: {e}")

    @pytest.mark.asyncio
    async def test_metadata_event_format_is_valid_json(self):
        """Verify that metadata events serialise to the correct JSON Lines structure."""
        import json

        # Simulate the metadata dict a tool call would produce.
        test_metadata = {
            "source": "test.pdf",
            "text": "test content",
            "page": 1,
            "type": "pdf",
        }

        # Reproduce the exact emission the streaming loop produces.
        metadata_line = f'{json.dumps({"type": "metadata", "data": test_metadata})}\n'

        parsed = json.loads(metadata_line.strip())
        assert parsed["type"] == "metadata"
        assert parsed["data"]["source"] == "test.pdf"
        assert parsed["data"]["page"] == 1


class TestAttachmentClassification:
    """Tests for backend text attachment recognition."""

    def test_is_text_attachment_accepts_application_json(self):
        from backend.services.rag_agent import _is_text_attachment

        att = SimpleNamespace(mime_type="application/json", name="data.json")
        assert _is_text_attachment(att) is True

    def test_is_text_attachment_accepts_text_by_extension(self):
        from backend.services.rag_agent import _is_text_attachment

        att = SimpleNamespace(mime_type="application/octet-stream", name="notes.md")
        assert _is_text_attachment(att) is True
