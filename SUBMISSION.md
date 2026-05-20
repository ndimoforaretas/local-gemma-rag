# Gemma CogniVault — Jury Submission

## What I Built

AI has changed how work gets done. In just a few years, teams have moved from manually searching documents to asking chatbots to extract key information, summarise reports, and reason across entire knowledge bases.

But for regulated industries, that promise comes with a hard constraint.

If you work in finance, healthcare, or any organisation handling sensitive internal data, you cannot paste private documents into a cloud AI tool and expect compliance to follow. In the EU and across global markets, data sovereignty shapes what systems you can use, where data can travel, and who is allowed to process it. Cloud AI can be powerful, but with regulated data it raises uncomfortable questions: where does the data go, which region processes it, who controls the infrastructure?

So teams pull back. They keep slower, less intelligent workflows because the risk feels too high.

The obvious alternative — local RAG — rarely lives up to its promise. Large document ingestion can be unreliable. If a pipeline crashes halfway through, progress disappears. Lightweight local models hallucinate tool calls or lose track of retrieved context.

**CogniVault is built for that gap.**

CogniVault is a 100% local, zero-cloud RAG pipeline combining:

- **Durable document ingestion** — A DBOS workflow checkpoints every step (file listing, PDF extraction, embedding batches, index saving) in Postgres. If your machine shuts down mid-ingest, the server resumes from the exact batch it left off. No re-processing thousands of pages.
- **Multi-format support** — Upload PDFs (parsed page-by-page), Markdown, plain text, and CSV files. Attach images directly in chat for multimodal analysis.
- **Agentic reasoning** — The agent doesn't just retrieve and regurgitate. It autonomously chains tool calls: searching the knowledge base, running safe arithmetic, and timestamping reports — all decided by the model at runtime.
- **Chat → KB bridge** — Attach a text file in chat, discuss it with the AI, then add it to the Knowledge Base with one click. No view switching, no re-upload.
- **Interactive citations** — Every answer that draws on a document emits a citation chip. Click it to open the exact source.
- **Multi-session history** — Independent research threads with auto-generated titles, persisted across page reloads.

Your documents stay on your hardware. Your AI workflow becomes durable enough to trust.

---

## Demo

<!-- Embed a video walkthrough or share a link to your deployed project. -->

---

## Code

<!-- Embed or share a link to your repository. -->

---

## How I Used Gemma 4

CogniVault uses two Gemma 4 models served locally via Ollama, each chosen for a specific role.

### `embeddinggemma` — Semantic retrieval

Every document chunk is embedded with `embeddinggemma` and stored in a local FAISS index. At query time the user's question is embedded with the same model and compared against all indexed chunks using cosine similarity. Keeping the embedding model in the same family as the chat model ensures the semantic space is coherent — embeddings and reasoning share the same conceptual grounding.

### `gemma4:e4b` — Agent orchestrator

`gemma4:e4b` is the core intelligence. I chose it specifically because CogniVault needed a model that could do more than retrieve and summarise — it needed to *reason across steps* and *call tools reliably*.

Standard lightweight local models frequently fail at this: they hallucinate tool names, ignore retrieved context, or collapse under multi-step instructions. `gemma4:e4b` delivered three capabilities that made the difference:

**1. Native, reliable function calling.**
The agent is equipped with three tools: `search_knowledge_base` (semantic FAISS search), `calculator` (safe AST-based arithmetic), and `current_time`. Gemma 4 invokes these accurately and in the right sequence. A question like *"Search the Q3 budget report and calculate a 15% contingency buffer"* triggers a real multi-step workflow:
  - Model calls `search_knowledge_base("Q3 budget")` → retrieves the relevant chunk
  - Model reads the figure from the chunk
  - Model calls `calculator("1420000 * 0.15")` → returns the exact result
  - Model composes a timestamped, cited answer

**2. Strong instruction following for context-aware retrieval.**
The system prompt instructs the model to use attached file content directly (when a file is pasted into chat) and only call `search_knowledge_base` when querying indexed documents. `gemma4:e4b` respects this boundary consistently — it doesn't blindly search the KB when the answer is already in the message, and it doesn't ignore the KB when the answer isn't.

**3. Multimodal analysis.**
When a user attaches an image, the content blocks are sent to the model with image modalities before text — following Gemma 4's recommended input ordering for optimal performance. The model can analyse charts, diagrams, and scanned documents alongside text questions in a single turn.

The `e4b` variant sits at roughly 9.6 GB on disk, making it runnable on a modern laptop without a dedicated GPU. That matters for CogniVault's core promise: a compliance officer should be able to run this on their workstation, not require a server room.

Gemma 4 proved that you don't need a 100B+ parameter cloud model to achieve true multi-step agentic workflows. You can do it securely, accurately, and entirely on your own machine.
