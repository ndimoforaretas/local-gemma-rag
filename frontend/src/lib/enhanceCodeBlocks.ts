/**
 * Post-render enhancement for Markdown code blocks: syntax highlighting
 * (highlight.js, lazy-loaded with a curated language set) + a copy button and
 * language label on each block.
 *
 * Reusable across any rendered-Markdown container (lesson bodies, chat, …).
 * Idempotent: a block already enhanced (data-enhanced) is skipped, so it's
 * safe to re-run after re-renders.
 *
 * highlight.js core + ~16 common languages keeps the chunk lean (~40 KB gzip)
 * and stays off the initial bundle via dynamic import.
 */

let hljsPromise: Promise<typeof import("highlight.js/lib/core").default> | null = null;

async function loadHljs() {
  if (!hljsPromise) {
    hljsPromise = (async () => {
      const { default: hljs } = await import("highlight.js/lib/core");
      const langs: [string, () => Promise<{ default: unknown }>][] = [
        ["python", () => import("highlight.js/lib/languages/python")],
        ["javascript", () => import("highlight.js/lib/languages/javascript")],
        ["typescript", () => import("highlight.js/lib/languages/typescript")],
        ["bash", () => import("highlight.js/lib/languages/bash")],
        ["shell", () => import("highlight.js/lib/languages/shell")],
        ["json", () => import("highlight.js/lib/languages/json")],
        ["sql", () => import("highlight.js/lib/languages/sql")],
        ["xml", () => import("highlight.js/lib/languages/xml")], // html
        ["css", () => import("highlight.js/lib/languages/css")],
        ["markdown", () => import("highlight.js/lib/languages/markdown")],
        ["yaml", () => import("highlight.js/lib/languages/yaml")],
        ["go", () => import("highlight.js/lib/languages/go")],
        ["rust", () => import("highlight.js/lib/languages/rust")],
        ["java", () => import("highlight.js/lib/languages/java")],
        ["c", () => import("highlight.js/lib/languages/c")],
        ["cpp", () => import("highlight.js/lib/languages/cpp")],
      ];
      await Promise.all(
        langs.map(async ([name, load]) => {
          const mod = await load();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hljs.registerLanguage(name, mod.default as any);
        }),
      );
      hljs.registerAliases(["html"], { languageName: "xml" });
      hljs.registerAliases(["sh", "zsh"], { languageName: "bash" });
      hljs.registerAliases(["py"], { languageName: "python" });
      hljs.registerAliases(["ts"], { languageName: "typescript" });
      hljs.registerAliases(["js"], { languageName: "javascript" });
      return hljs;
    })();
  }
  return hljsPromise;
}

/** Pull the fenced language from the `language-xxx` class marked emits. */
function langFromClass(code: HTMLElement): string | null {
  const cls = [...code.classList].find((c) => c.startsWith("language-"));
  return cls ? cls.slice("language-".length).toLowerCase() : null;
}

/** Copy text via the async Clipboard API, falling back to execCommand for
 *  insecure contexts / missing user-activation. Returns true on success. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function buildCopyButton(getText: () => string, labels: CodeBlockLabels): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "code-copy-btn";
  btn.textContent = labels.copy;
  btn.setAttribute("aria-label", labels.copy);
  btn.addEventListener("click", async () => {
    const ok = await copyText(getText());
    btn.textContent = ok ? labels.copied : labels.failed;
    if (ok) btn.classList.add("is-copied");
    window.setTimeout(() => {
      btn.textContent = labels.copy;
      btn.classList.remove("is-copied");
    }, 1500);
  });
  return btn;
}

export interface CodeBlockLabels {
  copy: string;
  copied: string;
  failed: string;
}

/**
 * Highlight + add copy buttons to every `<pre><code>` inside `root`.
 * Lazy-loads highlight.js on first call; safe to await or fire-and-forget.
 */
export async function enhanceCodeBlocks(
  root: HTMLElement,
  labels: CodeBlockLabels,
): Promise<void> {
  const blocks = [...root.querySelectorAll<HTMLElement>("pre > code")].filter(
    (code) => !(code.parentElement as HTMLElement).dataset.enhanced,
  );
  if (!blocks.length) return;

  const hljs = await loadHljs();

  for (const code of blocks) {
    const pre = code.parentElement as HTMLElement;
    pre.dataset.enhanced = "1";
    pre.classList.add("code-block");

    const lang = langFromClass(code);
    if (lang && hljs.getLanguage(lang)) {
      code.innerHTML = hljs.highlight(code.textContent ?? "", { language: lang }).value;
    } else {
      const res = hljs.highlightAuto(code.textContent ?? "");
      code.innerHTML = res.value;
    }
    code.classList.add("hljs");

    const bar = document.createElement("div");
    bar.className = "code-block-bar";
    if (lang) {
      const tag = document.createElement("span");
      tag.className = "code-lang";
      tag.textContent = lang;
      bar.appendChild(tag);
    }
    bar.appendChild(buildCopyButton(() => code.textContent ?? "", labels));
    pre.appendChild(bar);
  }
}
