# CogniVault — Design Rules

The standards every screen follows. The goal is an interface that an older
user, or someone with low vision, can use comfortably. When in doubt: **bigger,
stronger contrast, more breathing room.**

These rules are enforced by convention in components plus the semantic text
classes defined in `src/index.css`. Update the values in one place; the whole
app follows.

---

## 1. Text colour — use semantic classes, never inline grays

❌ Don't: `className="text-[#727785] dark:text-[#8c909f]"`
✅ Do: `className="text-ink-muted"`

| Class | Use for | Contrast |
| --- | --- | --- |
| `text-ink-strong` | Titles, headline numbers, key labels | ≥ 7:1 (AAA) |
| `text-ink` | Default reading text | ≥ 7:1 (AAA) |
| `text-ink-muted` | Secondary text that must stay clearly legible | ≥ 7:1 (AAA) |
| `text-ink-faint` | Tertiary only — timestamps, legends, hints | ≥ 4.5:1 (AA) |

The old faded grays (`#727785`, `#8c909f`) sat at ~4.7:1 and were often used at
10–11px — **banned for important text.** `text-ink-faint` is the lightest you
may go, and only for genuinely non-essential text at ≥ 12px.

Accent colours (purple `#a855f7`, emerald, amber) are fine for icons, bars, and
emphasis, but never as the colour of a paragraph the user must read.

---

## 2. Type scale — minimum sizes

Never render essential text below **12px**. Body copy is **14px** minimum.

| Role | Tailwind | Size |
| --- | --- | --- |
| Page title (h1) | `text-4xl sm:text-5xl font-extrabold` | 36–48px |
| Section heading (h2) | `text-lg sm:text-xl font-bold` | 18–20px |
| Card headline number | `text-3xl font-bold` | 30px |
| Card / control label | `text-xs font-semibold` (uppercase ok) | 12px |
| Body / secondary | `text-sm` | 14px |
| Tertiary (timestamps) | `text-xs` | 12px |

❌ Banned: `text-[10px]`, `text-[11px]`, and `text-xs` for multi-line body copy.

---

## 3. Spacing — let it breathe

- Page section rhythm: `space-y-10` (was `space-y-8`).
- Card padding: `p-6` (was `p-5`).
- Section header → content gap: `mb-4`.
- Group related controls with `gap-3`+; don't crowd.

---

## 4. State colour conventions

- **Earned / success / complete → emerald.** Earned achievement cards,
  completed progress bars, success toasts. Makes "done" instantly scannable.
- **In-progress / interactive accent → purple** (`#a855f7`).
- **Attention / streak → amber.**
- **Locked / inactive → neutral surface + dimmed**, never coloured.

---

## 5. Accessibility baseline

- Respect `prefers-reduced-motion` (already global in `index.css`).
- Every icon-only button has an `aria-label`.
- Interactive targets ≥ 32px hit area.
- Don't encode meaning in colour alone — pair with text/icon (e.g. earned badge
  has emerald border **and** a check; locked has a lock icon).
- Modals close on Esc + backdrop, and lock body scroll.

---

## 6. Rollout status

- ✅ Foundation (semantic classes) — `src/index.css`
- ✅ Dashboard (`components/dashboard/`) — reference implementation
- ✅ Chat (`KnowledgeBase`, `components/chat/`, `components/knowledgeBase/`)
- ✅ Knowledge Base (`KnowledgeSync`, `components/knowledgeSync/`, `VaultAudit`, `CategoryModal`)
- ✅ Study Hub (`components/study/`) — incl. ModeCard redesign (icon-left + bigger title)
- ✅ Shared (Sidebar, ConfirmationModal, ContextSidebar, HistorySidebar, DocScopeFilter, Breadcrumbs, SuggestionCards, ErrorBoundary, Tooltip)

**Rollout complete** — every surface uses the semantic `text-ink-*` system. Only legitimate `placeholder:`/`disabled:` states retain literal grays. Keep new components on the system from the start.
