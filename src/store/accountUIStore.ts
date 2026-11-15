import { create } from 'zustand';
import { track } from '../lib/analytics';
import { useAuthStore } from './authStore';
import { useProfileStore } from './profileStore';
import { useHistoryStore } from './historyStore';
import { useWeeklyGoalStore } from './weeklyGoalStore';

type AccountSource = 'homepage_header' | 'departures_header' | 'flight_log' | 'welcome' | 'goal_prompt' | 'challenge_profile' | 'oauth_return' | 'unknown';
function context() {
  const owner = useHistoryStore.getState().owner;
  return {
    signed_in: !!useAuthStore.getState().user,
    has_profile: !!useProfileStore.getState().profile,
    has_weekly_goal: !!useWeeklyGoalStore.getState().goals[owner],
  };
}
export const useAccountUI = create<{
  isOpen: boolean;
  source: AccountSource;
  openedAt: number;
  open: (source?: AccountSource) => void;
  close: (reason?: 'close_button' | 'escape' | 'backdrop' | 'native') => void;
}>((set, get) => ({
  isOpen: false, source: 'unknown', openedAt: 0,
  open: (source = 'unknown') => {
    if (get().isOpen) return;
    track('account_opened', { source, ...context() });
    set({ isOpen: true, source, openedAt: Date.now() });
  },
  close: (reason = 'native') => {
    if (!get().isOpen) return;
    track('account_closed', { source: get().source, reason, duration_seconds: Math.max(0, Math.round((Date.now() - get().openedAt) / 1000)), ...context() });
    set({ isOpen: false });
  },
}));
