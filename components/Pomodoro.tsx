
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Coffee, Brain } from 'lucide-react';
import { getTimerState, saveTimerState } from '../services/storage';

export const Pomodoro: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [initialTime, setInitialTime] = useState(25 * 60);

  // Initialize from storage
  useEffect(() => {
    const saved = getTimerState();
    if (saved) {
        setMode(saved.mode);
        setInitialTime(saved.mode === 'focus' ? 25 * 60 : 5 * 60);

        if (saved.isActive && saved.targetTimestamp) {
            // Check if time has passed
            const now = Date.now();
            const diff = Math.floor((saved.targetTimestamp - now) / 1000);
            
            if (diff > 0) {
                // Resume timer
                setTimeLeft(diff);
                setIsActive(true);
            } else {
                // Timer finished while away
                setTimeLeft(0);
                setIsActive(false);
                // Optionally play bell here if user just opened app, but might be annoying
            }
        } else {
            // Was paused
            setTimeLeft(saved.timeLeft);
            setIsActive(false);
        }
    }
  }, []);

  // Sync state to storage whenever it changes
  useEffect(() => {
    const state = {
        mode,
        timeLeft,
        isActive,
        // If active, save the target finish time. If paused, save null.
        targetTimestamp: isActive ? Date.now() + (timeLeft * 1000) : null,
        lastUpdated: Date.now()
    };
    saveTimerState(state);
  }, [mode, timeLeft, isActive]);

  // robust synthetic bell sound
  const playBell = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const t = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t); 
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.00001, t + 2);
      
      osc.start(t);
      osc.stop(t + 2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, t); 
      gain2.gain.setValueAtTime(0.05, t);
      gain2.gain.exponentialRampToValueAtTime(0.00001, t + 1.5);
      
      osc2.start(t);
      osc2.stop(t + 1.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      playBell();
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    const t = mode === 'focus' ? 25 * 60 : 5 * 60;
    setInitialTime(t);
    setTimeLeft(t);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    const newTime = newMode === 'focus' ? 25 * 60 : 5 * 60;
    setInitialTime(newTime);
    setTimeLeft(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / initialTime) * 100;
  
  const size = 300;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="h-full flex flex-col items-center justify-between py-2 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Mode Switcher */}
        <div className="flex-shrink-0 mt-2 z-20">
            <div className="bg-[#1e293b] p-1 rounded-2xl flex gap-1 border border-white/5 shadow-lg">
                <button
                    onClick={() => switchMode('focus')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${mode === 'focus' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Brain size={14} /> Focus
                </button>
                <button
                    onClick={() => switchMode('break')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${mode === 'break' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Coffee size={14} /> Break
                </button>
            </div>
        </div>

        {/* Timer Display */}
        <div className="flex-1 flex items-center justify-center w-full min-h-0">
             <div className="relative w-full max-w-[280px] max-h-[280px] aspect-square flex items-center justify-center">
                 <div className={`absolute inset-0 rounded-full blur-[60px] opacity-15 transition-colors duration-500 ${mode === 'focus' ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
                 
                 <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl" viewBox={`0 0 ${size} ${size}`}>
                    <circle cx={size/2} cy={size/2} r={radius} stroke="#1e293b" strokeWidth={strokeWidth} fill="transparent" />
                    <circle
                        cx={size/2} cy={size/2} r={radius} stroke="currentColor" strokeWidth={strokeWidth}
                        fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={`transition-all duration-1000 ease-linear ${mode === 'focus' ? 'text-cyan-500' : 'text-emerald-500'}`}
                    />
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div className="text-6xl font-black text-white tracking-tighter tabular-nums mb-1 drop-shadow-lg select-none">
                        {formatTime(timeLeft)}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5 backdrop-blur-md transition-colors duration-300 ${mode === 'focus' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {isActive ? 'Active' : 'Paused'}
                    </div>
                </div>
            </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 w-full max-w-[300px] px-2 flex-shrink-0 mb-4 z-20">
            <button
                onClick={resetTimer}
                className="w-14 h-14 rounded-2xl bg-[#1e293b] border border-white/5 text-slate-400 hover:text-white flex items-center justify-center active:scale-95 transition-all hover:bg-[#283548] shadow-lg"
                aria-label="Reset Timer"
            >
                <RefreshCw size={20} />
            </button>
            
            <button
                onClick={toggleTimer}
                className="flex-1 h-14 bg-white text-[#0f172a] rounded-2xl flex items-center justify-center text-base font-black gap-2 active:scale-95 transition-all shadow-xl hover:shadow-2xl hover:bg-slate-100"
            >
                {isActive ? (
                  <>
                    <Pause size={20} fill="currentColor" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={20} fill="currentColor" className="ml-1" />
                    <span>{mode === 'focus' ? 'Start Focus' : 'Start Break'}</span>
                  </>
                )}
            </button>
        </div>

    </div>
  );
};
