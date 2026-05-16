# Gemma CogniVault - Development Guidelines & Rules

This document serves as a persistent reference for all future development on this project. When carrying out new tasks, always adhere to the following rules to maintain architectural integrity and consistency.

## 1. State Management (TanStack Query)
- **Rule**: NEVER use raw `fetch()` coupled with `useState`/`useEffect` for server state.
- **Why**: We migrated the application to `@tanstack/react-query` to eliminate race conditions, manual syncing, and memory leaks.
- **Action**: Always use `useQuery` for fetching data and `useMutation` for modifying data. Use `queryClient.setQueryData` for optimistic UI updates.

## 2. API Routes & FastAPI
- **Rule**: All backend routes must return valid JSON responses, never raw strings.
- **Rule**: Use explicit Pydantic models or `typing` (e.g., `List[Any]`, `Dict[str, Any]`) in route definitions to prevent `422 Unprocessable Content` errors from strict validation.
- **Rule**: If returning a streaming response (like the `/rag` endpoint), ensure the frontend handles chunked decoding properly without crashing on empty buffers.

## 3. Storage & Deletion
- **Rule**: NEVER attempt to delete individual vectors directly from `IndexFlatIP` in FAISS.
- **Why**: Flat indexes do not support precise ID deletion without rebuilding the entire index, which is computationally expensive.
- **Action**: Use the **Soft Delete** pattern. Delete the physical file, mark the metadata chunk as `"deleted": true` in `vector_store.json`, and filter it out during RAG retrieval (`if m.get("deleted"): continue`).

## 4. DBOS Workflows
- **Rule**: All heavy, asynchronous, or multi-step ingestion tasks MUST be wrapped in DBOS workflows.
- **Why**: This guarantees crash resistance. If the server goes down, DBOS will resume exactly where it left off.
- **Action**: Do not write manual polling loops (`setInterval`) on the frontend to check DBOS status. Rely on TanStack Query's `refetchInterval` with a stop condition.

## 5. Frontend UI/UX
- **Rule**: All UI additions must adhere to the premium design language (Tailwind CSS v4 + Framer Motion).
- **Rule**: Support both Light and Dark modes. Always test text legibility and border contrast in both modes using the `dark:` variant prefix.
- **Rule**: Never use ugly `window.alert` or native `console.error` that breaks the UX. Fail silently or use graceful UI error states.

## 6. History & Persistence
- **Rule**: The chat interface is now **Multi-Session**. 
- **Action**: Never overwrite the entire `chat_history.json` with a single array of messages. The format must always be an array of `ChatSession` objects to preserve all threads.
