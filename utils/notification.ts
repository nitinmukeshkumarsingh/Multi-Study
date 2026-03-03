import { toast as sonnerToast } from 'sonner';

// Create a simple notification sound
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.1); // A5
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.error("Failed to play notification sound", e);
  }
};

export const notify = {
  success: (message: string, description?: string) => {
    playNotificationSound();
    sonnerToast.success(message, { description });
  },
  error: (message: string, description?: string) => {
    playNotificationSound();
    sonnerToast.error(message, { description });
  },
  info: (message: string, description?: string) => {
    playNotificationSound();
    sonnerToast.info(message, { description });
  },
  warning: (message: string, description?: string) => {
    playNotificationSound();
    sonnerToast.warning(message, { description });
  },
  custom: (message: string, options?: any) => {
    playNotificationSound();
    sonnerToast(message, options);
  }
};
