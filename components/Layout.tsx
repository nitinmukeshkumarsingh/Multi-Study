
import React, { useState, useEffect, useRef } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, MessageSquare, Layers, Clock, NotebookPen, User } from 'lucide-react';
import { getSettings, getTimerState } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const mainViews: ViewState[] = ['dashboard', 'chat', 'flashcards', 'notes', 'pomodoro'];

const NavItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ElementType, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className="flex-1 flex flex-col items-center justify-center h-full transition-all active:scale-90 relative"
  >
    <div className={`flex flex-col items-center transition-all duration-300 ${
      active ? 'text-cyan-400 -translate-y-1' : 'text-slate-500'
    }`}>
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[10px] font-bold mt-1 tracking-tight transition-opacity duration-300 ${
        active ? 'opacity-100' : 'opacity-60'
      }`}>
        {label}
      </span>
    </div>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView }) => {
  const [settings, setSettings] = useState(getSettings());
  const [timerState, setTimerState] = useState<{ active: boolean, mode: 'focus' | 'break' }>({ active: false, mode: 'focus' });
  
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setSettings(getSettings());
      const timer = getTimerState();
      setTimerState({
        active: !!(timer && timer.isActive),
        mode: timer?.mode || 'focus'
      });
    };
    
    const interval = setInterval(handleUpdate, 1000); 
    window.addEventListener('storage', handleUpdate);
    return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 21) return "Good Evening";
    return "Good Night";
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Disable swipe if target or any parent has data-no-swipe
    if ((e.target as HTMLElement).closest('[data-no-swipe]')) return;
    
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.clientX;
    const touchEndY = e.clientY;

    const deltaX = touchStartX.current - touchEndX;
    const deltaY = touchStartY.current - touchEndY;

    // Check if horizontal swipe is more significant than vertical scroll
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const isMainView = mainViews.includes(currentView);
      if (!isMainView) return;

      const currentIndex = mainViews.indexOf(currentView);
      
      if (deltaX > 0 && currentIndex < mainViews.length - 1) {
        // Swipe left -> next view
        setView(mainViews[currentIndex + 1]);
      } else if (deltaX < 0 && currentIndex > 0) {
        // Swipe right -> previous view
        setView(mainViews[currentIndex - 1]);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const showHeader = currentView === 'dashboard' || currentView === 'chat';
  const showNav = currentView !== 'video-tutor';

  return (
    <div 
      className="h-[100dvh] w-screen bg-[#0b1221] text-white font-sans overflow-hidden flex justify-center selection:bg-cyan-500/30"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        touchStartX.current = null;
        touchStartY.current = null;
      }}
      style={{ touchAction: 'pan-y' }}
    >
      
      {/* Background Ambient Glow */}
      <div className="fixed top-0 left-0 right-0 h-screen bg-gradient-to-b from-blue-900/10 via-transparent to-transparent pointer-events-none z-0" />

      <main className="relative z-10 w-full max-w-md h-full flex flex-col bg-[#0b1221] shadow-[0_0_100px_rgba(0,0,0,0.5)] border-x border-white/5">
        
        {/* Persistent Header */}
        {showHeader && (
          <header className="flex-shrink-0 flex items-center justify-between px-6 pt-6 pb-2 bg-[#0b1221]/80 backdrop-blur-2xl border-b border-white/5 z-50">
              <div className="flex flex-col min-w-0 flex-1 mr-4">
                  <h1 className="text-lg font-bold tracking-tight text-white leading-tight truncate">
                      {getGreeting()}, <span className="text-cyan-100">{settings.name}</span>
                  </h1>
              </div>
              <div className="flex items-center gap-4">
                  <div className="relative">
                    <button 
                        onClick={() => setView('settings')}
                        className="w-10 h-10 rounded-[14px] bg-gradient-to-tr from-cyan-500 to-blue-600 border border-white/20 overflow-hidden flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-cyan-950/40"
                    >
                        {settings.profileImage ? (
                            <img src={settings.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={20} className="text-white" />
                        )}
                    </button>
                    {timerState.active && (
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0b1221] flex items-center justify-center shadow-lg animate-pulse z-10 ${
                        timerState.mode === 'focus' ? 'bg-cyan-500' : 'bg-emerald-500'
                      }`}>
                        <Clock size={8} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
              </div>
          </header>
        )}

        {/* Content Area - STRICT FLEX GROWTH TO PREVENT PAGE SCROLL */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col px-4 pt-4 min-h-0">
            {children}
        </div>

        {/* Full-width Attached Native Bottom Navigation */}
        {showNav && (
          <nav className="flex-shrink-0 w-full bg-[#0f172a]/90 backdrop-blur-3xl border-t border-white/10 px-4 pt-3 pb-8 flex items-center justify-between z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
            <NavItem 
              icon={LayoutDashboard} 
              label="Home" 
              active={currentView === 'dashboard'} 
              onClick={() => setView('dashboard')} 
            />
            <NavItem 
              icon={MessageSquare} 
              label="Tutor" 
              active={currentView === 'chat'} 
              onClick={() => setView('chat')} 
            />
            <NavItem 
              icon={Layers} 
              label="Cards" 
              active={currentView === 'flashcards'} 
              onClick={() => setView('flashcards')} 
            />
            <NavItem 
              icon={NotebookPen} 
              label="Notes" 
              active={currentView === 'notes'} 
              onClick={() => setView('notes')} 
            />
            <NavItem 
              icon={Clock} 
              label="Focus" 
              active={currentView === 'pomodoro'} 
              onClick={() => setView('pomodoro')} 
            />
          </nav>
        )}
      </main>
    </div>
  );
};

