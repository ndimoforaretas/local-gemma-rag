"""
Agent tools for the Gemma CogniVault RAG agent.

Each tool is decorated with `@tool` from the Strands SDK so the
LLM can invoke them during a conversation.
"""

import ast
import contextvars
import datetime
import operator

import ollama

from strands import tool

from backend.config import get_settings, logger
from backend.services.vector_db import vector_db

# Per-request citation accumulator.
# Stores every unique source document found by search_knowledge_base during
# a request so the frontend sidebar can display all of them.  Always
# initialised to a fresh list via _last_doc_ctx.set([]) at request start —
# never relies on the mutable default across requests.
_last_doc_ctx: contextvars.ContextVar[list[dict]] = contextvars.ContextVar(
    "last_doc", default=[]
)

# Per-request document scope filter.
# When set to a non-empty list, search_knowledge_base restricts results to
# chunks whose source filename is in the list.  None = search all documents.
_source_filter_ctx: contextvars.ContextVar[list[str] | None] = contextvars.ContextVar(
    "source_filter", default=None
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
    source_filter = _source_filter_ctx.get()
    results = vector_db.search(query, top_k=7, source_filter=source_filter or None)
    if not results:
        if source_filter:
            return (
                f"No relevant information found in the selected document(s): "
                f"{', '.join(source_filter)}. Try broadening the scope or asking differently."
            )
        return "No relevant information found."

    formatted_results: list[str] = []
    # Accumulate unique sources so every citation shows in the sidebar.
    docs = _last_doc_ctx.get()
    seen_sources = {d.get("source") for d in docs}
    for res in results:
        page_info = f" (Page {res['page']})" if res.get("page") else ""
        formatted_results.append(
            f"Source: {res['source']}{page_info}\nContent: {res['content']}"
        )
        if res.get("source") not in seen_sources:
            docs.append(res)
            seen_sources.add(res.get("source"))

    return "\n---\n".join(formatted_results)


# ── Document Intelligence Tools ───────────────────────────────────────────────
# These tools let the agent reason *about* the vault itself rather than just
# searching it.  analyze_document and compare_documents call Gemma directly via
# ollama.chat() (not through the agent) to avoid infinite tool-call recursion.

_MAX_ANALYSIS_CHARS = 10_000   # ~2 500 tokens — keeps inner calls fast


@tool
def list_documents() -> str:
    """List documents currently available for querying.

    When a scope filter is active (set by the user), only the filtered
    documents are listed — do not mention or search documents outside
    this scope. Use this to discover what is available before searching."""
    source_filter = _source_filter_ctx.get()
    active = [m for m in vector_db.metadata if not m.get("deleted")]

    # Apply scope filter if one is active.
    if source_filter:
        active = [m for m in active if m.get("source", "") in source_filter]

    if not active:
        if source_filter:
            return (
                f"No indexed chunks found for the scoped document(s): "
                f"{', '.join(source_filter)}. The file may not be ingested yet."
            )
        return (
            "The knowledge base is empty — no documents have been indexed yet. "
            "Upload a file and run ingestion to get started."
        )

    # Group by source filename.
    docs: dict[str, dict] = {}
    for chunk in active:
        source = chunk.get("source", "unknown")
        dtype = chunk.get("type", "unknown")
        if source not in docs:
            docs[source] = {"type": dtype, "chunk_count": 0}
        docs[source]["chunk_count"] += 1

    scope_note = (
        f" [scope: {', '.join(source_filter)}]" if source_filter else ""
    )
    lines = [f"📚 Knowledge Base{scope_note} — {len(docs)} document(s):\n"]
    for name in sorted(docs):
        info = docs[name]
        lines.append(
            f"  • {name}  [{info['type']}]  ({info['chunk_count']} chunk(s))"
        )
    return "\n".join(lines)


@tool
def analyze_document(filename: str) -> str:
    """Produce a structured analysis of a single document in the knowledge base.

    The analysis includes key topics, important entities (names, dates,
    organisations), key facts, and a 2–3 sentence summary.

    Args:
        filename: The exact document name as returned by list_documents.
    """
    chunks = [
        m for m in vector_db.metadata
        if not m.get("deleted") and m.get("source", "") == filename
    ]
    if not chunks:
        return (
            f"Document '{filename}' was not found in the knowledge base. "
            "Use list_documents() to see all available filenames."
        )

    # Concatenate chunk content (truncated to avoid overflowing context).
    full_text = "\n\n".join(
        c.get("content") or c.get("text", "") for c in chunks
    )
    if len(full_text) > _MAX_ANALYSIS_CHARS:
        full_text = full_text[:_MAX_ANALYSIS_CHARS] + "\n\n[…content truncated…]"

    settings = get_settings()
    prompt = (
        f"You are analyzing the following document: **{filename}**\n\n"
        "Provide a structured analysis with these sections:\n"
        "1. **Key Topics** — main subjects covered\n"
        "2. **Key Entities** — important names, dates, organisations, places\n"
        "3. **Key Facts** — the most important specific pieces of information\n"
        "4. **Summary** — a 2–3 sentence overview of the document\n\n"
        "Document content:\n"
        f"{full_text}"
    )

    try:
        response = ollama.chat(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
        )
        return response["message"]["content"]
    except Exception as exc:
        logger.error("analyze_document failed for %r: %s", filename, exc)
        return f"Error analysing '{filename}': {exc}"


@tool
def compare_documents(doc_a: str, doc_b: str, question: str) -> str:
    """Compare two documents in the knowledge base by answering a specific question.

    Fetches content from both documents and asks Gemma to answer `question`
    by comparing them side-by-side.

    Args:
        doc_a:     First document name (as returned by list_documents).
        doc_b:     Second document name (as returned by list_documents).
        question:  The comparison question, e.g. "Which document covers risk
                   management more thoroughly?"
    """
    def _get_text(filename: str) -> str | None:
        chunks = [
            m for m in vector_db.metadata
            if not m.get("deleted") and m.get("source", "") == filename
        ]
        if not chunks:
            return None
        text = "\n\n".join(c.get("content") or c.get("text", "") for c in chunks)
        if len(text) > _MAX_ANALYSIS_CHARS:
            text = text[:_MAX_ANALYSIS_CHARS] + "\n\n[…content truncated…]"
        return text

    text_a = _get_text(doc_a)
    text_b = _get_text(doc_b)

    if text_a is None:
        return (
            f"Document '{doc_a}' was not found in the knowledge base. "
            "Use list_documents() to see all available filenames."
        )
    if text_b is None:
        return (
            f"Document '{doc_b}' was not found in the knowledge base. "
            "Use list_documents() to see all available filenames."
        )

    settings = get_settings()
    prompt = (
        f"Compare the two documents below and answer this question:\n"
        f"**{question}**\n\n"
        f"--- Document A: {doc_a} ---\n{text_a}\n\n"
        f"--- Document B: {doc_b} ---\n{text_b}\n\n"
        "Provide a clear, structured comparison that directly answers the question."
    )

    try:
        response = ollama.chat(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
        )
        return response["message"]["content"]
    except Exception as exc:
        logger.error("compare_documents failed for %r vs %r: %s", doc_a, doc_b, exc)
        return f"Error comparing documents: {exc}"
