
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  mastered: boolean;
}

export interface Deck {
  id: string;
  title: string;
  cards: Flashcard[];
  createdAt: number;
  lastStudied: number;
  masteryPercentage: number;
}

export interface UserStats {
  cardsLearnedToday: number;
  mistakesToday: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // ISO date string YYYY-MM-DD
  totalCardsLearned: number;
  totalMistakes: number;
  weeklyActivity: number[]; // Array of 7 numbers (Sun-Sat)
  dailyGoal: number;
}

export interface UserSettings {
  name: string;
  academicLevel: string;
  profileImage: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  summary?: string;
  createdAt: number;
}

export type ViewState = 'dashboard' | 'chat' | 'flashcards' | 'pomodoro' | 'notes' | 'progress' | 'diagrams' | 'solver' | 'settings' | 'video-tutor';

export enum StudyMode {
  Standard = 'Standard',
  ExamPrep = 'ExamPrep',
  Creative = 'Creative'
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
