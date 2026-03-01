
import { Deck, Flashcard, UserStats, Note, UserSettings, ChatMessage } from '../types';

const KEYS = {
  STATS: 'lumina_stats',
  DECKS: 'lumina_decks',
  NOTES: 'lumina_notes',
  SETTINGS: 'lumina_settings',
  API_KEY: 'lumina_custom_api_key',
  TIMER: 'lumina_timer_state'
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

// Request Persistent Storage from Browser
export const initStoragePersistence = async () => {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      await navigator.storage.persist();
    }
  }
};

export const getSettings = (): UserSettings => {
  const stored = localStorage.getItem(KEYS.SETTINGS);
  const defaultSettings: UserSettings = {
    name: 'Student',
    academicLevel: 'High School',
    profileImage: null,
    aiProvider: 'gemini',
    textModel: 'groq:qwen/qwen3-32b',
    mediaModel: 'groq:meta-llama/llama-4-scout-17b-16e-instruct',
    diagramModel: 'imagen-4'
  };
  if (stored) {
    const parsed = JSON.parse(stored);
    // Migration for mediaModel ID change
    if (parsed.mediaModel === 'groq:llama-4-scout-17b-instruct') {
      parsed.mediaModel = 'groq:meta-llama/llama-4-scout-17b-16e-instruct';
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(parsed));
    }
    return parsed;
  }
  return defaultSettings;
};

export const saveSettings = (settings: UserSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

export const getCustomApiKey = (): string => {
  return localStorage.getItem(KEYS.API_KEY) || '';
};

export const saveCustomApiKey = (key: string) => {
  localStorage.setItem(KEYS.API_KEY, key);
};

export const getActiveApiKey = (): string => {
  const settings = getSettings();
  const custom = getCustomApiKey();
  
  // If we have a manual key in settings for the specific provider, use it
  if (settings.aiProvider === 'gemini' && settings.geminiKey) return settings.geminiKey;
  if (settings.aiProvider === 'groq' && settings.groqKey) return settings.groqKey;
  if (settings.aiProvider === 'openrouter' && settings.openrouterKey) return settings.openrouterKey;

  // Fallback to the old custom key (which was Gemini only)
  if (settings.aiProvider === 'gemini' && custom) return custom;

  // Fallback to environment variables
  if (settings.aiProvider === 'gemini') return process.env.GEMINI_API_KEY || '';
  if (settings.aiProvider === 'groq') return process.env.GROQ_API_KEY || '';
  if (settings.aiProvider === 'openrouter') return process.env.OPENROUTER_API_KEY || '';

  return '';
};

export const getGeminiKey = (): string => {
  const settings = getSettings();
  const custom = getCustomApiKey();
  return settings.geminiKey || custom || process.env.GEMINI_API_KEY || '';
};

export const getStats = (): UserStats => {
  const stored = localStorage.getItem(KEYS.STATS);
  const defaultStats: UserStats = {
    cardsLearnedToday: 0,
    mistakesToday: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: '',
    totalCardsLearned: 0,
    totalMistakes: 0,
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0], // Sun - Sat
    dailyGoal: 20
  };

  if (!stored) return defaultStats;

  const stats = JSON.parse(stored);
  const today = getTodayDate();

  // Reset daily counters if new day
  if (stats.lastStudyDate !== today) {
    stats.cardsLearnedToday = 0;
    stats.mistakesToday = 0;
  }
  
  // Ensure dailyGoal and mistake fields exist for older stored stats
  if (stats.dailyGoal === undefined) stats.dailyGoal = 20;
  if (stats.mistakesToday === undefined) stats.mistakesToday = 0;
  if (stats.totalMistakes === undefined) stats.totalMistakes = 0;

  return stats;
};

export const updateStats = (learned: boolean): UserStats => {
  const stats = getStats();
  const today = getTodayDate();
  const todayIndex = new Date().getDay(); // 0 (Sun) - 6 (Sat)

  // Update Activity
  if (learned) {
      stats.cardsLearnedToday += 1;
      stats.totalCardsLearned += 1;
      stats.weeklyActivity[todayIndex] = (stats.weeklyActivity[todayIndex] || 0) + 1;
  } else {
      stats.mistakesToday += 1;
      stats.totalMistakes += 1;
  }

  // Streak Logic
  if (stats.lastStudyDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (stats.lastStudyDate === yesterdayStr) {
          stats.currentStreak += 1;
      } else {
          stats.currentStreak = 1;
      }

      if (stats.currentStreak > stats.longestStreak) {
          stats.longestStreak = stats.currentStreak;
      }
      
      stats.lastStudyDate = today;
  }

  localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  return stats;
};

