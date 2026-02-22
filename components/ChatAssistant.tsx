
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { getChatResponseStream } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const ChatAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message only (No persistence)
  useEffect(() => {
    setMessages([
        { id: '1', role: 'model', text: 'Hey there! 👋 I\'m MUKTI AI, your study bestie. I\'m so ready to help you crush your goals today! What\'s on your mind? ☕️📚', timestamp: Date.now() }
    ]);
  }, []);

  // Robust scroll to bottom that handles rapid streaming updates
  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
            behavior: instant ? "auto" : "smooth",
            block: "end" 
        });
    }
  };

  // Scroll on new messages or during streaming
  useEffect(() => {
    scrollToBottom(isStreaming);
  }, [messages, isStreaming]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const stream = await getChatResponseStream(history, input);
        
        const aiMsgId = (Date.now() + 1).toString();
        const aiMsg: ChatMessage = {
            id: aiMsgId,
            role: 'model',
            text: '',
            timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, aiMsg]);
        setIsLoading(false); 
        setIsStreaming(true);

        let fullText = "";
        for await (const chunk of stream) {
          const chunkText = chunk.text;
          if (chunkText) {
            fullText += chunkText;
            setMessages(prev => 
              prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m)
            );
          }
        }
    } catch (error) {
        console.error("Chat error", error);
        setIsLoading(false);
    } finally {
        setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
      }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-4 pr-1 pb-6 no-scrollbar pt-2"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[88%] rounded-[24px] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-sm shadow-cyan-900/20'
                  : 'bg-[#1e293b] text-slate-200 rounded-bl-sm border border-white/5 shadow-black/20'
              }`}
            >
              {msg.role === 'model' ? (
                 <div className="prose prose-invert prose-sm max-w-none">
                     <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.text}</ReactMarkdown>
                     {!msg.text && (
                        <div className="flex gap-1.5 py-2 items-center">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                        </div>
                     )}
                 </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
            <span className="text-[10px] text-slate-600 mt-1.5 px-1 font-bold uppercase tracking-tighter opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        
        {isLoading && !isStreaming && (
             <div className="flex items-start animate-in fade-in duration-300">
                 <div className="bg-[#1e293b] rounded-[24px] rounded-bl-sm px-5 py-3 flex items-center gap-3 border border-white/5 shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        MUKTI is typing <Sparkles size={12} className="text-amber-400 animate-pulse" />
                    </span>
                 </div>
             </div>
        )}
        <div ref={messagesEndRef} className="h-4 w-full clear-both" />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-[#0b1221] pt-3 pb-4">
          <div className="flex items-center gap-2 max-w-md mx-auto relative">
                <div className="flex-1 bg-[#1e293b] rounded-[28px] border border-white/10 flex items-center px-5 py-1 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all shadow-xl">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Say hi to MUKTI..."
                        className="w-full bg-transparent text-white placeholder-slate-600 py-3.5 focus:outline-none text-[15px]"
                    />
                </div>
                <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="w-12 h-12 rounded-full bg-cyan-600 disabled:bg-[#1e293b] disabled:text-slate-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-cyan-900/30"
                >
                    <Send size={20} className={input.trim() ? "ml-0.5" : ""} />
                </button>
          </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
