
import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Download, X, Network, ZoomIn, Loader2, Info, LayoutTemplate, Image as ImageIcon } from 'lucide-react';
import { generateDiagramCode, callAI } from '../services/geminiService';
import { getSettings } from '../services/storage';
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
  const [mode, setMode] = useState<'mermaid' | 'schematic'>('mermaid');
  const [schematicUrl, setSchematicUrl] = useState<string | null>(null);

  const diagramRef = useRef<HTMLDivElement>(null);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (schematicUrl && schematicUrl.startsWith('blob:')) {
        URL.revokeObjectURL(schematicUrl);
      }
    };
  }, [schematicUrl]);

  // Render Mermaid code whenever it changes and the ref is available
  useEffect(() => {
    if (mode === 'mermaid' && mermaidCode && diagramRef.current) {
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
          
          // 5. Fix common arrow hallucinations like |label|> or --|label|>
          sanitizedCode = sanitizedCode.replace(/--\|([^|]+)\|>/g, '-->|$1|');
          sanitizedCode = sanitizedCode.replace(/\|([^|]+)\|>/g, '-->|$1|');

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
  }, [mermaidCode, mode]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setMermaidCode('');
    setSvgContent('');
    setSchematicUrl(null);
    
    try {
      if (mode === 'mermaid') {
        const code = await generateDiagramCode(prompt);
        setMermaidCode(code);
      } else {
        // Schematic mode
        const settings = getSettings();
        const diagramModel = settings.diagramModel || 'flux';
        
        // Use text processing models to convert the simple topic into an extremely detailed prompt
        const promptEnhancementPrompt = `Convert the simple topic "${prompt}" into an extremely detailed image generation prompt for an educational diagram. Include specific terms to include, their correct spellings, what structures to show, and specify a clean white background with clear English labels. Return ONLY the prompt text, nothing else.`;
        
        let enhancedPrompt = prompt;
        try {
            enhancedPrompt = await callAI(promptEnhancementPrompt, { system: "You are an expert prompt engineer for educational diagrams." });
            enhancedPrompt = enhancedPrompt.trim();
        } catch (e) {
            console.warn("Failed to enhance prompt, using original", e);
            enhancedPrompt = `A clear, educational schematic diagram of ${prompt} with detailed English labels, high quality, white background`;
        }

        // Direct to pollinations with selected model
        const pollinationsKey = settings.pollinationsKey || import.meta.env.VITE_POLLINATIONS_API_KEY;
        const seed = Math.floor(Math.random() * 1000000);
        
        let pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&model=${diagramModel}&seed=${seed}&enhance=true&nologo=true`;
        if (pollinationsKey) {
            pollinationsUrl += `&key=${pollinationsKey}`;
        }
        
        // Fetch the image as blob to show loading state while downloading
        try {
            const response = await fetch(pollinationsUrl);
            if (!response.ok) throw new Error('Failed to generate image');
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            setSchematicUrl(objectUrl);
        } catch (fetchError) {
            console.warn("Fetch failed, falling back to direct URL", fetchError);
            setSchematicUrl(pollinationsUrl);
        }
      }
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

  const downloadItem = async () => {
    if (mode === 'mermaid' && svgContent) {
      const link = document.createElement('a');
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      link.href = URL.createObjectURL(blob);
      link.download = `mukti-workflow-${Date.now()}.svg`;
      link.click();
    } else if (mode === 'schematic' && schematicUrl) {
      try {
        const response = await fetch(schematicUrl);
        const blob = await response.blob();
        
        // Convert SVG to JPG
        if (blob.type.includes('svg') || schematicUrl.toLowerCase().endsWith('.svg')) {
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 1024;
            canvas.height = img.height || 1024;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((jpgBlob) => {
                if (jpgBlob) {
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(jpgBlob);
                  link.download = `mukti-schematic-${Date.now()}.jpg`;
                  link.click();
                }
              }, 'image/jpeg', 0.95);
            }
            URL.revokeObjectURL(url);
          };
          img.src = url;
          return;
        }

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `mukti-schematic-${Date.now()}.jpg`;
        link.click();
      } catch (e) {
        window.open(schematicUrl, '_blank');
      }
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 pt-2 pb-12 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
      
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-1">
          <div>
              <h2 className="text-xl font-bold text-white">Concept Visualizer</h2>
              <p className="text-xs text-slate-500">{mode === 'mermaid' ? 'Logic flows and process workflows' : 'Schematic and structural diagrams'}</p>
          </div>
          <div className="bg-black/20 p-1 rounded-xl flex border border-white/5 relative shadow-inner">
              <div 
                  className={`absolute top-1 bottom-1 w-[36px] rounded-lg transition-all duration-300 shadow-md ${mode === 'mermaid' ? 'left-1 bg-cyan-600' : 'left-[41px] bg-purple-600'}`}
              />
              <button 
                  onClick={() => setMode('mermaid')}
                  className={`relative z-10 w-[36px] h-[32px] flex items-center justify-center transition-colors ${mode === 'mermaid' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Logic Flow"
              >
                  <Network size={16} />
              </button>
              <button 
                  onClick={() => setMode('schematic')}
                  className={`relative z-10 w-[36px] h-[32px] flex items-center justify-center transition-colors ${mode === 'schematic' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                  title="Schematic Diagram"
              >
                  <ImageIcon size={16} />
              </button>
          </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-[#1e293b] p-4 rounded-[32px] border border-white/5 shadow-xl">
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-transparent text-slate-200 text-sm focus:outline-none resize-none min-h-[60px]"
            placeholder={mode === 'mermaid' ? "e.g. 'Photosynthesis process flowchart'" : "e.g. 'Human heart structure' or 'Plant cell'"}
          />
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
             <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                    <button onClick={() => setPrompt(mode === 'mermaid' ? "Nitrogen cycle process" : "Human heart")} className={`px-3 py-1 bg-white/5 hover:bg-white/10 transition-colors rounded-full text-[10px] font-bold ${mode === 'mermaid' ? 'text-cyan-400' : 'text-purple-400'}`}>
                      {mode === 'mermaid' ? "Nitrogen Cycle" : "Human Heart"}
                    </button>
                    <button onClick={() => setPrompt(mode === 'mermaid' ? "How a battery works" : "Plant cell")} className={`px-3 py-1 bg-white/5 hover:bg-white/10 transition-colors rounded-full text-[10px] font-bold ${mode === 'mermaid' ? 'text-cyan-400' : 'text-purple-400'}`}>
                      {mode === 'mermaid' ? "Battery Logic" : "Plant Cell"}
                    </button>
                </div>
             </div>
             <button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center gap-2 shadow-lg text-white ${mode === 'mermaid' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'}`}
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
                      <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto ${mode === 'mermaid' ? 'border-cyan-500/20 border-t-cyan-500' : 'border-purple-500/20 border-t-purple-500'}`}></div>
                      <div className="space-y-1">
                          <p className="text-slate-200 font-bold">{mode === 'mermaid' ? 'Mapping logic...' : 'Fetching schematic...'}</p>
                          <p className="text-slate-500 text-xs animate-pulse">MUKTI AI is working</p>
                      </div>
                  </div>
              ) : error ? (
                  <div className="text-center max-w-xs space-y-4">
                      <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 inline-block"><Info size={32} /></div>
                      <p className="text-sm text-slate-400">{error}</p>
                  </div>
              ) : mode === 'mermaid' && mermaidCode ? (
                  <div className="w-full flex items-center justify-center">
                      <div ref={diagramRef} className="mermaid w-full animate-in zoom-in-95 duration-500 cursor-zoom-in" onClick={() => setShowFullImage(true)} />
                  </div>
              ) : mode === 'schematic' && schematicUrl ? (
                  <div className="w-full h-full flex items-center justify-center">
                      <img 
                        src={schematicUrl} 
                        alt="Schematic Diagram" 
                        className={`max-w-full max-h-full object-contain rounded-xl shadow-lg cursor-zoom-in animate-in zoom-in-95 duration-500 ${schematicUrl.toLowerCase().endsWith('.svg') ? 'bg-white p-4' : ''}`}
                        onClick={() => setShowFullImage(true)}
                        onError={(e) => {
                          // If pollinations fails or wiki fails, show error
                          setError("Failed to load the image.");
                        }}
                      />
                  </div>
              ) : (
                  <div className="text-center space-y-4 opacity-30">
                      <LayoutTemplate size={64} className="mx-auto text-slate-400" />
                      <p className="text-sm font-medium">Visualization will appear here</p>
                  </div>
              )}
          </div>

          {/* Action Buttons */}
          {((mode === 'mermaid' && mermaidCode) || (mode === 'schematic' && schematicUrl)) && !isGenerating && (
             <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                <button onClick={downloadItem} className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all shadow-lg border border-white/10" title="Download"><Download size={20} /></button>
                <button onClick={() => setShowFullImage(true)} className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all shadow-lg border border-white/10" title="Full Screen"><ZoomIn size={20} /></button>
             </div>
          )}
      </div>

      {/* Full Screen Modal */}
      {showFullImage && (
          <div className="fixed inset-0 z-[100] bg-[#0b1221]/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
              <button onClick={() => setShowFullImage(false)} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all z-50"><X size={24} /></button>
              
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4 custom-scrollbar">
                  {mode === 'mermaid' && svgContent ? (
                    <div 
                      className="w-full h-full flex items-center justify-center p-4"
                      dangerouslySetInnerHTML={{ __html: svgContent }} 
                    />
                  ) : mode === 'schematic' && schematicUrl ? (
                    <img src={schematicUrl} alt="Schematic Diagram Full" className={`max-w-full max-h-full object-contain rounded-xl ${schematicUrl.toLowerCase().endsWith('.svg') ? 'bg-white p-8' : ''}`} />
                  ) : null}
              </div>

              <button onClick={downloadItem} className="absolute bottom-10 px-8 py-3 bg-white text-black font-bold rounded-full flex items-center gap-2 hover:bg-slate-100 transition-all shadow-2xl z-50">
                  <Download size={20} /> 
                  Save {mode === 'mermaid' ? 'Workflow' : 'Diagram'}
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
