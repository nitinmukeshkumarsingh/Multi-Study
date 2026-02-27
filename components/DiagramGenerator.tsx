
import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Download, X, Network, ZoomIn, Loader2, Info, LayoutTemplate } from 'lucide-react';
import { generateDiagramCode } from '../services/geminiService';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter',
});

export const DiagramGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');

  const diagramRef = useRef<HTMLDivElement>(null);

  // Render Mermaid code whenever it changes and the ref is available
  useEffect(() => {
    if (mermaidCode && diagramRef.current) {
      const render = async () => {
        try {
          // Clear previous diagram
          diagramRef.current!.innerHTML = '';
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          
          // --- ROBUST SANITIZATION ---
          let sanitizedCode = mermaidCode;
          
          // 1. Ensure it starts with a valid type
          if (!sanitizedCode.trim().startsWith('graph') && !sanitizedCode.trim().startsWith('mindmap') && !sanitizedCode.trim().startsWith('sequenceDiagram')) {
            sanitizedCode = 'graph TD\n' + sanitizedCode;
          }

          // 2. Fix unquoted labels with special characters (especially parentheses)
          // This regex finds patterns like ID[Label with (parens)] or ID(Label with [brackets])
          // and ensures they are properly quoted if they aren't already.
          
          // Fix square brackets []
          sanitizedCode = sanitizedCode.replace(/([a-zA-Z0-9_-]+)\[([^"\]]*[\(\)\{\}][^"\]]*)\]/g, '$1["$2"]');
          // Fix parentheses ()
          sanitizedCode = sanitizedCode.replace(/([a-zA-Z0-9_-]+)\(([^"\]]*[\(\)\{\}][^"\]]*)\)/g, '$1("$2")');
          
          // 3. Global cleanup of common breaking patterns
          // If the model generated something like A[Label] --> B[Label(with parens)]
          // we want to make sure the second one is B["Label(with parens)"]
          
          // 4. Final safety pass: if a line has a node ID followed by [ or ( but no quotes, and contains special chars, quote it.
          const lines = sanitizedCode.split('\n');
          const processedLines = lines.map(line => {
            // Match node definitions like A[Label] or A(Label)
            return line.replace(/([a-zA-Z0-9_-]+)(\[|\()([^"\]\)]+)(\]|\))/g, (match, id, start, label, end) => {
              // If label contains special chars and isn't quoted, quote it
              if (/[\(\)\{\}\[\]\+\-\*\/]/.test(label) && !label.startsWith('"')) {
                const quoteStart = start === '[' ? '[' : '(';
                const quoteEnd = end === ']' ? ']' : ')';
                return `${id}${quoteStart}"${label}"${quoteEnd}`;
              }
              return match;
            });
          });
          sanitizedCode = processedLines.join('\n');

          // Render the new diagram
          const { svg } = await mermaid.render(id, sanitizedCode);
          // Safety check if ref still exists after async op
          if (diagramRef.current) {
             diagramRef.current.innerHTML = svg;
             setSvgContent(svg);
          }
        } catch (err) {
          console.error("Mermaid Render Error:", err);
          // SECOND CHANCE: Extreme sanitization - strip all special chars from labels
          try {
            const id = `mermaid-retry-${Math.random().toString(36).substr(2, 9)}`;
            let extremeSanitized = mermaidCode.replace(/[\(\)\{\}]/g, ''); 
            const { svg } = await mermaid.render(id, extremeSanitized);
            if (diagramRef.current) {
              diagramRef.current.innerHTML = svg;
              setSvgContent(svg);
              return;
            }
          } catch (retryErr) {
            console.error("Mermaid Retry Failed:", retryErr);
          }
          setError("Failed to visualize the logic. Try a simpler prompt.");
        }
      };
      render();
    }
  }, [mermaidCode]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setMermaidCode('');
    setSvgContent('');
    
    try {
      const code = await generateDiagramCode(prompt);
      setMermaidCode(code);
    } catch (err: any) {
      const errorStr = JSON.stringify(err);
      if (errorStr.includes('429') || err?.status === 429 || err?.message?.includes('429')) {
        setError("Quota exceeded! 🚨 The free AI limit has been reached. Please wait a moment or add your own Gemini API Key in Settings.");
      } else {
        setError("Failed to connect to AI service.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadItem = () => {
    if (!svgContent) return;
    
    const link = document.createElement('a');
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    link.href = URL.createObjectURL(blob);
    link.download = `mukti-workflow-${Date.now()}.svg`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full space-y-4 pt-2 pb-12 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
      
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-1">
          <div>
              <h2 className="text-xl font-bold text-white">Concept Visualizer</h2>
              <p className="text-xs text-slate-500">Logic flows and process workflows</p>
          </div>
          <div className="bg-[#1e293b] p-3 rounded-xl flex border border-white/5 text-cyan-500">
              <Network size={20} />
          </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-[#1e293b] p-4 rounded-[32px] border border-white/5 shadow-xl">
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-transparent text-slate-200 text-sm focus:outline-none resize-none min-h-[80px]"
            placeholder="e.g. 'Photosynthesis process flowchart' or 'Human digestive system steps'"
          />
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
             <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                    <button onClick={() => setPrompt("Nitrogen cycle process")} className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-slate-400">Nitrogen Cycle</button>
                    <button onClick={() => setPrompt("How a battery works")} className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-slate-400">Battery Logic</button>
                </div>
             </div>
             <button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="px-5 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shadow-lg bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20 text-white"
             >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Create
             </button>
          </div>
      </div>

      {/* Result Display */}
      <div className="flex-1 bg-[#1e293b] rounded-[32px] border border-white/5 overflow-hidden flex flex-col relative group min-h-0">
          
          <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-6 custom-scrollbar relative">
              {isGenerating ? (
                  <div className="text-center space-y-4">
                      <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto border-cyan-500/20 border-t-cyan-500"></div>
                      <div className="space-y-1">
                          <p className="text-slate-200 font-bold">Mapping logic...</p>
                          <p className="text-slate-500 text-xs animate-pulse">MUKTI AI is working</p>
                      </div>
                  </div>
              ) : error ? (
                  <div className="text-center max-w-xs space-y-4">
                      <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 inline-block"><Info size={32} /></div>
                      <p className="text-sm text-slate-400">{error}</p>
                  </div>
              ) : mermaidCode ? (
                  <div className="w-full flex items-center justify-center">
                      <div ref={diagramRef} className="mermaid w-full animate-in zoom-in-95 duration-500 cursor-zoom-in" onClick={() => setShowFullImage(true)} />
                  </div>
              ) : (
                  <div className="text-center space-y-4 opacity-30">
                      <LayoutTemplate size={64} className="mx-auto text-slate-400" />
                      <p className="text-sm font-medium">Visualization will appear here</p>
                  </div>
              )}
          </div>

          {/* Action Buttons */}
          {(mermaidCode && !isGenerating) && (
             <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                <button onClick={downloadItem} className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all shadow-lg border border-white/10" title="Download"><Download size={20} /></button>
                <button onClick={() => setShowFullImage(true)} className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all shadow-lg border border-white/10" title="Full Screen"><ZoomIn size={20} /></button>
             </div>
          )}
      </div>

      {/* Full Screen Modal */}
      {showFullImage && svgContent && (
          <div className="fixed inset-0 z-[100] bg-[#0b1221]/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
              <button onClick={() => setShowFullImage(false)} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all z-50"><X size={24} /></button>
              
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4 custom-scrollbar">
                  <div 
                    className="w-full h-full flex items-center justify-center p-4"
                    dangerouslySetInnerHTML={{ __html: svgContent }} 
                  />
              </div>

              <button onClick={downloadItem} className="absolute bottom-10 px-8 py-3 bg-white text-black font-bold rounded-full flex items-center gap-2 hover:bg-slate-100 transition-all shadow-2xl z-50">
                  <Download size={20} /> 
                  Save Workflow
              </button>
          </div>
      )}

      <style>{`
        .mermaid svg { max-width: 100% !important; height: auto !important; filter: drop-shadow(0 0 10px rgba(0,0,0,0.3)); }
        .mermaid { display: flex; justify-content: center; align-items: center; width: 100%; }
      `}</style>
    </div>
  );
};
