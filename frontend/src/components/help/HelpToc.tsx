/**
 * Sticky "on this page" nav for the Help section — jump to a FAQ group, with
 * the active group highlighted as you scroll. Desktop-only (hidden below xl).
 */

export function HelpToc({
  groups,
  active,
  onJump,
}: {
  groups: string[];
  active: string;
  onJump: (title: string) => void;
}) {
  return (
    <nav aria-label="Help sections" className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-ink-muted font-semibold px-3 mb-1.5">
        On this page
      </span>
      {groups.map((title) => {
        const isActive = active === title;
        return (
          <button
            key={title}
            type="button"
            onClick={() => onJump(title)}
            className={`text-left text-sm px-3 py-1.5 rounded-r-lg border-l-2 transition-colors ${
              isActive
                ? "border-[#a855f7] text-[#a855f7] dark:text-[#ddb7ff] font-semibold bg-[#a855f7]/5"
                : "border-transparent text-ink-muted hover:text-ink-strong hover:border-[#c2c6d6] dark:hover:border-[#424754]"
            }`}
          >
            {title}
          </button>
        );
      })}
    </nav>
  );
}
