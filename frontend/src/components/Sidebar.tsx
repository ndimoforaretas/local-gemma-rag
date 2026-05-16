import { Archive, MessageSquare, Database, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeView: 'chat' | 'sync';
  setActiveView: (view: 'chat' | 'sync') => void;
}

export function Sidebar({ activeView, setActiveView }: SidebarProps) {
  const navItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'sync', label: 'Knowledge Base', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    /* Dark: surface-container-low #191b23 | Light: #f2f4f6 */
    <div className="w-64 bg-[#f2f4f6] dark:bg-[#191b23] border-r border-[#c2c6d6] dark:border-[#424754] p-6 flex flex-col gap-8 transition-colors duration-300">

      {/* Logo */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-8 h-8 rounded-lg bg-[#a855f7] flex items-center justify-center text-white shadow-lg shadow-[#a855f7]/30">
          <Archive size={18} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#191c1e] dark:text-[#e1e2ec]">
          Gemma CogniVault
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        <div className="text-xs uppercase tracking-wider text-[#727785] dark:text-[#8c909f] font-semibold mb-2 px-3">
          Menu
        </div>

        {navItems.filter(item => item.id !== 'settings').map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as 'chat' | 'sync')}
            className={`
              relative flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all duration-200
              ${activeView === id
                ? 'text-[#191c1e] dark:text-[#e1e2ec]'
                : 'text-[#424754] dark:text-[#c2c6d6] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] hover:bg-[#e0e3e5] dark:hover:bg-[#272a31]'
              }
            `}
          >
            {activeView === id && (
              <motion.div
                layoutId="activeNavBackground"
                /* Active bg: surface-container-high with purple left-border feel */
                className="absolute inset-0 bg-[#e0e3e5] dark:bg-[#272a31] border border-[#c2c6d6] dark:border-[#424754] rounded-xl -z-10"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <Icon
              size={18}
              className={activeView === id ? 'text-[#a855f7]' : ''}
            />
            {label}
          </button>
        ))}
      </nav>

      {/* Settings */}
      <div className="flex flex-col gap-1">
        {navItems.filter(item => item.id === 'settings').map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {}}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-[#424754] dark:text-[#8c909f] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] hover:bg-[#e0e3e5] dark:hover:bg-[#272a31] transition-all duration-200"
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
