import { Filter } from "lucide-react";

export function ScopeFilterBadge({
  scopeFilter,
  scopeLabel,
}: {
  scopeFilter: string[];
  scopeLabel?: string;
}) {
  const label =
    scopeLabel ??
    (scopeFilter.length === 1 ? scopeFilter[0] : `${scopeFilter.length} documents`);
  return (
    <div className="flex items-center justify-end">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#a855f7]/15 border border-[#a855f7]/30 text-[#a855f7] dark:text-[#ddb7ff]">
        <Filter size={9} />
        {label}
      </span>
    </div>
  );
}
