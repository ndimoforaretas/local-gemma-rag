import { Send, Paperclip, Loader2 } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ input, isLoading, onInputChange, onSend }: ChatInputProps) {
  return (
    <div className="relative flex items-center">
      {/* Attachment — centered left */}
      <div className="absolute left-0 h-full flex items-center pl-4">
        <Tooltip content="Attach a file" position="top">
          <button className="w-8 h-8 flex items-center justify-center rounded-full text-[#727785] dark:text-[#988d9f] hover:text-[#0058be] dark:hover:text-[#ddb7ff] hover:bg-[#d0e1fb] dark:hover:bg-[#3d2f4b] transition-all">
            <Paperclip size={18} />
          </button>
        </Tooltip>
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSend()}
        placeholder="Message Gemma CogniVault..."
        className="w-full bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-full py-5 pl-14 pr-16 text-lg text-[#191c1e] dark:text-[#e1e2ec] placeholder-[#727785] dark:placeholder-[#8c909f] focus:outline-none focus:border-[#0058be] dark:focus:border-[#a855f7] focus:ring-2 focus:ring-[#0058be]/20 dark:focus:ring-[#a855f7]/20 transition-all"
      />

      {/* Send — centered right */}
      <div className="absolute right-0 h-full flex items-center pr-2">
        <Tooltip content={isLoading ? 'Generating response...' : 'Send message'} position="top">
          <button
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#e0e3e5] dark:disabled:bg-[#3d2f4b] disabled:text-[#727785] dark:disabled:text-[#988d9f] text-white flex items-center justify-center transition-all hover:shadow-[0_0_16px_rgba(168,85,247,0.5)] active:scale-95"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
