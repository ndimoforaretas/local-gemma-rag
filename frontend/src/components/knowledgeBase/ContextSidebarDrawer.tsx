/**
 * Mobile (< lg) overlay drawer that surfaces the ContextSidebar from the
 * right side of the screen with a backdrop + slide-in animation. On
 * desktop the sidebar is rendered inline in the page layout instead.
 */

import { AnimatePresence, motion } from "framer-motion";
import { ContextSidebar } from "../ContextSidebar";
import type { ContextItem } from "../../types/api";

export interface ContextSidebarDrawerProps {
  isOpen: boolean;
  contextItems: ContextItem[];
  onClose: () => void;
}

export function ContextSidebarDrawer({
  isOpen,
  contextItems,
  onClose,
}: ContextSidebarDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && contextItems.length > 0 && (
        <motion.div
          className="absolute inset-0 z-50 lg:hidden flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="relative h-full flex"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <ContextSidebar
              contextItems={contextItems}
              onClose={onClose}
              isDrawer
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
