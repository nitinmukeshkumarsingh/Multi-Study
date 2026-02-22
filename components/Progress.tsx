
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Target, Flame, Trophy, Calendar, ChevronRight, Settings, Info, TrendingUp, BookOpen, BrainCircuit, Zap } from 'lucide-react';
import { ViewState, UserStats, Deck } from '../types';
import { getStats, updateDailyGoal, getDecks } from '../services/storage';

interface ProgressProps {
  setView: (view: ViewState) => void;
}

export const Progress: React.FC<ProgressProps> = ({ setView }) => {
  const [stats, setStats] = useState<UserStats>(getStats());
  const [decks, setDecks] = useState<Deck[]>(getDecks());
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(stats.dailyGoal);

  useEffect(() => {
    setStats(getStats());
    setDecks(getDecks());
  }, []);

  const handleGoalSave = () => {
    const updated = updateDailyGoal(newGoal);
    setStats(updated);
    setIsEditingGoal(false);
  };

  const progressPercent = Math.min(Math.round((stats.cardsLearnedToday / stats.dailyGoal) * 100), 100);
  
  const totalAttempts = (stats.totalCardsLearned || 0) + (stats.totalMistakes || 0);
  const retentionRate = totalAttempts > 0 
    ? Math.round((stats.totalCardsLearned / totalAttempts) * 100) 
    : 0;

  return (
    <div className="h-full overflow-y-auto no-scrollbar space-y-6 animate-in slide-in-from-right-10 duration-500 pt-2 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('dashboard')}
          className="p-2 bg-[#1e293b] rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-white">Your Analytics</h2>
      </div>

      {/* Daily Progress Card */}
      <div className="bg-[#1e293b] rounded-[32px] p-6 border border-white/5 shadow-xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 block">Daily Commitment</span>
            <h3 className="text-2xl font-bold text-white">Study Goal</h3>
          </div>
          <button 
            onClick={() => setIsEditingGoal(!isEditingGoal)}
            className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>

        {isEditingGoal ? (
          <div className="mb-6 animate-in fade-in zoom-in-95 duration-200">
             <label className="text-xs text-slate-500 mb-2 block">Set daily cards target:</label>
             <div className="flex gap-3">
                <input 
                  type="number" 
                  value={newGoal}
                  onChange={(e) => setNewGoal(parseInt(e.target.value) || 0)}
                  className="flex-1 bg-black/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  min="1"
                  max="500"
                />
                <button 
                  onClick={handleGoalSave}
                  className="bg-cyan-600 px-6 rounded-xl font-bold text-white hover:bg-cyan-500 transition-colors"
                >
                  Save
                </button>
             </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 mb-8">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                <circle 
                  cx="28" 
                  cy="28" 
                  r="22" 
                  stroke="currentColor" 
                  strokeWidth="6" 
                  fill="transparent" 
                  strokeDasharray={138.23} 
                  strokeDashoffset={138.23 - (progressPercent / 100) * 138.23} 
                  className="text-cyan-500 transition-all duration-1000 ease-out" 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">{progressPercent}%</span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{stats.cardsLearnedToday}</span>
                <span className="text-slate-500 font-medium">/ {stats.dailyGoal}</span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">cards learned today</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 text-orange-400 mb-2">
              <Flame size={16} fill="currentColor" />
              <span className="text-[10px] font-bold uppercase">Current Streak</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.currentStreak} <span className="text-xs text-slate-500">days</span></div>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
             <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <Trophy size={16} />
              <span className="text-[10px] font-bold uppercase">Longest Streak</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.longestStreak} <span className="text-xs text-slate-500">days</span></div>
          </div>
        </div>
      </div>

      {/* Learning Accuracy (Retention) Card */}
      <div className="bg-[#1e293b] rounded-[32px] p-6 border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <BrainCircuit size={80} />
          </div>
          <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                  <Zap size={22} />
              </div>
              <div>
                  <h3 className="text-white font-bold text-lg">Recall Quality</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Accuracy Score</p>
              </div>
          </div>

          <div className="flex items-end justify-between mb-2">
              <div className="text-4xl font-black text-white">{retentionRate}%</div>
              <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-2 py-1 rounded-full">{retentionRate > 80 ? 'EXCELLENT' : retentionRate > 50 ? 'STABLE' : 'NEEDS FOCUS'}</span>
              </div>
          </div>
          
          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden mb-4 border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500 transition-all duration-1000" 
                style={{ width: `${retentionRate}%` }}
              />
          </div>

          <div className="flex justify-between gap-4">
              <div className="flex-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total Learned</p>
                  <p className="text-sm font-bold text-white">{stats.totalCardsLearned || 0}</p>
              </div>
              <div className="flex-1 text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total Mistakes</p>
                  <p className="text-sm font-bold text-slate-400">{stats.totalMistakes || 0}</p>
              </div>
          </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-[#1e293b] rounded-[32px] p-6 border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white flex items-center gap-2 text-lg">
            <TrendingUp size={20} className="text-cyan-400" /> Weekly Trends
          </h3>
          <span className="text-xs text-slate-500 font-medium">Last 7 days</span>
        </div>
        <div className="h-40 flex items-end justify-between gap-2 px-2 pb-2 border-b border-white/5">
            {stats.weeklyActivity.map((count, i) => {
                const max = Math.max(...(stats.weeklyActivity || [1]), 5);
                const height = Math.max((count / max) * 100, 5); 
                const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                const isToday = i === new Date().getDay();
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full">
                        <div className="w-full relative h-full flex items-end">
                          {/* Tooltip on hover */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {count} cards
                          </div>
                          <div 
                              style={{ height: `${height}%` }}
                              className={`w-full max-w-[12px] mx-auto rounded-t-full transition-all duration-700 ${isToday ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'bg-slate-700 group-hover:bg-slate-500'}`}
                          ></div>
                        </div>
                        <span className={`text-[10px] font-bold tracking-tighter ${isToday ? 'text-cyan-400' : 'text-slate-600'}`}>
                            {days[i]}
                        </span>
                    </div>
                );
            })}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-white/5 p-3 rounded-xl">
           <Info size={14} className="flex-shrink-0" />
           <p>Consistency is key! Try to hit your {stats.dailyGoal} card goal every day.</p>
        </div>
      </div>

      {/* Deck Mastery List */}
      <div className="space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2 text-lg px-2">
          <BookOpen size={20} className="text-pink-400" /> Subject Mastery
        </h3>
        <div className="space-y-3">
          {decks.length === 0 ? (
            <div className="bg-[#1e293b] p-8 rounded-[24px] border border-white/5 text-center">
              <p className="text-slate-500 text-sm">No study material yet. Create some flashcards to see mastery stats!</p>
            </div>
          ) : (
            decks.map(deck => (
              <div key={deck.id} className="bg-[#1e293b] p-5 rounded-[24px] border border-white/5">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-white text-sm">{deck.title}</h4>
                  <span className="text-xs font-bold text-cyan-400">{deck.masteryPercentage}%</span>
                </div>
                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${deck.masteryPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-medium">
                  <span>{deck.cards.filter(c => c.mastered).length} mastered</span>
                  <span>{deck.cards.length} total cards</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
