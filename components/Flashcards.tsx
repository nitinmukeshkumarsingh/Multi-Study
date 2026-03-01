
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Check, X, Plus, Shuffle, Repeat, ArrowRightLeft, Trash2, Save, Wand2, ArrowRight, BarChart3, Flame, Trophy, Calendar, Camera, Link as LinkIcon, Type as TypeIcon, Image as ImageIcon, Loader2, Edit2, ChevronLeft, LayoutGrid, MoreVertical, Layers } from 'lucide-react';
import { Flashcard, Deck, UserStats } from '../types';
import { preprocessMath } from '../src/utils/math';
import { generateFlashcards } from '../services/geminiService';
import { getStats, updateStats, saveDeck, getDecks, deleteDeck } from '../services/storage';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

type StudyMode = 'standard' | 'shuffle' | 'spaced';
type ViewMode = 'study' | 'library' | 'manage';
type GenSource = 'topic' | 'image' | 'youtube';

export const Flashcards: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('library');
  
  // Generation State
  const [genSource, setGenSource] = useState<GenSource>('topic');
  const [topic, setTopic] = useState('');
  const [ytLink, setYtLink] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ base64: string, mime: string } | null>(null);
  
  // Study/Manage State
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [studyMode, setStudyMode] = useState<StudyMode>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studySessionComplete, setStudySessionComplete] = useState(false);
  
  // Editing State
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);

  // Swipe State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);

  // Stats/Library State
  const [stats, setStats] = useState<UserStats | null>(null);
  const [savedDecks, setSavedDecks] = useState<Deck[]>([]);
  const [renamingDeck, setRenamingDeck] = useState<Deck | null>(null);
  const [tempTitle, setTempTitle] = useState('');

  const timeoutRef = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStats(getStats());
    setSavedDecks(getDecks());
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const handleRenameDeck = (e: React.MouseEvent, deck: Deck) => {
    e.stopPropagation();
    setRenamingDeck(deck);
    setTempTitle(deck.title);
  };

  const confirmRenameDeck = () => {
    if (renamingDeck && tempTitle.trim()) {
      const updatedDeck = { ...renamingDeck, title: tempTitle.trim() };
      saveDeck(updatedDeck);
      setSavedDecks(getDecks());
      if (currentDeck?.id === renamingDeck.id) {
        setCurrentDeck(updatedDeck);
      }
    }
    setRenamingDeck(null);
    setTempTitle('');
  };

  const initializeSession = (deck: Deck, mode: StudyMode) => {
    setCurrentDeck(deck);
    let queue = [...deck.cards];
    if (mode === 'shuffle') {
      queue.sort(() => Math.random() - 0.5);
    } else if (mode === 'spaced') {
       queue.sort((a, b) => (a.mastered === b.mastered ? 0 : a.mastered ? 1 : -1));
    }
    setReviewQueue(queue);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudySessionComplete(false);
    setViewMode('study');
    setSwipeOffset(0);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage({ base64: (reader.result as string).split(',')[1], mime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    let payload = '';
    let mime = '';

    if (genSource === 'topic') { if (!topic.trim()) return; payload = topic; }
    else if (genSource === 'image') { if (!selectedImage) return; payload = selectedImage.base64; mime = selectedImage.mime; }
    else if (genSource === 'youtube') { if (!ytLink.trim()) return; payload = ytLink; }

    setIsGenerating(true);
    const newCards = await generateFlashcards(genSource, payload, mime);
    
    if (newCards.length > 0) {
      const deckTitle = genSource === 'topic' ? topic : genSource === 'image' ? 'Image Analysis' : 'Video Summary';
      const newDeck: Deck = {
          id: Math.random().toString(36).substr(2, 9),
          title: deckTitle,
          cards: newCards,
          createdAt: Date.now(),
          lastStudied: Date.now(),
          masteryPercentage: 0
      };
      saveDeck(newDeck);
      setSavedDecks(getDecks());
      initializeSession(newDeck, studyMode);
    }
    setIsGenerating(false);
    setSelectedImage(null);
  };

  const handleOpenDeck = (deck: Deck) => {
      initializeSession(deck, studyMode);
  };

  const handleManageDeck = (deck: Deck) => {
    setCurrentDeck(deck);
    setViewMode('manage');
  };

  const handleDeleteDeck = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updated = deleteDeck(id);
      setSavedDecks(updated);
      if (currentDeck?.id === id) {
          setCurrentDeck(null);
          setReviewQueue([]);
      }
  };

  // Card Management Actions
  const handleAddCardToDeck = () => {
    if (!editFront.trim() || !editBack.trim() || !currentDeck) return;
    const newCard: Flashcard = {
      id: Math.random().toString(36).substr(2, 9),
      front: editFront,
      back: editBack,
      mastered: false
    };
    const updatedDeck = { ...currentDeck, cards: [...currentDeck.cards, newCard] };
    saveDeck(updatedDeck);
    setCurrentDeck(updatedDeck);
    setSavedDecks(getDecks());
    setEditFront('');
    setEditBack('');
    setShowAddCardModal(false);
  };

  const handleUpdateCard = () => {
    if (!editingCard || !currentDeck) return;
    const updatedCards = currentDeck.cards.map(c => 
      c.id === editingCard.id ? { ...c, front: editFront, back: editBack } : c
    );
    const updatedDeck = { ...currentDeck, cards: updatedCards };
    saveDeck(updatedDeck);
    setCurrentDeck(updatedDeck);
    setSavedDecks(getDecks());
    setEditingCard(null);
    setEditFront('');
    setEditBack('');
  };

  const handleDeleteCard = (cardId: string) => {
    if (!currentDeck) return;
    const updatedCards = currentDeck.cards.filter(c => c.id !== cardId);
    const updatedDeck = { ...currentDeck, cards: updatedCards };
    saveDeck(updatedDeck);
    setCurrentDeck(updatedDeck);
    setSavedDecks(getDecks());
  };

  const handleNext = (known: boolean) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const newStats = updateStats(known);
    setStats(newStats);

    if (currentDeck && reviewQueue[currentIndex]) {
        const currentCardId = reviewQueue[currentIndex].id;
        const updatedCards = currentDeck.cards.map(c => 
            c.id === currentCardId ? { ...c, mastered: known } : c
        );
        const updatedDeck = { ...currentDeck, cards: updatedCards };
        setCurrentDeck(updatedDeck);
        saveDeck(updatedDeck);
        setSavedDecks(getDecks());
    }

    const currentCardLocal = reviewQueue[currentIndex];
    let shouldRequeue = studyMode === 'spaced' && !known;
    const isLastCard = currentIndex === reviewQueue.length - 1;

    if (isLastCard && !shouldRequeue) {
      setStudySessionComplete(true);
      return;
    }

    if (shouldRequeue) setReviewQueue(prev => [...prev, currentCardLocal]);
    setIsFlipped(false);
    timeoutRef.current = setTimeout(() => { setCurrentIndex(prev => prev + 1); }, 200); 
  };

  // Swipe Handlers
  const handleDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartX.current = e.clientX;
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    const offset = e.clientX - dragStartX.current;
    setSwipeOffset(offset);
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    const threshold = 100; // px to trigger swipe
    if (swipeOffset > threshold) {
      handleNext(true); // Swipe Right -> Correct
    } else if (swipeOffset < -threshold) {
      handleNext(false); // Swipe Left -> Wrong
    }
    setSwipeOffset(0);
  };

  const currentCard = reviewQueue[currentIndex];

  return (
    <div className="h-full flex flex-col relative pt-2 overflow-hidden">
      
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-4 bg-[#1e293b]/50 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 mx-1">
          <button 
            onClick={() => setViewMode('library')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'library' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
              <LayoutGrid size={14} /> Library
          </button>
          <button 
            onClick={() => { if(currentDeck) setViewMode('study'); else setViewMode('library'); }}
            disabled={!currentDeck && viewMode !== 'study'}
             className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'study' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white disabled:opacity-30'}`}
          >
              <RefreshCw size={14} /> Study
          </button>
      </div>

      {viewMode === 'library' && (
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-1 animate-in slide-in-from-bottom-4 duration-500">
           {/* Generator UI */}
           <div className="bg-[#1e293b] rounded-[32px] p-5 border border-white/5 mb-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />
                
                <div className="flex gap-2 mb-5">
                    <button onClick={() => setGenSource('topic')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genSource === 'topic' ? 'bg-white/10 text-cyan-400' : 'text-slate-500'}`}>Topic</button>
                    <button onClick={() => setGenSource('image')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genSource === 'image' ? 'bg-white/10 text-purple-400' : 'text-slate-500'}`}>Visual</button>
                    <button onClick={() => setGenSource('youtube')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genSource === 'youtube' ? 'bg-white/10 text-red-400' : 'text-slate-500'}`}>Video</button>
                </div>

                <div className="flex gap-2 items-center">
                    <div className="flex-1">
                        {genSource === 'topic' && <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Enter topic..." className="w-full bg-black/20 rounded-2xl px-4 py-3 text-white text-sm border border-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/50" />}
                        {genSource === 'image' && <button onClick={()=>imageInputRef.current?.click()} className="w-full bg-black/20 rounded-2xl px-4 py-3 text-sm text-slate-400 flex items-center justify-between border border-white/5">{selectedImage ? 'Image Ready' : 'Snap Material'} <Camera size={18}/></button>}
                        {genSource === 'youtube' && <input value={ytLink} onChange={e=>setYtLink(e.target.value)} placeholder="YouTube URL..." className="w-full bg-black/20 rounded-2xl px-4 py-3 text-white text-sm border border-white/5 focus:outline-none" />}
                    </div>
                    <button onClick={handleGenerate} disabled={isGenerating} className="w-12 h-12 bg-cyan-600 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 disabled:opacity-50">
                        {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Wand2 size={20}/>}
                    </button>
                </div>
                <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImagePick} />
           </div>

           {/* Deck List */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 mb-2">Subject Vault</h3>
              {savedDecks.length === 0 ? (
                <div className="bg-[#1e293b]/30 p-12 rounded-[32px] border border-dashed border-white/10 text-center opacity-40">
                  <Layers className="mx-auto mb-4 text-slate-500" size={48} />
                  <p className="text-sm font-medium">No decks found</p>
                </div>
              ) : (
                savedDecks.map(deck => (
                  <div key={deck.id} className="bg-[#1e293b] p-5 rounded-[28px] border border-white/5 relative group active:scale-[0.98] transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div onClick={() => handleOpenDeck(deck)} className="flex-1 cursor-pointer">
                        <h4 className="font-bold text-slate-100 text-lg mb-1">{deck.title}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{deck.cards.length} Cards • {new Date(deck.lastStudied).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => handleRenameDeck(e, deck)} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-cyan-400 transition-colors" title="Rename Deck">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleManageDeck(deck)} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-cyan-400 transition-colors" title="Manage Cards">
                          <Layers size={16} />
                        </button>
                        <button onClick={(e) => handleDeleteDeck(e, deck.id)} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-red-400 transition-colors" title="Delete Deck">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${deck.masteryPercentage}%` }} />
                      </div>
                      <span className="text-xs font-black text-cyan-400">{deck.masteryPercentage}%</span>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>
      )}

      {viewMode === 'study' && (
        <div className="flex-1 flex flex-col p-1 animate-in zoom-in-95 duration-300" data-no-swipe="true">
           {/* Study Controls */}
           <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
              <button onClick={()=>setStudyMode('standard')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap transition-all ${studyMode === 'standard' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-white/5 text-slate-500'}`}><ArrowRightLeft size={14}/> Linear</button>
              <button onClick={()=>setStudyMode('shuffle')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap transition-all ${studyMode === 'shuffle' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-white/5 text-slate-500'}`}><Shuffle size={14}/> Random</button>
              <button onClick={()=>setStudyMode('spaced')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap transition-all ${studyMode === 'spaced' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-white/5 text-slate-500'}`}><Repeat size={14}/> Spaced</button>
           </div>

           {studySessionComplete ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#1e293b] rounded-[40px] border border-white/10 shadow-2xl">
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6"><Trophy size={40}/></div>
                <h3 className="text-2xl font-bold text-white mb-2">Session Complete!</h3>
                <p className="text-slate-400 text-sm mb-8">You've mastered this set. Ready for another round or a new subject?</p>
                <div className="w-full space-y-3">
                  <button onClick={()=>initializeSession(currentDeck!, studyMode)} className="w-full bg-cyan-600 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">Review Again</button>
                  <button onClick={()=>setViewMode('library')} className="w-full bg-white/5 text-slate-400 py-4 rounded-2xl font-bold">Return to Library</button>
                </div>
              </div>
           ) : currentCard && (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center perspective-1000 relative">
                  
                  {/* Card Wrapper for Swipe */}
                  <div 
                    className="relative w-full aspect-[4/5] max-h-[450px] touch-none"
                    onPointerDown={handleDragStart}
                    onPointerMove={handleDragMove}
                    onPointerUp={handleDragEnd}
                    onPointerLeave={(e) => { if(isDragging) handleDragEnd(e) }}
                    style={{ 
                        transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.05}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                    }}
                  >
                     {/* Floating Glassy Progress Indicator */}
                     <div className="absolute top-4 right-4 z-[30] backdrop-blur-xl bg-white/10 border border-white/10 px-4 py-2 rounded-2xl shadow-xl flex flex-col items-center min-w-[60px]">
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest opacity-80 mb-0.5">Card</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-white">{currentIndex + 1}</span>
                          <span className="text-slate-400 text-xs font-bold">/ {reviewQueue.length}</span>
                        </div>
                     </div>

                     {/* Swipe Overlay Indicators */}
                     {swipeOffset > 20 && (
                        <div className="absolute inset-0 z-20 rounded-[40px] bg-emerald-500/20 flex items-center justify-center border-4 border-emerald-500 opacity-0 transition-opacity" style={{ opacity: Math.min(swipeOffset / 100, 1) }}>
                            <div className="bg-emerald-500 text-white p-4 rounded-full shadow-xl">
                                <Check size={48} strokeWidth={4} />
                            </div>
                        </div>
                     )}
                     {swipeOffset < -20 && (
                        <div className="absolute inset-0 z-20 rounded-[40px] bg-red-500/20 flex items-center justify-center border-4 border-red-500 opacity-0 transition-opacity" style={{ opacity: Math.min(Math.abs(swipeOffset) / 100, 1) }}>
                             <div className="bg-red-500 text-white p-4 rounded-full shadow-xl">
                                <X size={48} strokeWidth={4} />
                            </div>
                        </div>
                     )}

                     {/* The Flip Card */}
                     <div 
                        onClick={(e) => {
                            if (Math.abs(swipeOffset) < 5) setIsFlipped(!isFlipped);
                        }}
                        className={`w-full h-full relative transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                     >
                        {/* Front */}
                        <div className="absolute inset-0 backface-hidden bg-[#1e293b] rounded-[40px] border border-white/10 shadow-2xl p-10 flex flex-col items-center justify-center text-center select-none">
                            <span className="absolute top-8 left-10 text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] bg-cyan-500/10 px-3 py-1.5 rounded-full">Concept</span>
                            <div className="max-h-[70%] overflow-y-auto w-full custom-scrollbar flex flex-col items-center justify-center">
                                <div className="prose prose-invert prose-sm max-w-none w-full text-center handwritten-math">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath, remarkGfm]} 
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {preprocessMath(currentCard.front)}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            <p className="absolute bottom-10 text-[9px] text-slate-600 font-bold uppercase tracking-widest">Tap to flip • Swipe to mark</p>
                        </div>
                        {/* Back */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1e293b] rounded-[40px] border border-cyan-500/20 shadow-2xl p-10 flex flex-col items-center justify-center text-center select-none">
                            <span className="absolute top-8 left-10 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] bg-emerald-500/10 px-3 py-1.5 rounded-full">Insight</span>
                            <div className="max-h-[80%] overflow-y-auto w-full pr-2 custom-scrollbar flex flex-col items-center justify-center">
                                <div className="prose prose-invert prose-sm max-w-none w-full text-center handwritten-math">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath, remarkGfm]} 
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {preprocessMath(currentCard.back)}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Subtitle Indicator */}
                <div className="h-16 flex items-center justify-center px-4 mt-4">
                  <div className="text-center opacity-60">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] truncate max-w-[200px]">{currentDeck?.title}</p>
                  </div>
                </div>
              </div>
           )}
        </div>
      )}

      {viewMode === 'manage' && currentDeck && (
        <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
          <div className="flex items-center gap-4 mb-6 px-1">
            <button onClick={()=>setViewMode('library')} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white"><ChevronLeft size={24}/></button>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white truncate">{currentDeck.title}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Managing {currentDeck.cards.length} Cards</p>
            </div>
            <button onClick={()=>setShowAddCardModal(true)} className="p-3 bg-cyan-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all"><Plus size={20}/></button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-24 px-1">
            {currentDeck.cards.map(card => (
              <div key={card.id} className="bg-[#1e293b] p-5 rounded-[24px] border border-white/5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white mb-2 line-clamp-2">{card.front}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{card.back}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { setEditingCard(card); setEditFront(card.front); setEditBack(card.back); }} className="p-2 bg-white/5 rounded-lg text-cyan-400 hover:bg-cyan-400/10 transition-colors"><Edit2 size={14}/></button>
                  <button onClick={() => handleDeleteCard(card.id)} className="p-2 bg-white/5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit/Add Card Modal */}
      {(editingCard || showAddCardModal) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setEditingCard(null); setShowAddCardModal(false); }} />
          <div className="bg-[#1e293b] w-full max-w-sm rounded-[40px] p-8 border border-white/10 shadow-2xl relative z-10">
            <h3 className="text-xl font-bold text-white mb-6">{editingCard ? 'Edit Card' : 'Add New Card'}</h3>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-2 block">Front Side</label>
                <textarea value={editFront} onChange={e=>setEditFront(e.target.value)} className="w-full bg-black/30 rounded-2xl p-4 text-white text-sm border border-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 min-h-[100px]" placeholder="The question or term..."/>
              </div>
              <div>
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 block">Back Side</label>
                <textarea value={editBack} onChange={e=>setEditBack(e.target.value)} className="w-full bg-black/30 rounded-2xl p-4 text-white text-sm border border-white/5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 min-h-[100px]" placeholder="The answer or definition..."/>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setEditingCard(null); setShowAddCardModal(false); }} className="flex-1 py-4 bg-white/5 text-slate-400 font-bold rounded-2xl">Cancel</button>
              <button onClick={editingCard ? handleUpdateCard : handleAddCardToDeck} className="flex-1 py-4 bg-cyan-600 text-white font-bold rounded-2xl shadow-xl">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Deck Modal */}
      {renamingDeck && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-6 animate-in fade-in duration-200">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenamingDeck(null)} />
              <div className="bg-[#1e293b] w-full max-w-sm rounded-[32px] p-6 border border-white/10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-white mb-4">Rename Deck</h3>
                  <input 
                    autoFocus
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmRenameDeck()}
                    className="w-full bg-black/30 rounded-xl px-4 py-3 text-white border border-white/5 focus:outline-none focus:border-cyan-500/50 mb-6"
                    placeholder="Deck title..."
                  />
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setRenamingDeck(null)}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={confirmRenameDeck}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
                      >
                          Rename
                      </button>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
