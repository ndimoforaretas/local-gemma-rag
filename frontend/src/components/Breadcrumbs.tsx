/**
 * Shared breadcrumb trail.
 *
 * Each crumb is either clickable (a previous level the user can jump back
 * to) or non-clickable (the current page — rendered bolder so the eye
 * lands on it). Use across modes that have meaningful navigation depth
 * (Study Hub modes are the main consumers right now).
 */

import { Fragment } from "react";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  /** Omit on the last (current) crumb so it's rendered as a non-interactive label. */
  onClick?: () => void;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      className="flex items-center flex-wrap gap-1.5 text-sm min-w-0"
      aria-label="Breadcrumb"
    >
      {crumbs.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <ChevronRight
              size={14}
              className="text-[#727785] dark:text-[#8c909f] shrink-0"
              aria-hidden="true"
            />
          )}
          {crumb.onClick ? (
            <button
              type="button"
              onClick={crumb.onClick}
              className="text-[#424754] dark:text-[#c2c6d6] hover:text-[#a855f7] dark:hover:text-[#ddb7ff] transition-colors truncate max-w-xs"
              title={crumb.label}
            >
              {crumb.label}
            </button>
          ) : (
            <span
              className="text-[#191c1e] dark:text-white font-semibold truncate max-w-xs"
              aria-current="page"
              title={crumb.label}
            >
              {crumb.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
