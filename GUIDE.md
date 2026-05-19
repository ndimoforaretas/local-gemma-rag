# Gemma CogniVault — User Guide

> **Everything you need to know to get the most out of the app.**
> Delete this file whenever you no longer need it.

---

## Table of Contents

1. [What is Gemma CogniVault?](#1-what-is-gemma-cognivault)
2. [The Interface at a Glance](#2-the-interface-at-a-glance)
3. [Chat View — Complete Feature Reference](#3-chat-view--complete-feature-reference)
4. [Knowledge Base View — Complete Feature Reference](#4-knowledge-base-view--complete-feature-reference)
5. [Working with Documents](#5-working-with-documents)
6. [Power-User Tips](#6-power-user-tips)
7. [FAQ](#7-faq)

---

## 1. What is Gemma CogniVault?

Gemma CogniVault is a **fully local, privacy-first AI assistant** that answers questions about your own documents. Nothing leaves your machine — no API keys, no cloud services, no usage fees.

Under the hood it combines:

| Component                  | What it does                               |
| -------------------------- | ------------------------------------------ |
| **Ollama + Gemma**         | Runs the language model locally            |
| **FAISS vector store**     | Indexes your documents for semantic search |
| **DBOS durable workflows** | Makes ingestion crash-proof and resumable  |
| **PostgreSQL**             | Stores workflow state and chat history     |

The app has two primary views: **Chat** and **Knowledge Base**.

---

## 2. The Interface at a Glance

### Left Sidebar — Navigation

| Item                               | What it does                     |
| ---------------------------------- | -------------------------------- |
| **Chat** (speech bubble icon)      | Opens the conversation interface |
| **Knowledge Base** (database icon) | Opens the document manager       |

The active view is highlighted with a purple-accented animated background pill.

### Top Header — Utility Controls

| Control                   | What it does                                                          |
| ------------------------- | --------------------------------------------------------------------- |
| **Local Workspace** badge | Confirms the app is running entirely locally                          |
| **Sun / Moon button**     | Toggles between light and dark mode — preference is applied instantly |
| **User avatar**           | Shows connection status (green = online / Ollama reachable)           |

---

## 3. Chat View — Complete Feature Reference

The Chat view is your primary interface with the AI. Open it by clicking **Chat** in the sidebar.

---

### 3.1 Suggestion Cards

When you start a **fresh conversation** (no messages yet), a grid of four clickable suggestion cards appears below the welcome message.

- Each card contains a starter question tailored to what is actually in your knowledge base. If the KB is empty, you get four general-purpose questions instead.
- **Click any card** — the question is pre-filled into the input box so you can read and edit it before sending.
- The cards disappear automatically as soon as the conversation begins.
- Suggestions are refreshed from the AI whenever the page loads, at most once every five minutes.

> **Tip:** The cards are especially useful when someone else hands you a pre-loaded knowledge base and you want to quickly discover what topics it covers.

---

### 3.2 The Chat Input

The text field at the bottom of the chat area supports:

| Action                       | How                                                     |
| ---------------------------- | ------------------------------------------------------- |
| **Send a message**           | Type and press `Enter`                                  |
| **New line without sending** | `Shift + Enter`                                         |
| **Attach a file**            | Click the paperclip icon, or see §3.3                   |
| **Character counter**        | Shown once you exceed ~80% of the 5 000-character limit |

The input box **auto-resizes** vertically as you type, up to about five visible lines before it starts scrolling.

---

### 3.3 File Attachments in Chat

You can attach **one file per message** alongside your question. This is for ad-hoc files you want the AI to read on the fly — it does not permanently index them.

**Supported types and limits:**

| Category    | Formats                                                                                                      | Size limit |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| Images      | JPG, PNG, GIF, WebP, and other common image types                                                            | 10 MB      |
| Text / Code | `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.yaml`, `.yml`, `.log`, `.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.sql` | 5 MB       |

**What happens:**

1. The file content (or image) is sent to the AI together with your message.
2. The AI reads the file directly — it does **not** search the knowledge base for it.
3. A thumbnail preview appears in the input area before you send.
4. After sending, the message bubble shows the attachment preview.

> **Note:** PDFs cannot be attached inline. To query a PDF, add it to the Knowledge Base first (see §4).

---

### 3.4 Save Attachment to Knowledge Base

After you send a text file attachment, a **green bridge card** appears at the bottom of the chat area:

```
📁  Add "report.csv" to Knowledge Base?    [Add to KB]  [✕]
```

- Click **Add to KB** (KB = Knowledge Base) to permanently save and index that file so future questions can reference it.
- Click **✕** to dismiss without saving.
- A spinner confirms the save is in progress; a green tick confirms success.

---

### 3.5 Streaming AI Responses

The AI's answer streams to the screen in real time — you do not wait for the full reply before reading begins. While the AI is generating:

- A three-dot bouncing animation appears in the response bubble.
- The input and send button are disabled until the stream completes.
- The page scrolls automatically to keep the latest content in view.

---

### 3.6 Context Sidebar — Source Citations

Whenever the AI searches your knowledge base to answer a question, a **Context Used** panel slides in from the right side of the chat area.

Each card in the panel shows:

| Field           | Description                               |
| --------------- | ----------------------------------------- |
| **Title**       | The document filename                     |
| **Path**        | The folder path within the knowledge base |
| **Type badge**  | The file type (PDF, TXT, etc.)            |
| **Open source** | A link to view the raw file               |

The count of sources used is also shown as a blue pill badge in the chat header (e.g. `3 sources`).

> **Tip:** If the AI gives an unexpected answer, check the Context sidebar to see exactly which documents it drew from — that tells you whether the right files are indexed.

---

### 3.7 Message Actions

Hover over any **AI message bubble** to reveal two action buttons:

| Button                         | What it does                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Copy** (clipboard icon)      | Copies the raw markdown text to your clipboard. The icon turns into a tick for two seconds to confirm.     |
| **Download** (arrow-down icon) | Saves the response as a `.md` file named `CogniVault_Response_<id>.md`. Useful for archiving long answers. |

---

### 3.8 Markdown Rendering

AI responses render full Markdown:

- **Bold**, _italic_, ~~strikethrough~~
- `inline code` and full fenced code blocks with language hints
- Numbered and bulleted lists
- Blockquotes
- Horizontal rules
- **Tables** — numeric columns are detected automatically and right-aligned for readability

---

### 3.9 New Chat

Click the **New Chat** button in the chat header to start a blank conversation. The current session is saved automatically and appears in the history panel.

---

### 3.10 Chat History Sidebar

Click the **clock/history icon** in the chat header to open the history panel on the right.

| Feature            | Detail                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Session list**   | All past conversations, sorted newest first                                                                   |
| **Recency labels** | Sessions from today show `Today, HH:MM`; yesterday shows `Yesterday, HH:MM`; older ones show full date + time |
| **Switch session** | Click any session row to load it                                                                              |
| **Active session** | Highlighted with a purple border                                                                              |
| **Delete session** | Click the trash icon on a session row — a confirmation modal prevents accidental deletion                     |

Session titles are generated from the first ~25 characters of your opening message.

---

## 4. Knowledge Base View — Complete Feature Reference

Open the Knowledge Base by clicking **Knowledge Base** in the sidebar. This is where you manage the documents the AI can search.

---

### 4.1 Uploading Documents

Navigate to the `Knowledge Base` view and locate the dashed drop zone at the top of the page. You can add files to your knowledge base using either of the following methods:

#### Method 1 — Click to browse:

1. Click anywhere inside the dashed drop zone.
2. A file browser opens.
3. Select one or more files.
4. Click `Open` to confirm your selection.
5. The upload and ingestion pipeline starts automatically.

#### Method 2 — Drag and drop:

1. Drag one or more files from your file manager.
2. Drop them anywhere onto the drop zone (it highlights in purple when a valid drag is detected).
3. The pipeline starts automatically.

**Supported formats:**

| Format  | Notes                          |
| ------- | ------------------------------ |
| **PDF** | Text is extracted page-by-page |
| **TXT** | Plain text files               |
| **MD**  | Markdown files                 |
| **CSV** | Comma-separated data           |

Maximum upload size per batch is controlled by the `MAX_UPLOAD_SIZE_MB` setting (default 200 MB).

---

### 4.2 The Ingestion Pipeline

After uploading, a durable four-step workflow runs to embed your documents into the vector store. Progress is shown as an animated timeline:

| Step                              | What happens                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| **Scanning Library**              | Finds newly uploaded files that are not yet indexed                                          |
| **Gathering Document**            | Extracts text (PDF pages, plain text, markdown, CSV rows) and splits into overlapping chunks |
| **Calibrating Neural Embeddings** | Sends chunks to Ollama in batches to generate vector embeddings                              |
| **Committing Knowledge Store**    | Saves the FAISS index and metadata to disk                                                   |

**Crash-proof by design:** Because the pipeline runs as a DBOS durable workflow, each completed step is checkpointed to the database. If the app crashes mid-ingestion, the workflow resumes automatically from the last completed step when the app restarts — no data is lost and no re-work is done.

Once all four steps complete, a success notice appears and the document list refreshes automatically.

---

### 4.3 Browsing Your Knowledge Base

Below the upload area, all indexed documents are displayed in a folder tree.

| Feature                       | How to use                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| **Collapse / expand folders** | Click the folder header row                                                          |
| **Sort files**                | Use the sort dropdown: Name A–Z, Name Z–A, Date (newest first), Size (largest first) |
| **File metadata**             | Each file shows its type badge, size, and last-modified date                         |

---

### 4.4 Deleting Documents

- Click on `Knowledge Base` in the sidebar to open the document manager.
- Click the **trash icon** on any file row.
- A confirmation modal asks you to confirm before the file is removed.
- After deletion:
  - The file is soft-deleted from the vector index (marked as deleted, not physically removed from disk).
  - The document list refreshes immediately.
  - The AI will no longer find this document in future searches.

> **To permanently remove the file** from disk, delete it from the `docs/` folder directly.

---

## 5. Working with Documents

### When to use Chat attachments vs. Knowledge Base

| Scenario                                                    | Best approach                                              |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| You have a document you want to ask about **once**          | Attach it directly in the chat message                     |
| You want to ask about the same document **repeatedly**      | Add it to the Knowledge Base                               |
| You want the AI to **synthesise across multiple documents** | Add all of them to the Knowledge Base                      |
| You're uploading a **PDF**                                  | Knowledge Base only (chat attachments don't support PDF)   |
| You want the AI to **see an image**                         | Chat attachment only (Knowledge Base doesn't index images) |

### Recommended Knowledge Base organisation

The ingestion pipeline preserves file paths, so organising your `docs/` folder in meaningful subfolders gives you better source citations:

```
docs/
  Research/
    paper-a.pdf
    paper-b.pdf
  Manuals/
    product-manual.pdf
  Notes/
    meeting-notes.md
```

Citations in the Context sidebar will then appear as `Research > paper-a.pdf` rather than a flat filename.

---

## 6. Power-User Tips

### Get better answers

- **Be specific.** Instead of "tell me about the report", ask "What were the key recommendations in section 3 of the Q1 report?"
- **Mention the document.** If you have many files indexed, naming the document in your question helps the AI focus: "According to the architecture diagram PDF, what is the data flow between service A and B?"
- **Ask follow-up questions.** The AI maintains conversation context within a session, so you can build on previous answers.
- **Check the Context sidebar.** If an answer seems wrong, the sidebar tells you exactly which chunks the AI used. If the right document isn't listed, the file may not be indexed — re-check the Knowledge Base.

### Manage your history

- Sessions are auto-saved after every message exchange.
- Old sessions are searchable by scrolling the history panel.
- Delete sessions you no longer need to keep the list tidy.
- Each session stores the full message history including attachment thumbnails.

### Use the suggestion cards strategically

- When you load a new knowledge base prepared by someone else, click the suggestion cards to get an instant orientation of what topics are available.
- The cards are regenerated every five minutes, so after a major ingestion they will reflect the new content if you refresh.

### Keyboard workflow

| Shortcut        | Action                                                                       |
| --------------- | ---------------------------------------------------------------------------- |
| `Enter`         | Send message                                                                 |
| `Shift + Enter` | New line in message                                                          |
| `Tab`           | Move focus between interactive elements (full keyboard navigation supported) |

### Dark / Light mode

Toggle at any time using the sun/moon button in the top-right header. The preference takes effect instantly and is applied for the current session.

---

## 7. FAQ

**Q: Does anything get sent to the internet?**
No. Every component — the LLM, the embedding model, the vector store, the database — runs locally on your machine. No data leaves your computer.

---

**Q: What happens if I close the app mid-ingestion?**
The ingestion workflow is durable (powered by DBOS). When you restart the app, the workflow will automatically resume from the last completed step. You will not lose progress or have to re-upload.

---

**Q: Why isn't the AI finding my document?**
Work through this checklist:

1. Open the Knowledge Base view and confirm the file appears in the document list.
2. If it's missing, upload it and wait for the ingestion pipeline to complete all four steps.
3. If it's listed but the AI still misses it, try re-phrasing your question — semantic search matches meaning, not exact keywords.
4. Check the Context sidebar after your question to see which sources were actually used.

---

**Q: Can I chat about a PDF without adding it to the Knowledge Base?**
Not directly. PDFs must be indexed through the Knowledge Base. For one-off text files, use the chat attachment feature instead.

---

**Q: How many documents can I index?**
There is no hard limit enforced by the app. Performance of the FAISS search will degrade gracefully as the index grows. For very large collections (thousands of large PDFs), consider grouping questions by topic and keeping the most relevant documents in separate `docs/` subfolders.

---

**Q: Can I ask questions that aren't about my documents?**
Yes. The AI also has access to a calculator tool and a real-time clock tool. For questions unrelated to your documents, it will answer from its general training knowledge — it only searches the knowledge base when the question warrants it.

---

**Q: What is the "Save to KB" card that appears after sending a file?**
When you attach a text file in chat, the app offers to permanently index it into the Knowledge Base(KB) so you can continue querying it in future sessions. Click **Add to KB** to accept, or **✕** to skip. The file will then appear in the Knowledge Base view after the ingestion completes.

---

**Q: Why do the suggestion cards show generic questions instead of ones about my documents?**
The knowledge base is empty or no documents have been successfully indexed yet. Upload and sync your documents (see §4) and the next time the cards refresh (on page load or after five minutes) they will reflect your actual content.

---

**Q: Can I change the AI model?**
Yes. Edit the `LLM_MODEL` and `EMBEDDING_MODEL` values in your `.env` file, then restart the app. Make sure the model is pulled in Ollama first (`ollama pull <model-name>`). The embedding model change requires re-indexing all documents since embeddings are model-specific.

---

**Q: How do I completely reset the knowledge base?**
Delete the `vector_store.faiss` and `vector_store.json` files in the project root, and remove the files in `docs/`. Restart the app and re-upload your documents.

---

**Q: The history panel is hidden on my screen — where is it?**
The history toggle button is hidden on narrow viewports (small screens). It is visible at `sm:` breakpoint and above. On a very narrow window, widen the browser or use a larger display.

---

_This guide covers the app as of May 2026, including the suggestion cards feature. Feel free to delete it once you're comfortable with the app._
