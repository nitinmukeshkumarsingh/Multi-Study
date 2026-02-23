
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Save, User, BookOpen, Key, ArrowLeft, Check, ExternalLink, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { UserSettings } from '../types';
import { getSettings, saveSettings, getCustomApiKey, saveCustomApiKey } from '../services/storage';

interface SettingsProps {
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [customKey, setCustomKey] = useState(getCustomApiKey());
  const [showKey, setShowKey] = useState(false);
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
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Access & Keys</p>
            </div>
        </div>

        {/* Manual Key Input */}
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Gemini API Key (Required)</label>
            <div className="bg-black/20 rounded-2xl border border-white/5 flex items-center px-4 relative group focus-within:ring-1 focus-within:ring-indigo-500/50">
                <ShieldCheck size={18} className="text-indigo-400 mr-3" />
                <input 
                    type={showKey ? "text" : "password"}
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="w-full bg-transparent py-3 text-white focus:outline-none text-sm font-mono placeholder-slate-700"
                    placeholder="AIzaSy..."
                    autoComplete="off"
                />
                <button 
                    onClick={() => setShowKey(!showKey)} 
                    className="p-2 text-slate-600 hover:text-white transition-colors"
                >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            <p className="text-[10px] text-slate-500 px-1 leading-relaxed">
                Enter your personal Gemini API key here. 
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline ml-1">Get a key</a>
            </p>
        </div>

        <div className="relative">
             <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
                <span className="bg-[#1e293b] px-2 text-[10px] text-slate-500 font-bold uppercase">OR</span>
            </div>
        </div>

        {/* Project Selector */}
        <div className="bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10">
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Use the official Google AI Project selector (Recommended for Veo & Advanced Models).
            </p>
            <button 
                onClick={openApiKeyDialog}
                className="w-full bg-[#1e293b] hover:bg-[#253246] border border-indigo-500/30 text-indigo-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
                <Key size={18} /> Select Google Cloud Project
            </button>
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
