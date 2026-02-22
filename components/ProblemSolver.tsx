
import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Sparkles, ArrowLeft, RefreshCw, ChevronRight, Calculator, Loader2, X } from 'lucide-react';
import { solveProblemFromImage } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const ProblemSolver: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [image, setImage] = useState<string | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setSolution(null); // Clear old solution when new image is picked
    };
    reader.readAsDataURL(file);
  };

  const handleSolve = async () => {
    if (!image || isSolving) return;

    setIsSolving(true);
    try {
      const [mimeType, base64Data] = image.split(',');
      const pureMime = mimeType.match(/:(.*?);/)?.[1] || 'image/jpeg';
      const result = await solveProblemFromImage(base64Data, pureMime, additionalContext);
      setSolution(result);
    } catch (error) {
      console.error(error);
      setSolution("Something went wrong while solving.");
    } finally {
      setIsSolving(false);
    }
  };

  const clear = () => {
    setImage(null);
    setSolution(null);
    setAdditionalContext('');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar animate-in slide-in-from-right-10 duration-500 pt-2 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 px-1">
        <button 
          onClick={onBack}
          className="p-2 bg-[#1e293b] rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">AI Problem Solver</h2>
          <p className="text-xs text-slate-500 font-medium">Visual step-by-step help</p>
        </div>
      </div>

      <div className="space-y-6 pb-10">
        {!image ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square bg-[#1e293b] rounded-[40px] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-[#253246] transition-all group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
            <div className="p-6 rounded-full bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Camera size={48} />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">Snap or Upload</p>
              <p className="text-slate-500 text-sm">Take a photo of your assignment</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="relative rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-[#1e293b]">
              <img src={image} alt="Problem Preview" className="w-full h-auto max-h-[300px] object-contain bg-black/20" />
              <button 
                onClick={clear}
                className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors shadow-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Context Input */}
            <div className="bg-[#1e293b] p-4 rounded-[24px] border border-white/5 shadow-xl">
              <label className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2 block">Optional Context</label>
              <input 
                type="text"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g., 'Solve for x' or 'Explain the law used'"
                className="w-full bg-black/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 border border-white/5"
              />
            </div>

            {!solution && (
              <button 
                onClick={handleSolve}
                disabled={isSolving}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-[20px] shadow-lg shadow-cyan-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                {isSolving ? (
                  <>
                    <Loader2 size={24} className="animate-spin" />
                    <span>Analyzing Problem...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={24} />
                    <span>Solve it for me</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {solution && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 bg-[#1e293b] rounded-[32px] p-6 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Calculator size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold">MUKTI Solution</h3>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Step-by-step verified</p>
              </div>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {solution}
              </ReactMarkdown>
            </div>
            
            <button 
              onClick={clear}
              className="w-full mt-8 py-3 rounded-xl bg-white/5 text-slate-400 font-bold text-xs hover:bg-white/10 transition-colors"
            >
              Solve Another
            </button>
          </div>
        )}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
      />
    </div>
  );
};
