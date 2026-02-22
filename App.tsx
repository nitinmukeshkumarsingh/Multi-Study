
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

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
    </Layout>
  );
};

export default App;
