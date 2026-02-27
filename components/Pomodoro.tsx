
import React, { useState } from 'react';
import { Play, Pause, RefreshCw, Coffee, Brain, SlidersHorizontal, X, Clock, Upload } from 'lucide-react';
import { useTimer } from '../src/context/TimerContext';

export const Pomodoro: React.FC = () => {
  const {
    timeLeft, isActive, mode, initialTime, focusDuration, breakDuration, cycleDuration, cycleTimeLeft,
    focusAlarmUrl, breakAlarmUrl, cycleAlarmUrl, playingPreview,
    setFocusDuration, setBreakDuration, setCycleDuration, setCycleTimeLeft, setIsActive,
    setFocusAlarmUrl, setBreakAlarmUrl, setCycleAlarmUrl,
    toggleTimer, resetTimer, switchMode, previewAlarm, stopPreview
  } = useTimer();

  // Configuration State (UI only)
  const [showConfig, setShowConfig] = useState(false);

  const saveConfig = () => {
      stopPreview();
      setShowConfig(false);
      resetTimer();
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'focus' | 'break' | 'cycle') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (type === 'focus') setFocusAlarmUrl(base64);
              if (type === 'break') setBreakAlarmUrl(base64);
              if (type === 'cycle') setCycleAlarmUrl(base64);
          };
          reader.readAsDataURL(file);
      }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCycleTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / initialTime) * 100;
  
  const size = 300;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="h-full flex flex-col items-center justify-between pt-2 pb-10 animate-in fade-in zoom-in-95 duration-500 relative">
        
        {/* Header: Mode Switcher & Config Button */}
        <div className="w-full flex items-center justify-between px-4 mt-2 z-20">
            {/* Mode Switcher */}
            <div className="bg-[#1e293b] p-1 rounded-2xl flex gap-1 border border-white/5 shadow-lg">
                <button
                    onClick={() => switchMode('focus')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${mode === 'focus' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Brain size={14} /> Focus
                </button>
                <button
                    onClick={() => switchMode('break')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${mode === 'break' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Coffee size={14} /> Break
                </button>
            </div>

            {/* Config Button */}
            <button 
                onClick={() => setShowConfig(true)}
                className="p-2.5 bg-[#1e293b] rounded-full text-slate-400 hover:text-white transition-colors border border-white/5 shadow-lg active:scale-95"
            >
                <SlidersHorizontal size={20} />
            </button>
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
        <div className="flex flex-col items-center gap-3 w-full max-w-[300px] px-2 flex-shrink-0 mb-4 z-20">
            {cycleDuration > 0 && (
                <div className="w-full flex items-center justify-between px-2 mb-1">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={12} /> {cycleDuration}h Cycle
                    </span>
                    {cycleTimeLeft !== null && (
                        <span className="text-xs text-cyan-400 font-medium">
                            {formatCycleTime(cycleTimeLeft)} remaining
                        </span>
                    )}
                </div>
            )}
            
            <div className="flex items-center gap-4 w-full">
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
            
            {cycleDuration > 0 && (
                <button
                    onClick={() => {
                        if (cycleTimeLeft !== null) {
                            // Stop cycle
                            setCycleTimeLeft(null);
                            setIsActive(false);
                        } else {
                            // Start cycle
                            setCycleTimeLeft(cycleDuration * 60 * 60);
                            setIsActive(true);
                        }
                    }}
                    className={`w-full h-12 rounded-2xl flex items-center justify-center text-sm font-bold gap-2 active:scale-95 transition-all shadow-lg ${cycleTimeLeft !== null ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20'}`}
                >
                    {cycleTimeLeft !== null ? (
                        <>
                            <X size={16} />
                            <span>Stop Cycle</span>
                        </>
                    ) : (
                        <>
                            <Play size={16} fill="currentColor" />
                            <span>Start {cycleDuration}h Cycle</span>
                        </>
                    )}
                </button>
            )}
        </div>

        {/* Configuration Modal */}
        {showConfig && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-200">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { stopPreview(); setShowConfig(false); }} />
                <div className="bg-[#1e293b] w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[32px] p-6 border border-white/10 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Timer Settings</h3>
                        <button onClick={() => { stopPreview(); setShowConfig(false); }} className="text-slate-400 hover:text-white"><X size={20} /></button>
                    </div>
                    
                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Focus Duration (min)</label>
                            <input 
                                type="number" 
                                min="1" max="120"
                                value={focusDuration}
                                onChange={(e) => setFocusDuration(Number(e.target.value))}
                                className="w-full bg-black/30 rounded-xl px-4 py-3 text-white border border-white/5 focus:outline-none focus:border-cyan-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Break Duration (min)</label>
                            <input 
                                type="number" 
                                min="1" max="60"
                                value={breakDuration}
                                onChange={(e) => setBreakDuration(Number(e.target.value))}
                                className="w-full bg-black/30 rounded-xl px-4 py-3 text-white border border-white/5 focus:outline-none focus:border-cyan-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Study Cycle (hours)</label>
                            <select 
                                value={cycleDuration}
                                onChange={(e) => setCycleDuration(Number(e.target.value))}
                                className="w-full bg-black/30 rounded-xl px-4 py-3 text-white border border-white/5 focus:outline-none focus:border-cyan-500/50 appearance-none"
                            >
                                <option value="0">No Cycle (Manual)</option>
                                <option value="1">1 Hour</option>
                                <option value="2">2 Hours</option>
                                <option value="3">3 Hours</option>
                                <option value="4">4 Hours</option>
                                <option value="5">5 Hours</option>
                                <option value="6">6 Hours</option>
                            </select>
                            <p className="text-[10px] text-slate-500 mt-2">
                                {cycleDuration > 0 ? `Timer will automatically switch between focus and break for ${cycleDuration} hour(s).` : 'You will manually switch between focus and break.'}
                            </p>
                        </div>

                        {/* Alarms */}
                        <div className="pt-4 border-t border-white/10">
                            <h4 className="text-sm font-bold text-white mb-4">Alarms</h4>
                            
                            <div className="space-y-3">
                                {/* Focus Alarm */}
                                <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-300">Focus End</span>
                                        <span className="text-[10px] text-slate-500">{focusAlarmUrl ? 'Custom Audio' : 'Default Alarm'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => previewAlarm(focusAlarmUrl, 'focus')} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-cyan-400 transition-colors">
                                            {playingPreview === 'focus' ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                                        </button>
                                        <label className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors cursor-pointer">
                                            <Upload size={16} />
                                            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e, 'focus')} />
                                        </label>
                                        {focusAlarmUrl && (
                                            <button onClick={() => setFocusAlarmUrl(null)} className="p-2 bg-white/5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Break Alarm */}
                                <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-300">Break End</span>
                                        <span className="text-[10px] text-slate-500">{breakAlarmUrl ? 'Custom Audio' : 'Default Buzzer'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => previewAlarm(breakAlarmUrl, 'break')} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-emerald-400 transition-colors">
                                            {playingPreview === 'break' ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                                        </button>
                                        <label className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors cursor-pointer">
                                            <Upload size={16} />
                                            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e, 'break')} />
                                        </label>
                                        {breakAlarmUrl && (
                                            <button onClick={() => setBreakAlarmUrl(null)} className="p-2 bg-white/5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Cycle Alarm */}
                                <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-300">Cycle End</span>
                                        <span className="text-[10px] text-slate-500">{cycleAlarmUrl ? 'Custom Audio' : 'Default Siren'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => previewAlarm(cycleAlarmUrl, 'cycle')} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-purple-400 transition-colors">
                                            {playingPreview === 'cycle' ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                                        </button>
                                        <label className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors cursor-pointer">
                                            <Upload size={16} />
                                            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e, 'cycle')} />
                                        </label>
                                        {cycleAlarmUrl && (
                                            <button onClick={() => setCycleAlarmUrl(null)} className="p-2 bg-white/5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={saveConfig}
                        className="w-full mt-8 py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-900/20"
                    >
                        Save & Apply
                    </button>
                </div>
            </div>
        )}

    </div>
  );
};
