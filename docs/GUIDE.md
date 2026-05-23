# Gemma CogniVault — User Guide

> Your fully local AI study companion. This guide is pre-loaded into the knowledge base and powers the starter cards on a new chat.

---

## Table of Contents

1. [What CogniVault Does](#1-what-cognivault-does)
2. [The Interface](#2-the-interface)
3. [Chat — Full Reference](#3-chat--full-reference)
4. [Knowledge Base — Full Reference](#4-knowledge-base--full-reference)
5. [Study Hub](#5-study-hub)
6. [Progress Dashboard](#6-progress-dashboard)
7. [Achievements (25 badges)](#7-achievements-25-badges)
8. [Privacy & Data Storage](#8-privacy--data-storage)
9. [Tips & Tricks](#9-tips--tricks)
10. [FAQ](#10-faq)

---

## 1. What CogniVault Does

CogniVault is a **100% local, privacy-first AI study app**. Nothing leaves your machine — no API keys, no cloud calls, no usage fees.

It does four things well:

- **Chats with your documents.** Upload PDFs, Word docs, slides, spreadsheets, plain text, and ask questions. Every answer comes with citations.
- **Generates active study material.** Quizzes, multi-lesson workshops, flashcard decks, and visual mindmaps — all from your own documents.
- **Tracks your learning progress.** Total study time, streak, daily activity heatmap, and 25 achievement badges.
- **Stays out of your way.** Resume anywhere on refresh, export anything, delete everything — your data is just files on disk.

Under the hood: Ollama + Gemma 4 (LLM), `embeddinggemma` (embeddings), FAISS + BM25 (hybrid retrieval), DBOS (durable ingestion), SQLite (progress + study state), FastAPI backend, React + Vite frontend.

---

## 2. The Interface

The left sidebar has **four top-level sections**. The active section is highlighted in purple.

| Section | What it does |
|---|---|
| **Chat** | Conversational interface — ask anything about your documents. |
| **Knowledge Base** | Upload, categorise, and delete documents. |
| **Study Hub** | Generate quizzes, workshops, flashcards, mindmaps. |
| **Dashboard** | See your study time, achievements, and daily activity heatmap. |

Your current section persists across browser refreshes. Refresh inside Quiz Mode and you land back in Quiz Mode.

Inside the Study Hub, **breadcrumbs** at the top show your exact location (e.g. *Study Hub › Workshop Creator › Python Fundamentals › Lesson 2*). Every crumb except the current one is clickable to jump back to that level.

---

## 3. Chat — Full Reference

### Asking a question

Type into the composer at the bottom and press **Enter** to send. **Shift+Enter** inserts a newline.

The AI streams its response in real time. If thinking mode is on, a collapsible **Reasoning** panel above the answer shows the model's chain of thought.

### Attaching files to a single message

Click the **paperclip** icon in the composer to attach up to **5 files per message**:

- **Images** (PNG, JPEG, GIF, WebP) — the AI describes and analyses them visually.
- **Text-like files** (PDF, DOCX, TXT, MD, CSV, JSON, YAML, code) — content is extracted (~15K characters max per file) and appended to the prompt.

Chat attachments are **one-off** — they're not indexed into your Knowledge Base. Use the Knowledge Base for content you'll ask about repeatedly.

### Voice input

Click the **microphone** icon to dictate. Speech is transcribed locally and inserted into the composer; you can review and edit before sending.

### Scoping the chat to specific documents

Click the **filter pill** ("All documents ▾") just above the composer. Pick a category (everything inside) or individual files. The next message you send will search ONLY those documents.

- The active scope is **stamped on the user message** as a purple badge so you can see what was active when you asked.
- The pill clears after sending so the next message uses the full KB unless you re-scope.
- This scope also drives the **starter suggestion cards** on a new chat — anything clicked from the empty state is automatically scoped to this guide.

### Sources sidebar

The right panel shows **every chunk** the AI cited in its last answer. Each entry has:

- Source filename + page (when applicable)
- Relevance score
- **View chunk** — expand the exact text the AI saw
- **Open** — jump to the file in the Knowledge Base

### Chat history

The clock icon (top right) toggles the history sidebar. Every conversation is saved automatically; click any session to resume it. Use the trash icon to delete a session.

### Editing and regenerating

- **Edit a user message** → the AI re-answers with the edited text; later turns are discarded.
- **Regenerate an AI message** → the AI re-answers the same question (useful when the response felt off or you want a different angle).

### Saving a chat attachment to the Knowledge Base

When you attach a text-like file to a chat message, an **emerald "Save to Knowledge Base"** card appears next to the response. One click ingests the file into the KB for future questions.

---

## 4. Knowledge Base — Full Reference

### Supported file formats

| Format | Notes |
|---|---|
| **PDF** | Text-based and scanned (OCR fallback) |
| **DOCX** | Microsoft Word documents |
| **PPTX** | PowerPoint — one chunk per slide |
| **XLSX** | Excel — one chunk per sheet |
| **CSV** | Tabular data |
| **TXT / MD** | Plain text and Markdown |
| **HTML** | Web pages (you provide the file) |
| **JSON** | Structured data |

### Uploading

Drag files onto the upload zone, or use the picker. Ingestion runs as a **durable workflow** — if the app crashes mid-ingest, it resumes on restart from where it left off (no partially-indexed documents in your KB).

### Organising with categories

Each document can be tagged with a **category** (e.g. "Programming", "Recipes", "Work"). Categories show up as expandable folders in the document scope filter, so you can quickly limit a chat or quiz to one topic area.

To rename, recategorise, or delete a document, use the row actions in the Knowledge Base view.

### Deleting

Click the row's delete icon → confirm. The document's chunks are soft-deleted from the vector store and excluded from all future retrieval immediately.

### Updating a document

Re-uploading a file with the same name is currently skipped (filename-based dedup). To replace, **delete the old version first**, then upload the new one.

---

## 5. Study Hub

The Study Hub turns your documents into **active learning material**. Four modes — pick one from the mode picker.

All modes share three rules:

- **Scope is mandatory** — pick a category or specific files first. Whole-KB generation produces scattered, lower-quality results.
- **Generation runs locally** — first time takes 10–60 seconds depending on mode.
- **State is saved** — you can come back to any quiz, workshop, deck, or mindmap later.

### 5.1 Quiz Mode

Generates a quiz from your scoped documents.

**Configuration:** difficulty (Beginner / Intermediate / Advanced) · count (5 / 10 / 20) · question types (Multiple Choice / True-False, multi-select).

**Player:** one question at a time. Click an option, hit **Submit answer** for instant feedback (correct/incorrect + explanation), then **Next question**. Final screen shows score + per-question recap.

**Resume on refresh:** if you refresh mid-quiz, a purple banner offers to resume from where you left off. Saved for 24 hours.

**Export the finished quiz:** Markdown or PDF. Three content levels — *questions only* · *with answers* · *with answers & explanations*.

**Badges:** 🧠 First Quiz · 💯 Perfect Score · 🎖️ Advanced Scholar · 🏃 Quiz Marathon (10 quizzes).

### 5.2 Workshop Creator

Multi-lesson workshops built from your documents.

**Configuration:** difficulty + lesson count (5 or 10).

**Two-pass generation:**

1. **Outline first** (fast): title, summary, key points, learning objectives, lesson titles with reading-time estimates.
2. **Lessons on demand**: click a lesson card to generate just that lesson's full body. Each lesson is structured Markdown (Introduction · Core content · Key takeaways · Self-check) with a sticky right-side TOC.

Mark each lesson **Complete** when done. When every lesson is complete, a **Take recap quiz** CTA appears — auto-generates a 5-question quiz from the same scope + difficulty.

**Badges:** 📋 Workshop Outline · 📖 Lesson Learned · 🎓 Workshop Graduate · 📚 Workshop Marathon (5 workshops).

### 5.3 Flashcards

Scrollable decks of flip-cards for spaced review.

**Configuration:** difficulty + card count (10 / 20 / 40).

**The deck:** responsive grid of cards. **Click** any card to flip it (CSS 3D rotation reveals the answer). On the back, mark **Got it** (emerald) or **Review** (amber). Cards keep their status across visits.

**Filter chips** at the top let you cycle through *All · Unmarked · Review · Mastered* — useful for revisiting only the cards that still need work.

**Status-aware gradient borders** change colour with the card's state: purple→pink (unmarked), emerald→cyan (mastered), amber→rose (review).

**Each card flip counts toward your study time** (the 15-min idle gap rule applies).

**Badges:** 🃏 First Deck · 📇 Card Reviewer (50 flips) · 🎴 Deck Master (all cards mastered in one deck) · 🧩 Deck Collector (5 decks).

### 5.4 Mindmaps

Radial concept maps of your scoped material.

**Configuration:** just scope. Depth is fixed at 2 (root → themes → sub-topics).

**The map:** central root pill (purple-pink gradient), 4–6 themed branches around it, 2–4 sub-topics fanning out from each theme. **Drag** to pan, **scroll** to zoom (0.4× → 2.5×).

**Export buttons** in the header:

- **Markdown** — nested bulleted list. Opens a native Save As dialog (Chromium-based browsers).
- **Image (PNG)** — rasterised at 2400 px wide on a dark background. Same Save As dialog.
- **PDF** — opens the browser print dialog with the rendered image pre-filled.

**Badges:** 🗺️ Mind Mapper · 📐 Cartographer (first export) · 🌐 Concept Network (5 mindmaps).

---

## 6. Progress Dashboard

A standalone view (4th sidebar item) that visualises everything you've done.

### Summary cards (top)

| Card | Shows |
|---|---|
| **Total study time** | Cumulative seconds across chat + quizzes + workshops + flashcards |
| **Sessions** | How many distinct study sessions, plus total messages sent |
| **Current streak** | Consecutive days with any study activity |

### Achievements strip (middle)

Horizontally scrollable row of every badge. Earned badges show in full colour; locked badges are dimmed with a lock overlay. Hover any badge to see the description and (for earned ones) the date you unlocked it.

### Activity heatmap (bottom)

GitHub-style grid of the last **90 days** — 7 rows (Mon → Sun), 13 columns (one per week). Each cell is colour-coded by that day's total study duration:

| Cell | Duration |
|---|---|
| Empty | No activity |
| **Light purple** | < 15 min |
| **Medium purple** | 15–60 min |
| **Strong purple** | 1–3 h |
| **Solid purple** | 3 h+ |

**Click any cell** to open a modal with that day's details: total time, sessions, messages, and any achievements earned on that day.

---

## 7. Achievements (25 badges)

Auto-tracked. They appear in the Dashboard's Achievements strip as you earn them.

### Chat & Activity (10)

| Badge | How to earn |
|---|---|
| 🎯 First Question | Send your first chat message |
| 💬 Conversationalist | 10 messages in one day |
| 📚 Hour of Power | 1 hour total study time |
| 🔥 3-Day Streak | Study on 3 consecutive days |
| 🔥 7-Day Streak | Study on 7 consecutive days |
| 🏆 Centurion | 100 messages total |
| 🌙 Night Owl | Study between 10pm and 4am |
| ⏰ Early Bird | Study between 5am and 8am |
| 🔍 Curious Mind | Use the document scope filter for the first time |
| 🎓 Deep Diver | A single study session of 30 minutes or more |

### Quiz (4)

| Badge | How to earn |
|---|---|
| 🧠 First Quiz | Complete your first quiz |
| 💯 Perfect Score | Score 100% on any quiz |
| 🎖️ Advanced Scholar | Score ≥80% on an Advanced-level quiz |
| 🏃 Quiz Marathon | Complete 10 quizzes total |

### Workshop (4)

| Badge | How to earn |
|---|---|
| 📋 Workshop Outline | Generate your first workshop |
| 📖 Lesson Learned | Complete your first workshop lesson |
| 🎓 Workshop Graduate | Finish every lesson in a single workshop |
| 📚 Workshop Marathon | Complete 5 workshops |

### Flashcards (4)

| Badge | How to earn |
|---|---|
| 🃏 First Deck | Generate your first flashcard deck |
| 📇 Card Reviewer | Flip 50 flashcards total |
| 🎴 Deck Master | Mark every card in a single deck as mastered |
| 🧩 Deck Collector | Create 5 flashcard decks |

### Mindmaps (3)

| Badge | How to earn |
|---|---|
| 🗺️ Mind Mapper | Create your first mindmap |
| 📐 Cartographer | Export a mindmap (Markdown, PNG, or PDF) |
| 🌐 Concept Network | Create 5 mindmaps total |

---

## 8. Privacy & Data Storage

**Everything stays on your machine.** No network calls to any third-party AI service.

What's stored, and where:

| Data | Location |
|---|---|
| Uploaded documents | `docs/` |
| Vector embeddings + chunk metadata | `vector_store.faiss` + `vector_store.json` |
| Document categories | `categories.json` |
| Chat history | `chat_history.json` |
| Study sessions, quiz attempts, workshops, decks, mindmaps, achievements | `progress.db` (SQLite) |
| DBOS workflow state | local PostgreSQL |
| In-progress quiz (for resume-on-refresh) | browser `localStorage` |

To wipe a category of data: delete the corresponding file or table. Nothing else needs cleaning up — there are no telemetry pings, no remote backups, no analytics.

---

## 9. Tips & Tricks

- **Pin your scope before a quiz, workshop, or mindmap.** Whole-KB generation produces unfocused results; one category or one file gives the best quality.
- **Use the recap quiz at the end of a workshop.** Same scope + difficulty, tests exactly what you just learned — instant retention check.
- **Colour-coded flashcard borders** are the fastest way to scan a deck — emerald = mastered, amber = needs review, purple = untouched.
- **Click any heatmap day** to see exactly what you did — useful when you can't remember whether you actually studied yesterday.
- **The chat scope badge** on your sent messages is permanent history — you can always see what scope a past answer was based on.
- **Export anything.** Quizzes and mindmaps support Markdown; mindmaps also support PNG and PDF — great for sharing or printing.

---

## 10. FAQ

**Does CogniVault need an internet connection?**
Only once, to download the Gemma model via Ollama. After that, fully offline.

**How big can my Knowledge Base be?**
There's no hard limit. Hybrid retrieval (FAISS + BM25) keeps queries fast even at thousands of chunks. Larger KBs mean larger files on disk but performance scales well.

**Can I use my own model instead of Gemma 4?**
Yes — change `llm_model` and `embedding_model` in `backend/config.py` (or via env vars). Any Ollama-compatible model works.

**What if the AI generates something wrong?**
Every chat answer has citations in the right sidebar — open the source chunks to verify. For quizzes and mindmaps, the parser drops malformed items; if a quiz comes back with fewer questions than requested, narrow the scope and try again.

**Can I share a quiz, workshop, or mindmap?**
Yes — export as Markdown (works everywhere) or PDF. The recipient doesn't need CogniVault to read them.

**How do I back up my data?**
Copy these files: `docs/`, `vector_store.*`, `categories.json`, `chat_history.json`, `progress.db`. They're all local; back them up however you back up the rest of your machine.

**My quiz or mindmap generation failed — what now?**
The model returns malformed JSON occasionally. CogniVault uses Ollama's `format="json"` grammar constraint plus a JSON-repair fallback plus an automatic retry, but a busy or low-on-context model can still fail. Try a narrower scope or generate again — usually works the second time.

**Where do my badges live?**
In `progress.db`'s `achievements_earned` table. Deleting the file resets all your progress (but leaves your documents intact).
