
import React, { useEffect, useState } from 'react';
import { ViewState, UserStats } from '../types';
import { ArrowRight, ChevronRight, Calculator, Video, Network, Star, NotebookPen } from 'lucide-react';
import { getStats } from '../services/storage';

interface DashboardProps {
  setView: (view: ViewState) => void;
}

const ActionCard = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  colorClass, 
  onClick 
}: { 
  icon: any, 
  title: string, 
  subtitle: string, 
  colorClass: string,
  onClick: () => void 
}) => (
  <button 
    onClick={onClick}
    className="bg-[#1e293b] p-5 rounded-[28px] flex flex-col items-start text-left gap-4 hover:bg-[#27354f] transition-all group relative overflow-hidden border border-white/5 active:scale-[0.97]"
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 ${colorClass.replace('text-', 'bg-')}`} />
    
    <div className={`p-3 rounded-2xl ${colorClass} bg-white/5`}>
        <Icon size={26} className={colorClass} />
    </div>
    <div>
        <h3 className="text-[14px] font-bold text-slate-100 leading-tight">{title}</h3>
        <p className="text-[9px] text-slate-500 mt-1 font-bold uppercase tracking-tight">{subtitle}</p>
    </div>
  </button>
);

export const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    setStats(getStats());
  }, []);

  const dailyGoal = stats?.dailyGoal || 20;
  const cardsToday = stats?.cardsLearnedToday || 0;
  const progressPercent = Math.min(Math.round((cardsToday / dailyGoal) * 100), 100);

  const size = 48;
  const strokeWidth = 4;
  const center = size / 2;
  const radius = 18; 
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="h-full overflow-y-auto no-scrollbar space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-1 pb-6">
      
      {/* Compact Hero "Ace your exams" Card */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 p-5 shadow-xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none transform rotate-12 translate-x-4">
            <Star size={100} fill="currentColor" className="text-white" />
        </div>
        <div className="relative z-10 flex flex-col gap-4">
            <div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] font-black uppercase tracking-widest text-white mb-2 inline-block backdrop-blur-md border border-white/10">
                    MUKTI STUDY 🔥
                </span>
                <h2 className="text-xl font-bold text-white leading-tight">
                    Ace your upcoming exams<br/><span className="text-blue-200">with live AI tutoring</span>
                </h2>
            </div>
            
            <button 
                onClick={() => setView('chat')}
                className="self-start bg-white text-blue-700 font-black py-2.5 px-6 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2 text-xs"
            >
                Start Learning <ArrowRight size={14} />
            </button>
        </div>
      </section>

      {/* Progress Tracker - Compact */}
      <button 
        onClick={() => setView('progress')}
        className="w-full group px-1"
      >
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Statistics</h3>
            <ChevronRight size={12} className="text-slate-600 group-hover:text-white transition-colors" />
        </div>
        <div className="bg-[#1e293b] rounded-[24px] p-4 border border-white/5 flex items-center justify-between group-hover:bg-[#233045] transition-all shadow-md active:scale-[0.99]">
            <div className="flex items-center gap-4 text-left">
                <div className="relative w-12 h-12">
                     <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                        <circle cx={center} cy={center} r={radius} stroke="#0f172a" strokeWidth={strokeWidth} fill="transparent" />
                        <circle 
                            cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" 
                            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
                            className="text-cyan-400 transition-all duration-1000 ease-out" strokeLinecap="round" 
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">{progressPercent}%</span>
                </div>
                <div>
                    <h4 className="font-bold text-slate-100 text-sm">Daily Goal</h4>
                    <p className="text-[10px] text-slate-500 font-medium">{cardsToday} / {dailyGoal} learned</p>
                </div>
            </div>
            <div className="text-right bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                <span className="block text-lg font-black text-white">{cardsToday}</span>
                <span className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Done</span>
            </div>
        </div>
      </button>

      {/* Grid of Tools */}
      <div className="px-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Power Tools</h3>
        <div className="grid grid-cols-2 gap-3">
            <ActionCard 
                icon={Video} 
                title="Video Tutor" 
                subtitle="Live Link" 
                colorClass="text-cyan-400"
                onClick={() => setView('video-tutor')}
            />
            <ActionCard 
                icon={Calculator} 
                title="Problem Solver" 
                subtitle="Visual AI" 
                colorClass="text-emerald-400"
                onClick={() => setView('solver')}
            />
            <ActionCard 
                icon={NotebookPen} 
                title="Smart Notes" 
                subtitle="AI Summaries" 
                colorClass="text-orange-400"
                onClick={() => setView('notes')}
            />
            <ActionCard 
                icon={Network} 
                title="AI Visualiser" 
                subtitle="Concept Maps" 
                colorClass="text-pink-400"
                onClick={() => setView('diagrams')}
            />
        </div>
      </div>
    </div>
  );
};
