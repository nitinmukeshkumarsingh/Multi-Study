
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getTimerState, saveTimerState } from '../../services/storage';
import { saveAudio, getAudio, deleteAudio } from '../../services/audioDb';

interface TimerContextType {
  timeLeft: number;
  isActive: boolean;
  mode: 'focus' | 'break';
  initialTime: number;
  focusDuration: number;
  breakDuration: number;
  cycleDuration: number;
  cycleTimeLeft: number | null;
  ringingAlarm: 'focus' | 'break' | 'cycle' | null;
  focusAlarmUrl: string | null;
  breakAlarmUrl: string | null;
  cycleAlarmUrl: string | null;
  playingPreview: 'focus' | 'break' | 'cycle' | null;
  
  setTimeLeft: (time: number) => void;
  setIsActive: (active: boolean) => void;
  setMode: (mode: 'focus' | 'break') => void;
  setFocusDuration: (duration: number) => void;
  setBreakDuration: (duration: number) => void;
  setCycleDuration: (duration: number) => void;
  setCycleTimeLeft: (time: number | null) => void;
  setFocusAlarmUrl: (url: string | null) => void;
  setBreakAlarmUrl: (url: string | null) => void;
  setCycleAlarmUrl: (url: string | null) => void;
  
  toggleTimer: () => void;
  resetTimer: () => void;
  switchMode: (newMode: 'focus' | 'break') => void;
  dismissAlarm: () => void;
  playAlarm: (type: 'focus' | 'break' | 'cycle') => void;
  stopActiveAlarm: () => void;
  previewAlarm: (url: string | null, type: 'focus' | 'break' | 'cycle') => void;
  stopPreview: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [initialTime, setInitialTime] = useState(25 * 60);
  
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [cycleDuration, setCycleDuration] = useState(0);
  const [cycleTimeLeft, setCycleTimeLeft] = useState<number | null>(null);
  
  const [focusAlarmUrl, setFocusAlarmUrl] = useState<string | null>(null);
  const [breakAlarmUrl, setBreakAlarmUrl] = useState<string | null>(null);
  const [cycleAlarmUrl, setCycleAlarmUrl] = useState<string | null>(null);
  
  const [ringingAlarm, setRingingAlarm] = useState<'focus' | 'break' | 'cycle' | null>(null);
  
  const [playingPreview, setPlayingPreview] = useState<'focus' | 'break' | 'cycle' | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewCtxRef = useRef<AudioContext | null>(null);
  const previewTimeoutRef = useRef<any>(null);

  const activeAlarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAlarmCtxRef = useRef<AudioContext | null>(null);

