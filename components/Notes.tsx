
import React, { useState, useRef, useEffect } from 'react';
import { Note, Deck } from '../types';
import { Plus, Trash2, ArrowLeft, Save, ChevronRight, Camera, Loader2, Edit2, X, Eye, Maximize2, Sparkles, Layers } from 'lucide-react';
import { enhanceNoteContent, processImageToNote, generateFlashcards } from '../services/geminiService';
import { getNotes, saveNote, deleteNote, saveDeck } from '../services/storage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [renamingNote, setRenamingNote] = useState<Note | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotes(getNotes());
  }, []);

  const handleConvertToDeck = async () => {
    if (!activeNote || !activeNote.content || isGeneratingDeck) return;

    setIsGeneratingDeck(true);
    try {
      const cards = await generateFlashcards('topic', activeNote.content, undefined, 10);
      if (cards.length > 0) {
        const newDeck: Deck = {
          id: Date.now().toString(),
          title: activeNote.title || 'Note Flashcards',
          cards: cards,
          createdAt: Date.now(),
          lastStudied: Date.now(),
          masteryPercentage: 0
        };
        saveDeck(newDeck);
        alert('Flashcard deck created successfully! Go to Flashcards tab to view it.');
      } else {
        alert('Could not generate flashcards from this note. Try adding more content.');
      }
    } catch (error) {
      console.error("Failed to convert note to deck:", error);
      alert('Failed to create flashcard deck.');
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      createdAt: Date.now()
    };
    const updatedNotes = saveNote(newNote);
    setNotes(updatedNotes);
    setActiveNote(newNote);
    setView('detail');
    setMode('edit');
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    const noteToUpdate = notes.find(n => n.id === id);
    if (!noteToUpdate) return;

    const updatedNote = { ...noteToUpdate, ...updates };
    const updatedNotes = saveNote(updatedNote);
    setNotes(updatedNotes);
    
    if (activeNote && activeNote.id === id) {
        setActiveNote(updatedNote);
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const updatedNotes = deleteNote(id);
      setNotes(updatedNotes);
      if (activeNote?.id === id) {
          setActiveNote(null);
          setView('list');
      }
  };

  const handleEnhance = async () => {
    if (!activeNote || !activeNote.content || isEnhancing) return;

    setIsEnhancing(true);
    const enhancedContent = await enhanceNoteContent(activeNote.content);
    if (enhancedContent) {
        handleUpdateNote(activeNote.id, { content: enhancedContent });
        setMode('preview'); // Auto switch to preview to see changes
    }
    setIsEnhancing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setIsProcessingImage(true);
      try {
        const { title, content } = await processImageToNote(base64, file.type);
        const newNote: Note = {
          id: Date.now().toString(),
          title,
          content,
          createdAt: Date.now()
        };
        const updatedNotes = saveNote(newNote);
        setNotes(updatedNotes);
        setActiveNote(newNote);
        setView('detail');
        setMode('preview');
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBack = () => {
      setActiveNote(null);
      setView('list');
  };

  const startRename = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setRenamingNote(note);
    setTempTitle(note.title);
  };

  const confirmRename = () => {
    if (renamingNote && tempTitle.trim()) {
      handleUpdateNote(renamingNote.id, { title: tempTitle.trim() });
    }
    setRenamingNote(null);
  };

  return (
    <div className="relative h-full pt-2 flex flex-col overflow-hidden">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
      />

      {/* Full Screen Preview Modal */}
      {showFullScreen && activeNote && (
          <div className="fixed inset-0 z-[100] bg-[#0b1221] flex flex-col animate-in fade-in duration-300">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0f172a]">
                  <h2 className="text-xl font-bold text-white truncate max-w-[80%] pl-2">{activeNote.title}</h2>
                  <button 
                    onClick={() => setShowFullScreen(false)}
                    className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors hover:bg-white/10"
                  >
                      <X size={24} />
                  </button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-[#0b1221]">
                  <div className="prose prose-invert prose-lg max-w-4xl mx-auto pb-20">
                      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8">{activeNote.title}</h1>
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{activeNote.content || "*No content to preview*"}</ReactMarkdown>
                  </div>
              </div>
          </div>
      )}

      {/* Rename Modal */}
      {renamingNote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 animate-in fade-in duration-200">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenamingNote(null)} />
              <div className="bg-[#1e293b] w-full max-w-sm rounded-[32px] p-6 border border-white/10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-white mb-4">Rename Note</h3>
                  <input 
                    autoFocus
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                    className="w-full bg-black/30 rounded-xl px-4 py-3 text-white border border-white/5 focus:outline-none focus:border-cyan-500/50 mb-6"
                    placeholder="Note title..."
                  />
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setRenamingNote(null)}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={confirmRename}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
                      >
                          Rename
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* List View */}
      {view === 'list' && (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-32 animate-in slide-in-from-left-4 duration-300">
             {isProcessingImage && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                    <Loader2 size={20} className="animate-spin text-cyan-400" />
                    <p className="text-sm text-cyan-300 font-medium">Scanning study material...</p>
                </div>
             )}
             
             {notes.length === 0 && !isProcessingImage ? (
                 <div className="flex flex-col items-center justify-center py-20 opacity-40">
                     <Save size={48} className="mb-4" />
                     <p>No notes yet</p>
                 </div>
             ) : (
                notes.map(note => (
                    <div 
                        key={note.id}
                        onClick={() => { setActiveNote(note); setView('detail'); setMode('preview'); }}
                        className="bg-[#1e293b] p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all border border-white/5 hover:bg-[#253246] group"
                    >
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-100 mb-1 truncate">{note.title || "Untitled Note"}</h4>
                            <p className="text-xs text-slate-500">
                                {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => startRename(e, note)}
                              className="p-2 text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-white/5"
                            >
                                <Edit2 size={16} />
                            </button>
                            <ChevronRight size={20} className="text-slate-600" />
                        </div>
                    </div>
                ))
             )}
             
             {/* FAB Section */}
             <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-40">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-12 h-12 bg-[#253246] hover:bg-[#2d3d55] text-cyan-400 rounded-2xl shadow-lg border border-white/10 flex items-center justify-center transition-all active:scale-90"
                    title="Scan from Image"
                >
                    <Camera size={24} />
                </button>
                <button
                    onClick={handleCreateNote}
                    className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-[16px] shadow-lg shadow-emerald-500/20 flex items-center justify-center transition-all active:scale-90"
                    title="New Note"
                >
                    <Plus size={28} strokeWidth={2.5} />
                </button>
             </div>
          </div>
      )}

      {/* Detail View */}
      {view === 'detail' && activeNote && (
          <div className="flex-1 flex flex-col h-full animate-in slide-in-from-right-10 duration-300 pb-20">
              
              {/* Toolbar */}
              <div className="flex-shrink-0 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button onClick={handleBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    {/* View/Edit Toggle */}
                    <div className="bg-[#1e293b] p-1 rounded-xl flex border border-white/5">
                        <button 
                            onClick={() => setMode('edit')}
                            className={`p-2 rounded-lg transition-all ${mode === 'edit' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            title="Edit"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={() => setMode('preview')}
                            className={`p-2 rounded-lg transition-all ${mode === 'preview' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            title="Preview"
                        >
                            <Eye size={16} />
                        </button>
                    </div>
                    
                    {/* Full Screen Toggle */}
                    <button 
                        onClick={() => setShowFullScreen(true)}
                        className="p-2 text-slate-400 hover:text-cyan-400 transition-colors ml-1 bg-[#1e293b] rounded-xl border border-white/5 hover:bg-white/5"
                        title="Full Screen"
                    >
                        <Maximize2 size={20} />
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                      <button 
                        onClick={handleEnhance}
                        disabled={isEnhancing || !activeNote.content}
                        className="p-2 text-amber-400 bg-amber-500/10 rounded-full hover:bg-amber-500/20 transition-colors"
                        title="AI Enhance"
                      >
                        {isEnhancing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      </button>
                      <button 
                        onClick={handleConvertToDeck}
                        disabled={isGeneratingDeck || !activeNote.content}
                        className="p-2 text-emerald-400 bg-emerald-500/10 rounded-full hover:bg-emerald-500/20 transition-colors"
                        title="Convert to Flashcards"
                      >
                        {isGeneratingDeck ? <Loader2 className="animate-spin" size={20} /> : <Layers size={20} />}
                      </button>
                      <button 
                        onClick={() => handleDelete(activeNote.id)}
                        className="p-2 text-red-400 bg-red-500/10 rounded-full hover:bg-red-500/20 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 size={20} />
                      </button>
                  </div>
              </div>

              {/* Title Input */}
              <div className="flex-shrink-0 group relative mb-4">
                  <input 
                    type="text" 
                    value={activeNote.title}
                    onChange={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })}
                    className="bg-transparent text-2xl font-bold text-white focus:outline-none w-full placeholder-slate-600 pr-10"
                    placeholder="Untitled Note"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit2 size={16} />
                  </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 bg-[#1e293b] rounded-3xl overflow-hidden flex flex-col border border-white/5 relative shadow-inner min-h-0">
                  {mode === 'edit' ? (
                      <textarea 
                        value={activeNote.content}
                        onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
                        className="flex-1 bg-transparent text-slate-300 resize-none focus:outline-none leading-relaxed text-sm custom-scrollbar p-4"
                        placeholder="Start typing your notes here..."
                      />
                  ) : (
                      <div className="flex-1 overflow-y-auto custom-scrollbar prose prose-invert prose-sm max-w-none p-6">
                           <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{activeNote.content || "*No content to preview*"}</ReactMarkdown>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
