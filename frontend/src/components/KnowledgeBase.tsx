import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Paperclip, Loader2, Database, Download, Copy, Check, History, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tooltip } from './Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

interface ContextItem {
  title: string;
  type: string;
  path: string;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

export function KnowledgeBase() {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch('/api/history');
      if (!res.ok) return [];
      const data = await res.json();
      if (data && data.length > 0) {
        if (!data[0].id || data[0].role) {
          return [{ id: 'legacy-1', title: 'Previous Chat', updatedAt: Date.now(), messages: data }];
        }
        return data.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
      }
      return [];
    }
  });

  const saveHistoryMutation = useMutation({
    mutationFn: async (newSessions: ChatSession[]) => {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSessions)
      });
    }
  });

  // Auto-select first session if none active
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const updateSessionMessages = (sessionId: string, updater: (prev: Message[]) => Message[]) => {
    queryClient.setQueryData<ChatSession[]>(['history'], (old = []) => {
      const next = old.map(s => s.id === sessionId ? { ...s, messages: updater(s.messages), updatedAt: Date.now() } : s);
      saveHistoryMutation.mutate(next);
      return next;
    });
  };

  const handleExportMessage = (content: string, id: string) => {
    const md = `**Gemma CogniVault AI**\n\n${content}\n`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CogniVault_Response_${id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: currentSessionId,
        title: userMessage.length > 25 ? userMessage.substring(0, 25) + "..." : userMessage,
        updatedAt: Date.now(),
        messages: []
      };
      queryClient.setQueryData<ChatSession[]>(['history'], (old = []) => {
        const next = [newSession, ...old];
        saveHistoryMutation.mutate(next);
        return next;
      });
      setActiveSessionId(currentSessionId);
    }

    const newMsgId = Date.now().toString();
    updateSessionMessages(currentSessionId, prev => [...prev, { id: newMsgId, role: 'user', content: userMessage }]);

    try {
      const res = await fetch(`/rag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage })
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      const aiMsgId = Date.now().toString() + "-ai";
      updateSessionMessages(currentSessionId, prev => [...prev, { id: aiMsgId, role: 'ai', content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        if (buffer.includes("Metadata: ")) {
          const lines = buffer.split("\n");
          buffer = ""; 
          for (let line of lines) {
            if (line.trim().startsWith("Metadata: ")) {
              try {
                const metaStr = line.trim().replace("Metadata: ", "");
                const meta = JSON.parse(metaStr);
                const path = meta.source.includes(' > ') ? meta.source.split(' > ').slice(0, 2).join(' > ') : "Documents > Uploads";
                const title = meta.source.includes(' > ') ? meta.source.split(' > ').pop() : meta.source;
                
                setContextItems(prev => {
                  if (prev.some(item => item.title === title)) return prev;
                  return [...prev, { title, type: meta.type, path }];
                });
              } catch (e) { console.error("Metadata parse error", e); }
            } else {
              buffer += line + (lines.length > 1 ? "\n" : "");
            }
          }
        }

        if (buffer) {
          fullText += buffer;
          buffer = "";
          updateSessionMessages(currentSessionId, prev => 
            prev.map(msg => msg.id === aiMsgId ? { ...msg, content: fullText } : msg)
          );
        }
      }
    } catch (e) {
      console.error(e);
      updateSessionMessages(currentSessionId, prev => [...prev, { id: Date.now().toString(), role: 'ai', content: "Error communicating with the knowledge base." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full relative">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4">
        
        {/* Header Bar — surface-container #1d2027 */}
        <div className="flex items-center justify-between bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-4 shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff] flex items-center justify-center border border-[#c2c6d6] dark:border-[#424754]">
               <Bot size={24} />
             </div>
             <div>
               <h2 className="text-lg font-bold text-[#191c1e] dark:text-[#e1e2ec] tracking-tight">Gemma CogniVault AI</h2>
               <p className="text-sm text-[#424754] dark:text-[#8c909f] font-medium">{activeSession?.title || 'New Conversation'}</p>
             </div>
          </div>
          <div className="flex items-center gap-3 pr-2">
             <Tooltip content="Start a fresh conversation" position="bottom">
               <button 
                  onClick={() => { setActiveSessionId(null); setContextItems([]); }} 
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-[#191c1e] dark:text-[#c2c6d6] font-medium transition-colors"
                >
                  <Plus size={18} /> New Chat
               </button>
             </Tooltip>
             <Tooltip content={isHistoryOpen ? 'Hide chat history' : 'Browse past sessions'} position="bottom">
               <button 
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)} 
                  className={`p-2.5 rounded-xl transition-colors ${isHistoryOpen ? 'bg-[#a855f7] text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]' : 'bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-[#191c1e] dark:text-[#c2c6d6]'}`}
                >
                  <History size={20} />
               </button>
             </Tooltip>
          </div>
        </div>

        {/* Messages — surface-container-low #191b23 */}
        <div className="flex-1 overflow-y-auto rounded-2xl bg-[#f2f4f6] dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] p-6 transition-colors duration-300 relative">
          
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60">
              <div className="w-16 h-16 rounded-2xl bg-[#d0e1fb] dark:bg-[#32353c] border border-[#c2c6d6] dark:border-[#424754] flex items-center justify-center mb-6">
                <Bot size={32} className="text-[#0058be] dark:text-[#adc6ff]" />
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-[#191c1e] dark:text-[#e1e2ec]">How can I assist you today?</h3>
              <p className="text-base text-[#424754] dark:text-[#8c909f] text-center max-w-sm">
                Ask me anything about your uploaded documents. I will search the knowledge base and synthesize an answer.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1
                      ${msg.role === 'user'
                        ? 'bg-[#a855f7] text-white'
                        : 'bg-[#d0e1fb] text-[#0058be] border border-[#c2c6d6] dark:bg-[#32353c] dark:text-[#adc6ff] dark:border-[#424754]'
                      }`}
                    >
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>

                    {/* Bubble Container */}
                    <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`w-fit rounded-2xl p-5 text-base leading-relaxed
                        ${msg.role === 'user'
                          ? 'bg-[#a855f7] text-white rounded-tr-sm shadow-[0_4px_20px_rgba(168,85,247,0.3)]'
                          : 'bg-white text-[#191c1e] border border-[#c2c6d6] dark:bg-[#1d2027] dark:text-[#e1e2ec] dark:border-[#424754] rounded-tl-sm'
                        }`}
                      >
                        {msg.role === 'ai' && !msg.content && isLoading ? (
                          <div className="flex items-center gap-1 h-6">
                            <motion.div className="w-2 h-2 rounded-full bg-[#a855f7]" animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                            <motion.div className="w-2 h-2 rounded-full bg-[#a855f7]" animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }} />
                            <motion.div className="w-2 h-2 rounded-full bg-[#a855f7]" animate={{ y: [0,-5,0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                          </div>
                        ) : (
                          <div
                            className="prose prose-slate dark:prose-invert prose-p:leading-relaxed prose-pre:bg-[#eceef0] dark:prose-pre:bg-[#0b0e15] prose-pre:border prose-pre:border-[#c2c6d6] dark:prose-pre:border-[#424754] max-w-none"
                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                          />
                        )}
                      </div>

                      {/* AI Actions */}
                      {msg.role === 'ai' && msg.content && (
                        <div className="flex items-center gap-4 mt-1 self-center">
                          <Tooltip content={copiedId === msg.id ? 'Copied to clipboard!' : 'Copy response to clipboard'} position="top">
                            <button
                              onClick={() => handleCopyMessage(msg.content, msg.id)}
                              className="flex items-center gap-1.5 text-xs font-medium text-[#727785] dark:text-[#8c909f] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] transition-colors"
                            >
                              {copiedId === msg.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              {copiedId === msg.id ? 'Copied' : 'Copy'}
                            </button>
                          </Tooltip>
                          <Tooltip content="Export this response as a Markdown file" position="top">
                            <button
                              onClick={() => handleExportMessage(msg.content, msg.id)}
                              className="flex items-center gap-1.5 text-xs font-medium text-[#727785] dark:text-[#8c909f] hover:text-[#0058be] dark:hover:text-[#adc6ff] transition-colors"
                            >
                              <Download size={14} /> Export
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message Gemma CogniVault..."
            className="w-full bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-full py-5 pl-14 pr-16 text-lg text-[#191c1e] dark:text-[#e1e2ec] placeholder-[#727785] dark:placeholder-[#8c909f] focus:outline-none focus:border-[#0058be] dark:focus:border-[#a855f7] focus:ring-2 focus:ring-[#0058be]/20 dark:focus:ring-[#a855f7]/20 transition-all"
          />

          {/* Send — centered right */}
          <div className="absolute right-0 h-full flex items-center pr-2">
            <Tooltip content={isLoading ? 'Generating response...' : 'Send message'} position="top">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#e0e3e5] dark:disabled:bg-[#3d2f4b] disabled:text-[#727785] dark:disabled:text-[#988d9f] text-white flex items-center justify-center transition-all hover:shadow-[0_0_16px_rgba(168,85,247,0.5)] active:scale-95"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Context Sidebar */}
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

      {/* History Sidebar */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-[#c2c6d6] dark:border-[#424754] bg-[#f2f4f6] dark:bg-[#191b23] flex flex-col overflow-hidden transition-colors duration-300"
          >
            <div className="p-6 border-b border-[#c2c6d6] dark:border-[#424754] flex items-center gap-2">
              <History size={16} className="text-[#0058be] dark:text-[#adc6ff]" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">Chat History</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => { setActiveSessionId(s.id); setContextItems([]); }}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    activeSessionId === s.id
                      ? 'bg-white dark:bg-[#272a31] border-[#a855f7] dark:border-[#a855f7]'
                      : 'bg-transparent border-transparent hover:bg-[#e0e3e5] dark:hover:bg-[#272a31]'}`}
                >
                  <h4 className="font-medium text-[#191c1e] dark:text-[#e1e2ec] truncate">{s.title}</h4>
                  <p className="text-xs text-[#727785] dark:text-[#8c909f] mt-1.5">{new Date(s.updatedAt).toLocaleDateString()} {new Date(s.updatedAt).toLocaleTimeString()}</p>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 opacity-50">
                  <History size={24} className="mb-2 text-[#8c909f]" />
                  <p className="text-sm text-center text-[#8c909f]">No past sessions</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
