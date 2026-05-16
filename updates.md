# Gemma CogniVault - Updates & Additions Tracker

This file tracks the latest features, adjustments, and updates applied to the Gemma CogniVault project to maintain a clear history of enhancements.

## May 14, 2026 - UX & Feature Enhancements

### 1. TanStack Query Architecture Migration
- **Frontend State**: Completely eliminated all manual `fetch()`, `useState`, and `useEffect` API syncing logic in favor of `@tanstack/react-query`.
- **Chat History**: Chat sessions are now managed as smart, cached server state. Sending a message instantly uses a `useMutation` hook to optimistically update the UI cache while flawlessly synchronizing with the backend, completely eliminating race conditions.
- **Workflow Polling**: Removed dangerous `setInterval` polling loops in `KnowledgeSync.tsx`. Background document syncing is now natively handled by TanStack's `refetchInterval`, auto-polling the DBOS status endpoint only when active and automatically cleaning up on success.

### 2. Multi-Session Chat History
- **Frontend**: Upgraded the chat memory to support infinite unique threads. 
  - Automatically migrates your existing chat history into a "Legacy Chat" session so you don't lose past context.
  - Generates new chat IDs and titles automatically based on your first message.
  - Added a toggleable **History Sidebar** sliding in from the right to view, select, and switch between past conversations instantly.
  - Added a **New Chat** button to start fresh conversations without reloading the page.

### 3. File Deletion Functionality (Soft Delete)
- **Backend**: Implemented `DELETE /api/docs/{filename}` endpoint. Instead of forcing a 10-minute re-indexing of the entire FAISS vector database to delete a single file, the backend instantly deletes the physical PDF and marks the corresponding metadata chunks as `"deleted": true`.
- **RAG Engine**: Modified `local_rag.py` to intercept query results and perfectly ignore any matched vectors belonging to a deleted file. The file is instantly scrubbed from the AI's context.
- **Frontend**: Added a Trash icon to the file list in the Knowledge Base interface, triggering the backend deletion and instantly hiding the file from the UI.

### 4. Click-to-Open Citations
- **Backend**: Safely mounted the `docs/` directory via FastAPI's `StaticFiles` to serve raw PDF files locally.
- **Frontend**: Upgraded the Context Used sidebar cards to become clickable links. Clicking an AI citation now instantly opens the referenced PDF in a new browser tab.

### 5. Per-Message Actions (Copy & Export)
- **Frontend**: Removed the global chat export button and introduced message-specific actions. Underneath each AI response, there is now a centered action bar containing:
  - **Copy to Clipboard**: Instantly copies the AI's response to your clipboard with a smooth "Copied!" checkmark confirmation.
  - **Export**: Downloads the specific AI response as a formatted `.md` file for easy archiving or sharing.

### 6. AI Response Formatting Fixes
- **Frontend**: Reconfigured the `marked` library with `{ breaks: true, gfm: true }` to properly parse GitHub Flavored Markdown and preserve line breaks. The AI responses are no longer squished together into a single block of text and properly render bullet points and paragraphs.

## May 14, 2026 - Initial Frontend Migration

### Architectural Overhaul
- **Vite & React**: Replaced the monolithic vanilla HTML/JS setup with a fast, modular Vite + React + TypeScript application.
- **Tailwind CSS v4 & Framer Motion**: Upgraded styling to a utility-first approach with premium micro-animations and smooth layout transitions.
- **Light/Dark Mode**: Implemented a robust class-based theme toggle that seamlessly switches the UI between a crisp light mode and a sleek dark mode.
- **Knowledge Base Drill-Down**: Upgraded the Knowledge Sync view to dynamically list synced libraries and allow users to click into them to view individual files and sizes.
