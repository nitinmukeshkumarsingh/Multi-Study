
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ChatAssistant } from './components/ChatAssistant';
import { Flashcards } from './components/Flashcards';
import { Pomodoro } from './components/Pomodoro';
import { Notes } from './components/Notes';
import { Progress } from './components/Progress';
import { DiagramGenerator } from './components/DiagramGenerator';
import { ProblemSolver } from './components/ProblemSolver';
import { Settings } from './components/Settings';
import { VideoTutor } from './components/VideoTutor';
import { ViewState } from './types';
import { initStoragePersistence } from './services/storage';
import { useTimer } from './src/context/TimerContext';
import { Bell } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const { ringingAlarm, dismissAlarm } = useTimer();

  useEffect(() => {
    initStoragePersistence();
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard setView={setCurrentView} />;
      case 'chat':
        return <ChatAssistant />;
      case 'flashcards':
        return <Flashcards />;
      case 'pomodoro':
        return <Pomodoro />;
      case 'notes':
        return <Notes />;
      case 'progress':
        return <Progress setView={setCurrentView} />;
      case 'diagrams':
        return <DiagramGenerator />;
      case 'solver':
        return <ProblemSolver onBack={() => setCurrentView('dashboard')} />;
      case 'settings':
        return <Settings onBack={() => setCurrentView('dashboard')} />;
      case 'video-tutor':
        return <VideoTutor onBack={() => setCurrentView('dashboard')} />;
      default:
        return <Dashboard setView={setCurrentView} />;
    }
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView}>
      {renderView()}

      {/* Global Ringing Alarm Modal */}
      {ringingAlarm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 animate-in fade-in duration-300 bg-black/80 backdrop-blur-md">
          <div className="bg-[#1e293b] w-full max-w-sm rounded-[32px] p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-pulse ${
              ringingAlarm === 'focus' ? 'bg-cyan-500/20 text-cyan-400' :
              ringingAlarm === 'break' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-purple-500/20 text-purple-400'
            }`}>
              <Bell size={48} className="animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              {ringingAlarm === 'focus' ? 'Focus Session Complete!' : 
               ringingAlarm === 'break' ? 'Break Time Over!' : 
               'Study Cycle Finished!'}
            </h2>
            <p className="text-slate-400 mb-8">
              {ringingAlarm === 'focus' ? 'Great job! Time to take a well-deserved break.' : 
               ringingAlarm === 'break' ? 'Ready to get back to work?' : 
               'You have completed your entire study cycle. Amazing work!'}
            </p>
            <button 
              onClick={dismissAlarm}
              className={`w-full py-4 rounded-xl font-bold text-white transition-colors shadow-lg text-lg ${
                ringingAlarm === 'focus' ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/20' :
                ringingAlarm === 'break' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' :
                'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20'
              }`}
            >
              Stop Alarm
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
