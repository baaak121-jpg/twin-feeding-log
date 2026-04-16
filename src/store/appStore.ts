import { create } from 'zustand';

export interface AppUser {
  id: string;
  tossUserKey: number;
  aiCredits: number;
}

export interface AppFamily {
  id: string;
  inviteCode: string;
  firstName: string;
  secondName: string;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface AppState {
  user: AppUser | null;
  family: AppFamily | null;
  currentDate: string;
  view: 'timeline' | 'stats';
  selectedBaby: '1' | '2' | 'both';

  setUser: (user: AppUser | null) => void;
  setFamily: (family: AppFamily | null) => void;
  setCurrentDate: (date: string) => void;
  setView: (view: 'timeline' | 'stats') => void;
  setSelectedBaby: (baby: '1' | '2' | 'both') => void;
  decrementAiCredits: () => void;
  setAiCredits: (credits: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  family: null,
  currentDate: todayStr(),
  view: 'timeline',
  selectedBaby: '1',

  setUser: (user) => set({ user }),
  setFamily: (family) => set({ family }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setView: (view) => set({ view }),
  setSelectedBaby: (baby) => set({ selectedBaby: baby }),
  decrementAiCredits: () =>
    set((s) => ({
      user: s.user ? { ...s.user, aiCredits: Math.max(0, s.user.aiCredits - 1) } : null,
    })),
  setAiCredits: (credits) =>
    set((s) => ({ user: s.user ? { ...s.user, aiCredits: credits } : null })),
}));
