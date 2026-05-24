import type { IndexedDocument } from "../../types/api";

/**
 * Produce a human-readable label for the currently-active document scope
 * filter. Examples:
 *  - One full category selected → category name ("Lectures")
 *  - One single document selected → that filename
 *  - Anything else → "<N> documents"
 */
export function computeScopeLabel(
  filter: string[],
  docs: IndexedDocument[],
): string {
  if (filter.length === 0) return "";
  const grouped: Record<string, string[]> = {};
  for (const doc of docs) {
    const cat = doc.category ?? "General";
    (grouped[cat] ??= []).push(doc.name);
  }
  const categories = Object.keys(grouped);
  const fullCats = categories.filter(
    (c) =>
      grouped[c].every((n) => filter.includes(n)) &&
      grouped[c].some((n) => filter.includes(n)),
  );
  const hasPartial = categories.some(
    (c) =>
      grouped[c].some((n) => filter.includes(n)) &&
      !grouped[c].every((n) => filter.includes(n)),
  );
  if (
    fullCats.length === 1 &&
    !hasPartial &&
    grouped[fullCats[0]].length === filter.length
  ) {
    return fullCats[0];
  }
  if (filter.length === 1) return filter[0];
  return `${filter.length} documents`;
}
