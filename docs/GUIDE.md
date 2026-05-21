# Gemma CogniVault — User Guide

> **Everything you need to know to get the most out of the app.**
> This guide is pre-loaded into the knowledge base and powers the suggestion cards on first launch.

---

## Table of Contents

1. [What is Gemma CogniVault?](#1-what-is-gemma-cognivault)
2. [The Interface at a Glance](#2-the-interface-at-a-glance)
3. [Chat View — Complete Feature Reference](#3-chat-view--complete-feature-reference)
4. [Knowledge Base View — Complete Feature Reference](#4-knowledge-base-view--complete-feature-reference)
5. [When to Use Chat Attachments vs. Knowledge Base](#5-when-to-use-chat-attachments-vs-knowledge-base)
6. [Power-User Tips](#6-power-user-tips)
7. [FAQ](#7-faq)

---

## 1. What is Gemma CogniVault?

Gemma CogniVault is a **fully local, privacy-first AI assistant** that answers questions about your own documents. Nothing leaves your machine — no API keys, no cloud services, no usage fees.

Under the hood it combines:

| Component | What it does |
|-----------|-------------|
| **Ollama + Gemma 4 E4B** | Runs the language model locally — supports text, images, and reasoning |
| **FAISS + BM25** | Hybrid retrieval: vector similarity search fused with keyword matching |
| **DBOS durable workflows** | Makes ingestion crash-proof and resumable |
| **PostgreSQL** | Stores workflow state and chat history |

The app has two primary views: **Chat** and **Knowledge Base**.

---

## 2. The Interface at a Glance

### Left Sidebar — Navigation

| Item | What it does |
|------|-------------|
| **Chat** (speech bubble icon) | Opens the conversation interface |
| **Knowledge Base** (database icon) | Opens the document manager |

### Top Header — Utility Controls

| Control | What it does |
|---------|-------------|
| **Local Workspace** badge | Confirms the app is running entirely locally |
| **Sun / Moon button** | Toggles between light and dark mode instantly |
| **User avatar** | Shows connection status (green = Ollama reachable) |

---

## 3. Chat View — Complete Feature Reference

The Chat view is your primary interface with the AI. Open it by clicking **Chat** in the sidebar.

---

### 3.1 Suggestion Cards

When you start a **fresh conversation** (no messages yet), a grid of clickable suggestion cards appears below the welcome message.

- Each card covers a common feature or workflow.
- **Click any card** to send it immediately — no typing required.
- Cards disappear as soon as the conversation begins.
- When documents are indexed, cards are tailored to your actual document titles.

---

### 3.2 The Chat Input

The text field at the bottom of the chat area supports:

| Action | How |
|--------|-----|
| **Send a message** | Type and press `Enter` |
| **New line without sending** | `Shift + Enter` |
| **Attach a file or image** | Click the paperclip icon |
| **Voice input** | Click the microphone icon (see §3.3) |
| **Character counter** | Shown once you exceed ~80% of the 5,000-character limit |

The input box auto-resizes vertically as you type, up to about five visible lines before it scrolls.

---

### 3.3 Voice Input

Click the **microphone icon** in the chat input bar to ask a question with your voice.

1. Click the mic icon — your browser will request microphone permission on first use.
2. Speak your question clearly.
3. Click the **stop icon** (square) when you are done.
4. Your speech is transcribed locally by Whisper — no cloud service is used.
5. The transcribed text appears in the input box. Review it, then press `Enter` to send.

> **Note:** Voice input requires the Whisper model to be available. If the mic icon is not visible, Whisper may not be installed. See the README for setup instructions.

---

### 3.4 File Attachments in Chat

Attach a file alongside your question for the AI to read on the fly. This is for one-off files — it does **not** permanently index them.

**Supported types:**

| Category | Formats | Size limit |
|----------|---------|------------|
| Images | JPG, PNG, GIF, WebP | 10 MB |
| PDFs | `.pdf` — text extracted automatically | 10 MB |
| Word documents | `.docx` — full text extracted | 10 MB |
| Text / Code | `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.yaml`, `.yml`, `.log`, `.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.sql` | 5 MB |

After sending a text or document file, a **green bridge card** appears offering to save it to the Knowledge Base permanently. Click **Add to KB** to index it for future sessions.

> **Tip:** For a PDF you only need to reference once, attaching it in chat is the fastest path. For documents you query regularly, add them to the Knowledge Base so you never need to re-attach.

---

### 3.5 Image Analysis

Attach any image (screenshot, chart, photo, diagram) to your message and ask questions about it. The AI reads the image directly using its built-in vision capability.

**Example uses:**
- "What does this chart show and does it match what's in my Q3 report?"
- "Summarise the text in this screenshot."
- "Identify the key components in this architecture diagram."

The AI combines what it sees in the image with any relevant content it retrieves from your knowledge base.

---

### 3.6 Streaming Responses and the Thinking Panel

AI responses stream to the screen in real time. While the AI is generating:

- A three-dot animation appears in the response bubble.
- The input and send button are disabled until the stream completes.
- The page scrolls automatically to keep the latest content in view.

**The Thinking Panel** appears above the final answer when the AI uses its extended reasoning mode. It shows the model's internal reasoning chain — how it decided which tools to call, how it interpreted your question, and how it reconciled information from multiple sources.

- Click the thinking panel header to expand or collapse the reasoning chain.
- The thinking panel updates in real time as the model reasons, before the answer appears.
- This is especially visible on complex, multi-document questions.

---

### 3.7 Context Sidebar — Source Citations

Whenever the AI searches your knowledge base, a **Context Used** panel appears on the right side of the chat area showing every source it retrieved.

Each citation card shows:

| Field | Description |
|-------|-------------|
| **Document name** | The source filename |
| **File type badge** | PDF, DOCX, CSV, etc. |
| **Page number** | The page within the document (where applicable) |
| **View chunk** | Click to expand and read the exact text the AI retrieved |

**On mobile:** tap the "N sources" badge in the chat header to open the context panel as a slide-in overlay.

> **Tip:** If an answer seems wrong, open the Context sidebar to see which chunks the AI actually used. If the right document is not listed, it may not be indexed yet — check the Knowledge Base view.

---

### 3.8 Edit-and-Resend and Regenerate

You are not locked in to a conversation as it happened. You can rewind and try again.

**Edit a previous message:**
1. Hover over any message (user or AI) to reveal the pencil icon.
2. Click it to open the inline editor.
3. Modify the text. Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to resend, or Escape to cancel.
4. The conversation history rewinds to that point and the AI re-reasons from there.

**Regenerate an AI response:**
1. Hover over any AI message to reveal the regenerate icon.
2. Click it — the AI re-answers the preceding question from scratch.
3. Useful if the first answer was incomplete or missed the point.

> All earlier messages in the conversation are preserved — only the rewound portion is replaced.

---

### 3.9 Message Actions

Hover over any AI message bubble to reveal:

| Button | What it does |
|--------|-------------|
| **Copy** | Copies the raw markdown text. Icon turns to a tick for 2 seconds. |
| **Download** | Saves the response as a .md file. |
| **Regenerate** | Re-generates the answer (see section 3.8). |

---

### 3.10 Markdown Rendering

AI responses render full Markdown:

- Bold, italic, strikethrough text
- Inline code and fenced code blocks with syntax highlighting
- Numbered and bulleted lists, blockquotes, horizontal rules
- Tables — numeric columns are right-aligned automatically

---

### 3.11 Chat History

Click the history icon in the chat header to open the history panel.

| Feature | Detail |
|---------|--------|
| **Session list** | All conversations, sorted newest first |
| **Recency labels** | Today HH:MM, Yesterday HH:MM, or full date |
| **Switch session** | Click any row to load it |
| **Delete session** | Trash icon then confirmation modal |

Start a new blank conversation with the New Chat button. Sessions are auto-saved after every message.

---

## 4. Knowledge Base View — Complete Feature Reference

Open the Knowledge Base by clicking **Knowledge Base** in the sidebar. This is where you manage the documents the AI can search.

---

### 4.1 Uploading Documents

Drag files onto the drop zone or click it to browse. Uploads start the ingestion pipeline automatically.

**9 supported formats:**

| Format | Chunking strategy |
|--------|-----------------|
| **PDF** (text) | Semantic sliding-window, page-by-page |
| **PDF** (scanned / image-only) | OCR via Tesseract, then semantic chunking |
| **DOCX** | Paragraph-aware splitting |
| **Markdown** | Header-hierarchy breadcrumbs (Section: H1 > H2 > H3) |
| **CSV** | 20-row chunks, header repeated on every chunk |
| **PPTX** | One chunk per slide, including speaker notes |
| **XLSX** | Sheet-labelled row chunks |
| **HTML** | Clean article extraction, then semantic chunking |
| **TXT** | Sliding-window with overlap |

Maximum upload size per batch is set by MAX_UPLOAD_SIZE_MB (default 200 MB).

---

### 4.2 The Ingestion Pipeline

After uploading, a four-step durable workflow runs to embed your documents:

| Step | What happens |
|------|-------------|
| **Scanning Library** | Finds new files not yet indexed |
| **Gathering Document** | Extracts text and splits into overlapping chunks |
| **Calibrating Neural Embeddings** | Sends chunks to Ollama to generate vector embeddings |
| **Committing Knowledge Store** | Saves the FAISS index and metadata to disk |

Progress is shown as an animated timeline. When all four steps complete, the document list refreshes automatically.

---

### 4.3 Browsing and Deleting Documents

| Feature | How to use |
|---------|------------|
| **Expand or collapse folders** | Click the folder header |
| **Sort files** | Name A to Z, Name Z to A, Date newest, Size largest |
| **Delete a document** | Trash icon then confirmation modal |

After deletion the AI immediately stops finding that document. To permanently remove the file from disk, delete it from the docs/ folder directly.

---

## 5. When to Use Chat Attachments vs. Knowledge Base

| Scenario | Best approach |
|----------|--------------|
| Ask about a document once | Attach it in chat |
| Ask about the same document repeatedly | Add it to the Knowledge Base |
| Synthesise across multiple documents | Add all of them to the Knowledge Base |
| Chat about a PDF one-off | Attach it in chat (text extracted automatically) |
| Asking about an image or chart | Chat attachment (vision) |

---

## 6. Power-User Tips

### Get better answers

- **Name the document.** Mentioning the filename in your question helps the AI focus on the right source.
- **Ask follow-up questions.** Context from earlier in a session is preserved — build on previous answers.
- **Check the Context sidebar.** If an answer seems wrong, see exactly which chunks the AI used.
- **Edit and retry.** If a question was ambiguous, use edit-and-resend to rephrase rather than starting a new session (section 3.8).
- **Use the Thinking panel.** For complex questions, expand the reasoning panel to understand how the AI is approaching the problem.

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `Cmd/Ctrl + Enter` | Submit edited message |
| `Escape` | Cancel editing |
| `Tab` | Navigate between interactive elements |

---

## 7. FAQ

**Q: Does anything get sent to the internet?**
No. Every component — the LLM, the embedding model, the vector store, the transcription model, the database — runs locally on your machine. No data leaves your computer.

---

**Q: Why isn't the AI finding my document?**
Work through this checklist:
1. Open the Knowledge Base view and confirm the file appears in the document list.
2. If it is missing, upload it and wait for all four ingestion steps to complete.
3. If it is listed but the AI still misses it, try re-phrasing your question — semantic search matches meaning, not exact keywords.
4. Check the Context sidebar after your question to see which sources were actually used.

---

**Q: Can I chat about a PDF without adding it to the Knowledge Base?**
Yes. Click the paperclip icon in the chat input, select your PDF, and send it with your question. The app extracts the text automatically and the AI reads it inline. This is great for one-off documents. For files you query regularly, add them to the Knowledge Base so you never need to re-attach.

---

**Q: My scanned PDF is not being indexed — what is wrong?**
Scanned PDFs (image-only, no selectable text) are processed via OCR using Tesseract. If OCR is not producing results, make sure Tesseract is installed on your system. Run brew install tesseract on macOS, or apt install tesseract-ocr on Linux. The README has full setup instructions.

---

**Q: Can I ask questions that are not about my documents?**
Yes. The AI has access to a calculator tool and a real-time clock tool. For general questions it will draw on its training knowledge — it only searches the knowledge base when the question warrants it.

---

**Q: How do I search only one specific document?**
Mention the document name directly in your question — for example: "According to annual_report_2024.pdf, what was the total revenue?" The AI uses the filename as a strong retrieval signal. For complete isolation, attach the document directly in chat.

---

**Q: How many documents can I index?**
There is no hard limit. FAISS search degrades gracefully as the index grows. For very large collections, mention the relevant filename in your query to help the AI focus.

---

**Q: Can I change the AI model?**
Yes. Edit the LLM_MODEL and EMBEDDING_MODEL values in your .env file, then restart the app. Make sure the model is available in Ollama first by running ollama pull followed by the model name. Changing the embedding model requires re-indexing all documents since embeddings are model-specific.

---

**Q: How do I completely reset the knowledge base?**
Delete vector_store.faiss and vector_store.json from the project root, and remove the files in the docs/ folder. Restart the app and re-upload your documents.

---

**Q: What is the Save to KB card that appears after sending a file?**
When you attach a text file or PDF in chat, the app offers to permanently index it into the Knowledge Base so you can query it in future sessions. Click Add to KB to accept, or dismiss to skip.

---

**Q: Does the AI remember our previous conversations?**
Within a single session, yes — the full conversation history is preserved so you can ask follow-up questions naturally. Previous sessions are saved to the history panel but their content is not automatically injected into new conversations. Start a new session fresh, or continue an existing one from the history panel.

---

*This guide covers CogniVault as of May 2026 — including voice input, vision, thinking panel, edit-and-resend, citation preview, and 9-format ingestion.*