  const stopActiveAlarm = () => {
    if (activeAlarmAudioRef.current) {
      activeAlarmAudioRef.current.pause();
      activeAlarmAudioRef.current.currentTime = 0;
      activeAlarmAudioRef.current = null;
    }
    if (activeAlarmCtxRef.current) {
      activeAlarmCtxRef.current.close().catch(e => console.error(e));
      activeAlarmCtxRef.current = null;
    }
  };

  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
    }
    if (previewCtxRef.current) {
      previewCtxRef.current.close().catch(e => console.error(e));
      previewCtxRef.current = null;
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setPlayingPreview(null);
  };

  const playDefaultAlarm = (type: 'focus' | 'break' | 'cycle'): AudioContext | null => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      const ctx = new AudioContextClass();

      const schedulePattern = (startTime: number) => {
        if (ctx.state === 'closed') return;
        
        const t = startTime;
        if (type === 'focus') {
          // Aggressive Digital Alarm Clock (fast beeps) - LOUDER
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1200, t);
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          for (let i = 0; i < 8; i++) {
            const start = t + i * 0.5;
            gain.gain.setValueAtTime(0, start);
            gain.gain.setValueAtTime(0.8, start + 0.05); // Increased gain
            gain.gain.setValueAtTime(0, start + 0.1);
            gain.gain.setValueAtTime(0.8, start + 0.15);
            gain.gain.setValueAtTime(0, start + 0.2);
            gain.gain.setValueAtTime(0.8, start + 0.25);
            gain.gain.setValueAtTime(0, start + 0.3);
          }
          osc.start(t);
          osc.stop(t + 4);
        } else if (type === 'break') {
          // Harsh Buzzer - LOUDER
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sawtooth';
          osc2.type = 'sawtooth';
          osc1.frequency.setValueAtTime(150, t);
          osc2.frequency.setValueAtTime(155, t);
          
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          
          for (let i = 0; i < 4; i++) {
            const start = t + i * 1;
            gain.gain.setValueAtTime(0, start);
            gain.gain.setValueAtTime(0.8, start + 0.1); // Increased gain
            gain.gain.setValueAtTime(0.8, start + 0.6);
            gain.gain.setValueAtTime(0, start + 0.7);
          }
          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 4);
          osc2.stop(t + 4);
        } else {
          // Aggressive Church Bell - LOUDER
          const playSingleBell = (strikeTime: number) => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const osc3 = ctx.createOscillator();
            const osc4 = ctx.createOscillator();
            const masterGain = ctx.createGain();

            osc1.type = 'sine'; osc1.frequency.setValueAtTime(200, strikeTime);
            osc2.type = 'sine'; osc2.frequency.setValueAtTime(540, strikeTime);
            osc3.type = 'sine'; osc3.frequency.setValueAtTime(800, strikeTime);
            osc4.type = 'sine'; osc4.frequency.setValueAtTime(1240, strikeTime);

            osc1.connect(masterGain);
            osc2.connect(masterGain);
            osc3.connect(masterGain);
            osc4.connect(masterGain);
            masterGain.connect(ctx.destination);

            masterGain.gain.setValueAtTime(0, strikeTime);
            masterGain.gain.linearRampToValueAtTime(1.0, strikeTime + 0.01);
            masterGain.gain.exponentialRampToValueAtTime(0.01, strikeTime + 2.0);

            osc1.start(strikeTime);
            osc2.start(strikeTime);
            osc3.start(strikeTime);
            osc4.start(strikeTime);
            osc1.stop(strikeTime + 2.5);
            osc2.stop(strikeTime + 2.5);
            osc3.stop(strikeTime + 2.5);
            osc4.stop(strikeTime + 2.5);
          };

          for (let i = 0; i < 5; i++) {
            playSingleBell(t + i * 0.8);
          }
        }
      };

      // Infinite loop logic
      const runLoop = () => {
        if (ctx.state === 'closed') return;
        schedulePattern(ctx.currentTime);
        setTimeout(runLoop, 4000);
      };

      runLoop();
      return ctx;
    } catch (e) {
      console.error("Audio play failed", e);
      return null;
    }
  };

  const playAlarm = (type: 'focus' | 'break' | 'cycle') => {
    stopActiveAlarm();
    let url = null;
    if (type === 'focus') url = focusAlarmUrl;
    if (type === 'break') url = breakAlarmUrl;
    if (type === 'cycle') url = cycleAlarmUrl;

    if (url) {
      const audio = new Audio(url);
      audio.loop = true;
      activeAlarmAudioRef.current = audio;
      audio.play().catch(e => {
        console.error("Audio play failed", e);
        const ctx = playDefaultAlarm(type);
        if (ctx) activeAlarmCtxRef.current = ctx;
      });
    } else {
      const ctx = playDefaultAlarm(type);
      if (ctx) activeAlarmCtxRef.current = ctx;
    }
  };

  const previewAlarm = (url: string | null, type: 'focus' | 'break' | 'cycle') => {
    if (playingPreview === type) {
      stopPreview();
      return;
    }
    
    stopPreview();
    setPlayingPreview(type);

    if (url) {
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.play().catch(e => console.error("Audio preview failed", e));
      
      previewTimeoutRef.current = setTimeout(() => {
        stopPreview();
      }, 4000);
    } else {
      const ctx = playDefaultAlarm(type);
      if (ctx) {
        previewCtxRef.current = ctx;
      }
      previewTimeoutRef.current = setTimeout(() => {
        stopPreview();
      }, 4000);
    }
  };

  useEffect(() => {
    const saved = getTimerState();
    
    // Load audio from IndexedDB
    getAudio('focusAlarmUrl').then(url => setFocusAlarmUrl(url));
    getAudio('breakAlarmUrl').then(url => setBreakAlarmUrl(url));
    getAudio('cycleAlarmUrl').then(url => setCycleAlarmUrl(url));

    if (saved) {
      setMode(saved.mode);
      setFocusDuration(saved.focusDuration || 25);
      setBreakDuration(saved.breakDuration || 5);
      setCycleDuration(saved.cycleDuration || 0);
      // Removed localStorage loading for alarms
      
      const currentInitialTime = saved.mode === 'focus' ? (saved.focusDuration || 25) * 60 : (saved.breakDuration || 5) * 60;
      setInitialTime(currentInitialTime);

      const now = Date.now();
      if (saved.isActive && saved.targetTimestamp) {
        const diff = Math.floor((saved.targetTimestamp - now) / 1000);
        if (diff > 0) {
          setTimeLeft(diff);
          setIsActive(true);
        } else {
          setTimeLeft(0);
          setIsActive(false);
        }

        if (saved.cycleTargetTimestamp) {
          const cycleDiff = Math.floor((saved.cycleTargetTimestamp - now) / 1000);
          if (cycleDiff > 0) {
            setCycleTimeLeft(cycleDiff);
          } else {
            setCycleTimeLeft(0);
          }
        } else {
          setCycleTimeLeft(saved.cycleTimeLeft !== undefined ? saved.cycleTimeLeft : null);
        }
      } else {
        setTimeLeft(saved.timeLeft);
        setIsActive(false);
        setCycleTimeLeft(saved.cycleTimeLeft !== undefined ? saved.cycleTimeLeft : null);
      }
    }
  }, []);

  // Sync state to storage whenever it changes (excluding audio URLs)
  useEffect(() => {
    const state = {
      mode,
      timeLeft,
      isActive,
      targetTimestamp: isActive ? Date.now() + (timeLeft * 1000) : null,
      lastUpdated: Date.now(),
      focusDuration,
      breakDuration,
      cycleDuration,
      cycleTimeLeft,
      cycleTargetTimestamp: (isActive && cycleTimeLeft !== null) ? Date.now() + (cycleTimeLeft * 1000) : null,
      focusAlarmUrl: null,
      breakAlarmUrl: null,
      cycleAlarmUrl: null
    };
    saveTimerState(state);
  }, [mode, timeLeft, isActive, focusDuration, breakDuration, cycleDuration, cycleTimeLeft]);

  // Sync audio URLs to IndexedDB
  useEffect(() => {
    if (focusAlarmUrl) {
      saveAudio('focusAlarmUrl', focusAlarmUrl).catch(e => console.error("Failed to save focus alarm", e));
    } else {
      deleteAudio('focusAlarmUrl').catch(e => console.error("Failed to delete focus alarm", e));
    }
  }, [focusAlarmUrl]);

  useEffect(() => {
    if (breakAlarmUrl) {
      saveAudio('breakAlarmUrl', breakAlarmUrl).catch(e => console.error("Failed to save break alarm", e));
    } else {
      deleteAudio('breakAlarmUrl').catch(e => console.error("Failed to delete break alarm", e));
    }
  }, [breakAlarmUrl]);

  useEffect(() => {
    if (cycleAlarmUrl) {
      saveAudio('cycleAlarmUrl', cycleAlarmUrl).catch(e => console.error("Failed to save cycle alarm", e));
    } else {
      deleteAudio('cycleAlarmUrl').catch(e => console.error("Failed to delete cycle alarm", e));
    }
  }, [cycleAlarmUrl]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        if (cycleTimeLeft !== null && cycleTimeLeft > 0) {
          setCycleTimeLeft((prev) => (prev !== null ? prev - 1 : null));
        }
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (cycleDuration > 0 && cycleTimeLeft !== null && cycleTimeLeft <= 0) {
        playAlarm('cycle');
        setRingingAlarm('cycle');
      } else {
        playAlarm(mode);
        setRingingAlarm(mode);
      }
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, cycleDuration, cycleTimeLeft, focusAlarmUrl, breakAlarmUrl, cycleAlarmUrl]);

  const dismissAlarm = () => {
    stopActiveAlarm();
    const finishedAlarm = ringingAlarm;
    setRingingAlarm(null);

    if (finishedAlarm === 'cycle') {
      setCycleTimeLeft(null);
      setCycleDuration(0);
      resetTimer();
    } else if (cycleDuration > 0 && cycleTimeLeft !== null && cycleTimeLeft > 0) {
      const nextMode = mode === 'focus' ? 'break' : 'focus';
      const nextTime = nextMode === 'focus' ? focusDuration * 60 : breakDuration * 60;
      setMode(nextMode);
      setInitialTime(nextTime);
      setTimeLeft(nextTime);
      setIsActive(true);
    } else {
      const nextMode = mode === 'focus' ? 'break' : 'focus';
      const nextTime = nextMode === 'focus' ? focusDuration * 60 : breakDuration * 60;
      setMode(nextMode);
      setInitialTime(nextTime);
      setTimeLeft(nextTime);
    }
  };

  const toggleTimer = () => {
    if (!isActive && cycleDuration > 0 && cycleTimeLeft === null) {
      setCycleTimeLeft(cycleDuration * 60 * 60);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    const t = mode === 'focus' ? focusDuration * 60 : breakDuration * 60;
    setInitialTime(t);
    setTimeLeft(t);
    setCycleTimeLeft(null);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    const newTime = newMode === 'focus' ? focusDuration * 60 : breakDuration * 60;
    setInitialTime(newTime);
    setTimeLeft(newTime);
  };

  return (
    <TimerContext.Provider value={{
      timeLeft, isActive, mode, initialTime, focusDuration, breakDuration, cycleDuration, cycleTimeLeft, ringingAlarm,
      focusAlarmUrl, breakAlarmUrl, cycleAlarmUrl, playingPreview,
      setTimeLeft, setIsActive, setMode, setFocusDuration, setBreakDuration, setCycleDuration, setCycleTimeLeft,
      setFocusAlarmUrl, setBreakAlarmUrl, setCycleAlarmUrl,
      toggleTimer, resetTimer, switchMode, dismissAlarm, playAlarm, stopActiveAlarm, previewAlarm, stopPreview
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
