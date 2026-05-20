"""
Agent tools for the Gemma CogniVault RAG agent.

Each tool is decorated with `@tool` from the Strands SDK so the
LLM can invoke them during a conversation.
"""

import ast
import contextvars
import datetime
import operator

from strands import tool

from backend.config import logger
from backend.services.vector_db import vector_db

# Per-asyncio-Task citation context.
# Each FastAPI request runs in its own Task, so `.set()` here is never
# visible to a concurrent request — no shared mutable state on the function.
_last_doc_ctx: contextvars.ContextVar[dict] = contextvars.ContextVar(
    "last_doc", default={}
)

# Safe operators for the calculator — no eval().
_SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
    ast.Mod: operator.mod,
    ast.FloorDiv: operator.floordiv,
}


def _safe_eval(node: ast.AST) -> float:
    """Recursively evaluate an AST node using only whitelisted operators."""
    if isinstance(node, ast.Expression):
        return _safe_eval(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in _SAFE_OPERATORS:
            raise ValueError(f"Unsupported operator: {op_type.__name__}")
        left = _safe_eval(node.left)
        right = _safe_eval(node.right)
        return _SAFE_OPERATORS[op_type](left, right)
    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in _SAFE_OPERATORS:
            raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
        return _SAFE_OPERATORS[op_type](_safe_eval(node.operand))
    raise ValueError(f"Unsupported expression node: {type(node).__name__}")


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression safely (no code execution)."""
    try:
        tree = ast.parse(expression, mode="eval")
        result = _safe_eval(tree)
        return str(result)
    except Exception as e:
        logger.warning("Calculator failed for expression %r: %s", expression, e)
        return f"Error: {e}"


@tool
def current_time() -> str:
    """Get the current date and time."""
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


@tool
def search_knowledge_base(query: str) -> str:
    """Search the user's indexed documents in the local knowledge base.
    Call this for most questions — the knowledge base likely contains relevant context.
    Do NOT call this when the user has attached a file or image to their current message.
    Provide a clear, specific query for the best results."""
    results = vector_db.search(query, top_k=7)
    if not results:
        return "No relevant information found."

    formatted_results: list[str] = []
    for res in results:
        page_info = f" (Page {res['page']})" if res.get("page") else ""
        formatted_results.append(
            f"Source: {res['source']}{page_info}\nContent: {res['text']}"
        )
        # Store in the per-request ContextVar — never bleeds to other requests.
        _last_doc_ctx.set(res)

    return "\n---\n".join(formatted_results)
