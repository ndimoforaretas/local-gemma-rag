"""
Tests for the safe calculator tool.

These verify that the AST-based evaluator correctly handles
arithmetic and rejects dangerous inputs (no eval() exploits).
"""

from backend.tools.agent_tools import calculator, _safe_eval
import ast
import pytest


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
