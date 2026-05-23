/**
 * Extract H2/H3 headings from lesson Markdown and produce stable slugs
 * for in-page anchor navigation.
 *
 * We slug from the visible text so the TOC labels match what the user sees.
 * Duplicate slugs get numeric suffixes (`intro`, `intro-2`, …) so every
 * anchor resolves to a unique target.
 */

export interface TocHeading {
  level: 2 | 3;
  text: string;
  slug: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function parseTocHeadings(markdown: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const seen = new Set<string>();

  for (const line of markdown.split("\n")) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length as 2 | 3;
    // Strip markdown emphasis/inline-code marks so slug + label are clean.
    const text = m[2].trim().replace(/[`*_]/g, "");
    const base = slugify(text);
    let slug = base;
    let n = 2;
    while (seen.has(slug)) slug = `${base}-${n++}`;
    seen.add(slug);
    headings.push({ level, text, slug });
  }
  return headings;
}