export const updateDailyGoal = (goal: number): UserStats => {
  const stats = getStats();
  stats.dailyGoal = goal;
  localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  return stats;
};

export const getDecks = (): Deck[] => {
    const stored = localStorage.getItem(KEYS.DECKS);
    return stored ? JSON.parse(stored) : [];
};

export const saveDeck = (deck: Deck) => {
    const decks = getDecks();
    const existingIndex = decks.findIndex(d => d.id === deck.id);
    
    // Calculate mastery
    const masteredCount = deck.cards.filter(c => c.mastered).length;
    deck.masteryPercentage = Math.round((masteredCount / deck.cards.length) * 100) || 0;
    deck.lastStudied = Date.now();

    if (existingIndex >= 0) {
        decks[existingIndex] = deck;
    } else {
        decks.unshift(deck); // Add to top
    }
    
    if (decks.length > 20) decks.pop();

    localStorage.setItem(KEYS.DECKS, JSON.stringify(decks));
};

export const deleteDeck = (id: string) => {
    const decks = getDecks().filter(d => d.id !== id);
    localStorage.setItem(KEYS.DECKS, JSON.stringify(decks));
    return decks;
};

export const getNotes = (): Note[] => {
    const stored = localStorage.getItem(KEYS.NOTES);
    return stored ? JSON.parse(stored) : [];
};

export const saveNote = (note: Note) => {
    const notes = getNotes();
    const index = notes.findIndex(n => n.id === note.id);
    if (index >= 0) {
        notes[index] = note;
    } else {
        notes.unshift(note);
    }
    localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
    return notes;
};

export const deleteNote = (id: string) => {
    const notes = getNotes().filter(n => n.id !== id);
    localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
    return notes;
};

// --- TIMER PERSISTENCE ---
export interface TimerState {
    mode: 'focus' | 'break';
    timeLeft: number;
    isActive: boolean;
    targetTimestamp: number | null; // Null if paused, Epoch ms if running
    lastUpdated: number;
    focusDuration?: number;
    breakDuration?: number;
    cycleDuration?: number;
    cycleTimeLeft?: number | null;
    cycleTargetTimestamp?: number | null;
    focusAlarmUrl?: string | null;
    breakAlarmUrl?: string | null;
    cycleAlarmUrl?: string | null;
}

export const getGroqUsage = (): number => {
  const usage = localStorage.getItem('lumina_groq_usage');
  return usage ? parseInt(usage, 10) : 0;
};

export const updateGroqUsage = (tokens: number) => {
  const current = getGroqUsage();
  const newUsage = current + tokens;
  // Reset if we exceed the cycle (500k + 500k + 500k + 500k + 500k = 2.5M)
  if (newUsage > 2500000) {
    localStorage.setItem('lumina_groq_usage', '0');
  } else {
    localStorage.setItem('lumina_groq_usage', newUsage.toString());
  }
};

export const getTimerState = (): TimerState | null => {
    const stored = localStorage.getItem(KEYS.TIMER);
    if (stored) {
        const parsed = JSON.parse(stored);
        return {
            ...parsed,
            focusDuration: parsed.focusDuration || 25,
            breakDuration: parsed.breakDuration || 5,
            cycleDuration: parsed.cycleDuration || 0,
            cycleTimeLeft: parsed.cycleTimeLeft !== undefined ? parsed.cycleTimeLeft : null,
            cycleTargetTimestamp: parsed.cycleTargetTimestamp !== undefined ? parsed.cycleTargetTimestamp : null,
            focusAlarmUrl: parsed.focusAlarmUrl || null,
            breakAlarmUrl: parsed.breakAlarmUrl || null,
            cycleAlarmUrl: parsed.cycleAlarmUrl || null
        };
    }
    return null;
};

export const saveTimerState = (state: TimerState) => {
    localStorage.setItem(KEYS.TIMER, JSON.stringify(state));
};
