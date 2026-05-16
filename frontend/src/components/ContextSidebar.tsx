import { motion, AnimatePresence } from 'framer-motion';
import { Database, FileText } from 'lucide-react';
import type { ContextItem } from '../types/api';

interface ContextSidebarProps {
  contextItems: ContextItem[];
}

export function ContextSidebar({ contextItems }: ContextSidebarProps) {
  return (
    <AnimatePresence>
      {contextItems.length > 0 && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l border-[#c2c6d6] dark:border-[#424754] bg-[#f2f4f6] dark:bg-[#191b23] flex flex-col overflow-hidden transition-colors duration-300"
        >
          <div className="p-6 border-b border-[#c2c6d6] dark:border-[#424754] flex items-center gap-2">
            <Database size={16} className="text-[#0058be] dark:text-[#adc6ff]" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">Context Used</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {contextItems.map((item, i) => (
              <motion.a
                key={i}
                href={`/static/docs/${item.title}`}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-xl p-4 flex flex-col gap-2 hover:border-[#a855f7] dark:hover:border-[#a855f7] cursor-pointer transition-all"
              >
                <div className="flex items-start gap-3">
                  <FileText size={16} className="text-[#0058be] dark:text-[#adc6ff] mt-0.5 shrink-0" />
                  <span className="text-base font-medium leading-tight text-[#191c1e] dark:text-[#e1e2ec] line-clamp-2">{item.title}</span>
                </div>
                <div className="text-sm text-[#727785] dark:text-[#8c909f] pl-7">{item.path}</div>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
