
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { getChatResponseStream } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
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
        let fullReasoning = "";
        let currentTool = "";
        for await (const chunk of stream) {
          const c = chunk as any;
          if (c.tool) currentTool = c.tool;
          else if (c.doneTool) currentTool = "";
          
          if (c.reasoning) fullReasoning += c.reasoning;
          if (c.text) fullText += c.text;

          setMessages(prev => 
            prev.map(m => m.id === aiMsgId ? { 
                ...m, 
                tool: currentTool || undefined,
                reasoning: fullReasoning,
                text: fullText 
            } : m)
          );
        }
    } catch (error: any) {
        console.error("Chat error", error);
        setIsLoading(false);
        
        let errorMessage = 'I encountered an error. Please check your API keys in Settings! ⚠️';
        const errorStr = JSON.stringify(error);
        
        if (errorStr.includes('429') || error?.status === 429 || error?.message?.includes('429')) {
            errorMessage = 'Quota exceeded! 🚨 The free AI limit has been reached. Please wait a moment or add your own API Key in Settings to continue studying without limits. 📚✨';
        } else if (error?.message) {
            errorMessage = `⚠️ ${error.message}`;
        }

        setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'model' && !lastMsg.text && !lastMsg.tool) {
                // Replace the empty loading message with the error
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: errorMessage } : m);
            }
            return [...prev, { 
                id: Date.now().toString(), 
                role: 'model', 
                text: errorMessage, 
                timestamp: Date.now() 
            }];
        });
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
        className="flex-1 overflow-y-auto space-y-4 pr-1 pb-24 no-scrollbar pt-2"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[96%] rounded-[24px] px-4 py-3 text-[14px] leading-relaxed shadow-sm overflow-hidden ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-sm shadow-cyan-900/20'
                  : 'bg-[#1e293b] text-slate-200 rounded-bl-sm border border-white/5 shadow-black/20 w-full'
              }`}
            >
              {msg.role === 'model' ? (
                 <div className="prose prose-invert prose-sm max-w-none break-words overflow-hidden">
                     {(() => {
                         let displayReasoning = msg.reasoning || "";
                         let displayText = msg.text || "";

                         const thinkMatch = displayText.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                         if (thinkMatch) {
                             displayReasoning += (displayReasoning ? "\n" : "") + thinkMatch[1];
                             displayText = displayText.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "").trim();
                         }

                         const isCurrentStreaming = isStreaming && msg.id === messages[messages.length - 1].id;

                         return (
                             <>
                                 {msg.tool && (
                                     <div className="flex items-center gap-2 text-cyan-400 mb-2 text-[10px] font-bold uppercase tracking-wider bg-cyan-950/30 px-3 py-1.5 rounded-full w-fit border border-cyan-500/20">
                                         <Loader2 size={10} className="animate-spin" />
                                         {msg.tool}...
                                     </div>
                                 )}
                                 
                                 {isCurrentStreaming && displayReasoning && (
                                     <div className="mb-4 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-slate-400 text-xs">
                                         <div className="flex items-center gap-2 mb-2 text-cyan-500 font-bold text-[10px] uppercase tracking-wider">
                                             <Sparkles size={12} className="animate-pulse" />
                                             Thinking Process...
                                         </div>
                                         <div className="whitespace-pre-wrap opacity-80 max-h-40 overflow-y-auto no-scrollbar font-mono text-[10px]">
                                             {displayReasoning}
                                         </div>
                                     </div>
                                 )}

                                 {displayText && (
                                     <div className="overflow-x-auto no-scrollbar">
                                         <ReactMarkdown 
                                            remarkPlugins={[remarkMath, remarkGfm]} 
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                table: ({node, ...props}) => (
                                                    <div className="my-4 w-full overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                                                        <table className="min-w-full divide-y divide-white/10 text-[12px]" {...props} />
                                                    </div>
                                                ),
                                                thead: ({node, ...props}) => <thead className="bg-white/5" {...props} />,
                                                th: ({node, ...props}) => <th className="px-3 py-2 text-left font-bold text-cyan-400 uppercase tracking-wider border-b border-white/10 whitespace-nowrap" {...props} />,
                                                td: ({node, ...props}) => <td className="px-3 py-2 text-slate-300 border-b border-white/5 last:border-0 min-w-[100px]" {...props} />,
                                                code: ({node, inline, ...props}: any) => (
                                                    inline 
                                                        ? <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 text-[12px]" {...props} />
                                                        : <span className="block my-4 overflow-x-auto rounded-xl bg-black/40 p-4 border border-white/5">
                                                            <code className="text-[12px] block" {...props} />
                                                          </span>
                                                )
                                            }}
                                         >
                                            {displayText}
                                         </ReactMarkdown>
                                     </div>
                                 )}
                                 
                                 {!displayText && !msg.tool && !displayReasoning && (
                                    <div className="flex gap-1.5 py-2 items-center">
                                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                                    </div>
                                 )}
                             </>
                         );
                     })()}
                 </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
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
      <div className="flex-shrink-0 bg-[#0b1221] pt-3 pb-4 absolute bottom-0 left-0 right-0 z-10">
          <div className="flex items-center gap-2 max-w-md mx-auto relative px-2">
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
