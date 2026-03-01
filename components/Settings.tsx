
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, User, BookOpen, Key, ArrowLeft, Check, ExternalLink, ShieldCheck, Eye, EyeOff, Cpu, Globe, Image as ImageIcon } from 'lucide-react';
import { UserSettings, AIProvider } from '../types';
import { getSettings, saveSettings, getCustomApiKey, saveCustomApiKey } from '../services/storage';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [customKey, setCustomKey] = useState(getCustomApiKey());
  const [showKey, setShowKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showORKey, setShowORKey] = useState(false);
  const [showPollinationsKey, setShowPollinationsKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    saveSettings(settings);
    saveCustomApiKey(customKey.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSettings(prev => ({ ...prev, profileImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const openApiKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
    }
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar space-y-6 animate-in slide-in-from-bottom-4 duration-500 pt-2 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button 
                onClick={onBack}
                className="p-2 bg-[#1e293b] rounded-full text-slate-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white">Settings</h2>
        </div>
        <button 
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${isSaved ? 'bg-emerald-600 text-white' : 'bg-cyan-600 text-white hover:bg-cyan-500'}`}
        >
            {isSaved ? <Check size={18} /> : <Save size={18} />}
            {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>

      {/* Profile Section */}
      <section className="bg-[#1e293b] rounded-[32px] p-6 border border-white/5 space-y-6 shadow-xl">
        <div className="flex flex-col items-center gap-4 mb-2">
            <div className="relative group">
                <div className="w-24 h-24 rounded-[32px] bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden">
                    {settings.profileImage ? (
                        <img src={settings.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <User size={40} className="text-slate-600" />
                    )}
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 p-2 bg-cyan-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"
                >
                    <Camera size={18} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
            <div className="text-center">
                <h3 className="text-white font-bold text-lg">Your Profile</h3>
                <p className="text-xs text-slate-500">How MUKTI sees you</p>
            </div>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest px-1">Display Name</label>
                <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4">
                    <User size={18} className="text-slate-500 mr-3" />
                    <input 
                        type="text" 
                        value={settings.name}
                        onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-transparent py-3 text-white focus:outline-none text-sm"
                        placeholder="Your name"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-purple-500 uppercase tracking-widest px-1">Academic Level</label>
                <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4">
                    <BookOpen size={18} className="text-slate-500 mr-3" />
                    <select 
                        value={settings.academicLevel}
                        onChange={(e) => setSettings(prev => ({ ...prev, academicLevel: e.target.value }))}
                        className="w-full bg-transparent py-3 text-white focus:outline-none text-sm appearance-none"
                    >
                        <option value="Primary School" className="bg-[#1e293b]">Primary School</option>
                        <option value="Middle School" className="bg-[#1e293b]">Middle School</option>
                        <option value="High School" className="bg-[#1e293b]">High School</option>
                        <option value="University Undergraduate" className="bg-[#1e293b]">University Undergraduate</option>
                        <option value="Postgraduate" className="bg-[#1e293b]">Postgraduate</option>
                        <option value="Professional" className="bg-[#1e293b]">Professional</option>
                    </select>
                </div>
                <p className="text-[10px] text-slate-600 px-1">MUKTI will adjust its explanations based on this level.</p>
            </div>
        </div>
      </section>

        {/* AI Config Section */}
      <section className="bg-[#1e293b] rounded-[32px] p-6 border border-white/5 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Key size={20} />
            </div>
            <div>
                <h3 className="text-white font-bold">AI Configuration</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Models & Access</p>
            </div>
        </div>

        <div className="space-y-4 mb-6">
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Text Processing Model</label>
                <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4">
                    <select 
                        value={settings.textModel || 'groq:llama-3.3-70b-versatile'}
                        onChange={(e) => setSettings(prev => ({ ...prev, textModel: e.target.value }))}
                        className="w-full bg-transparent py-3 text-white focus:outline-none text-sm appearance-none"
                    >
                        <option value="groq:qwen/qwen3-32b" className="bg-[#1e293b]">Groq: Qwen 3 32B</option>
                        <option value="groq:openai/gpt-oss-120b" className="bg-[#1e293b]">Groq: GPT-OSS 120B</option>
                        <option value="groq:openai/gpt-oss-20b" className="bg-[#1e293b]">Groq: GPT-OSS 20B</option>
                        <option value="groq:openai/gpt-oss-safeguard-20b" className="bg-[#1e293b]">Groq: GPT-OSS Safeguard 20B</option>
                        <option value="groq:groq/compound" className="bg-[#1e293b]">Groq: Compound</option>
                        <option value="groq:groq/compound-mini" className="bg-[#1e293b]">Groq: Compound Mini</option>
                        <option value="openrouter:openrouter/free" className="bg-[#1e293b]">OpenRouter: Free Models</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Media Processing Model</label>
                <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4">
                    <select 
                        value={settings.mediaModel || 'groq:meta-llama/llama-4-scout-17b-16e-instruct'}
                        onChange={(e) => setSettings(prev => ({ ...prev, mediaModel: e.target.value }))}
                        className="w-full bg-transparent py-3 text-white focus:outline-none text-sm appearance-none"
                    >
                        <option value="groq:meta-llama/llama-4-scout-17b-16e-instruct" className="bg-[#1e293b]">Groq: Llama 4 Scout 17B (16e)</option>
                        <option value="openrouter:openrouter/free" className="bg-[#1e293b]">OpenRouter: Free (Auto)</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Diagram Processing Model</label>
                <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4">
                    <select 
                        value={settings.diagramModel || 'flux'}
                        onChange={(e) => setSettings(prev => ({ ...prev, diagramModel: e.target.value }))}
                        className="w-full bg-transparent py-3 text-white focus:outline-none text-sm appearance-none"
                    >
                        <option value="flux" className="bg-[#1e293b]">Flux</option>
                        <option value="zimage" className="bg-[#1e293b]">ZImage</option>
                        <option value="grok-imagine" className="bg-[#1e293b]">Grok Imagine</option>
                        <option value="imagen-4" className="bg-[#1e293b]">Imagen 4</option>
                        <option value="wiki-common" className="bg-[#1e293b]">Wiki Common</option>
                    </select>
                </div>
            </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
            Add your own API keys to bypass rate limits. If left empty, the app will try to use the default shared keys.
        </p>

        {/* Gemini Key */}
        <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gemini API Key</label>
                {!customKey && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><Check size={10} /> Using Default</span>}
            </div>
            <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4 relative group focus-within:ring-1 focus-within:ring-indigo-500/50">
                <ShieldCheck size={18} className="text-indigo-400 mr-3" />
                <input 
                    type={showKey ? "text" : "password"}
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="w-full bg-transparent py-3 text-white focus:outline-none text-sm font-mono placeholder-slate-700"
                    placeholder="Enter your personal key..."
                    autoComplete="off"
                />
                <button 
                    onClick={() => setShowKey(!showKey)} 
                    className="p-2 text-slate-600 hover:text-white transition-colors"
                >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            <div className="flex justify-between items-center px-1">
                 <p className="text-[10px] text-slate-500">Video Tutor & Chat</p>
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">Get Key <ExternalLink size={10} /></a>
            </div>
        </div>

        {/* Groq Key */}
        <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Groq API Key</label>
                {!settings.groqKey && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><Check size={10} /> Using Default</span>}
            </div>
            <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4 relative group focus-within:ring-1 focus-within:ring-orange-500/50">
                <Cpu size={18} className="text-orange-400 mr-3" />
                <input 
                    type={showGroqKey ? "text" : "password"}
                    value={settings.groqKey || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, groqKey: e.target.value }))}
                    className="w-full bg-transparent py-3 text-white focus:outline-none text-sm font-mono placeholder-slate-700"
                    placeholder="Enter your personal key..."
                    autoComplete="off"
                />
                <button 
                    onClick={() => setShowGroqKey(!showGroqKey)} 
                    className="p-2 text-slate-600 hover:text-white transition-colors"
                >
                    {showGroqKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            <div className="flex justify-between items-center px-1">
                 <p className="text-[10px] text-slate-500">Fast Text Processing</p>
                 <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-[10px] text-orange-400 hover:underline flex items-center gap-1">Get Key <ExternalLink size={10} /></a>
            </div>
        </div>

        {/* OpenRouter Key */}
        <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">OpenRouter API Key</label>
                {!settings.openrouterKey && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><Check size={10} /> Using Default</span>}
            </div>
            <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4 relative group focus-within:ring-1 focus-within:ring-pink-500/50">
                <Globe size={18} className="text-pink-400 mr-3" />
                <input 
                    type={showORKey ? "text" : "password"}
                    value={settings.openrouterKey || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, openrouterKey: e.target.value }))}
                    className="w-full bg-transparent py-3 text-white focus:outline-none text-sm font-mono placeholder-slate-700"
                    placeholder="Enter your personal key..."
                    autoComplete="off"
                />
                <button 
                    onClick={() => setShowORKey(!showORKey)} 
                    className="p-2 text-slate-600 hover:text-white transition-colors"
                >
                    {showORKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            <div className="flex justify-between items-center px-1">
                 <p className="text-[10px] text-slate-500">Universal Model Access</p>
                 <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-[10px] text-pink-400 hover:underline flex items-center gap-1">Get Key <ExternalLink size={10} /></a>
            </div>
        </div>

        {/* Pollinations Key */}
        <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pollinations AI Key</label>
                {!settings.pollinationsKey && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><Check size={10} /> Using Default</span>}
            </div>
            <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4 relative group focus-within:ring-1 focus-within:ring-emerald-500/50">
                <ImageIcon size={18} className="text-emerald-400 mr-3" />
                <input 
                    type={showPollinationsKey ? "text" : "password"}
                    value={settings.pollinationsKey || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, pollinationsKey: e.target.value }))}
                    className="w-full bg-transparent py-3 text-white focus:outline-none text-sm font-mono placeholder-slate-700"
                    placeholder="Enter your pollinations key..."
                    autoComplete="off"
                />
                <button 
                    onClick={() => setShowPollinationsKey(!showPollinationsKey)} 
                    className="p-2 text-slate-600 hover:text-white transition-colors"
                >
                    {showPollinationsKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            <div className="flex justify-between items-center px-1">
                 <p className="text-[10px] text-slate-500">Image Generation</p>
                 <a href="https://pollinations.ai" target="_blank" rel="noreferrer" className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1">Get Key <ExternalLink size={10} /></a>
            </div>
        </div>
      </section>

      {/* Footer Info */}
      <div className="text-center py-4">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">MUKTI Study v2.1</p>
          <p className="text-[10px] text-slate-700 mt-1">Local data only • AI Powered</p>
      </div>
    </div>
  );
};
