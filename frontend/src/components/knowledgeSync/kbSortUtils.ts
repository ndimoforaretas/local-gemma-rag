import type { KBFile } from "../../types/api";

export type SortOption = "name-asc" | "name-desc" | "date-newest" | "size-largest";

export function getSortLabel(value: SortOption): string {
  switch (value) {
    case "name-asc": return "Name A-Z";
    case "name-desc": return "Name Z-A";
    case "date-newest": return "Date newest first";
    case "size-largest": return "File size largest first";
    default: return "Name A-Z";
  }
}

function parseSizeInBytes(size: string): number {
  const match = size.match(/^\s*([\d.]+)\s*([A-Za-z]+)\s*$/);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (Number.isNaN(value)) return 0;
  const unitMap: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  return value * (unitMap[unit] ?? 1);
}

function parseDate(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortFiles(files: KBFile[], option: SortOption): KBFile[] {
  const sorted = [...files];
  switch (option) {
    case "name-asc":
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      break;
    case "name-desc":
      sorted.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: "base" }));
      break;
    case "date-newest":
      sorted.sort((a, b) => parseDate(b.modified) - parseDate(a.modified));
      break;
    case "size-largest":
      sorted.sort((a, b) => parseSizeInBytes(b.size) - parseSizeInBytes(a.size));
      break;
  }
  return sorted;
}
