import { create } from 'zustand';

const STORAGE_KEY = 'focusflight-weekly-goals-v1';
export const validWeeklyGoal = (minutes: number) => Number.isInteger(minutes) && minutes >= 30 && minutes <= 10_080 && minutes % 30 === 0;
function readGoals(): Record<string, number> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, minutes]) => typeof minutes === 'number' && validWeeklyGoal(minutes)));
  } catch { return {}; }
}
export const useWeeklyGoalStore = create<{
  goals: Record<string, number>;
  save: (owner: string, minutes: number | null) => boolean;
}>((set, get) => ({
  goals: readGoals(),
  save: (owner, minutes) => {
    if (minutes !== null && !validWeeklyGoal(minutes)) return false;
    const goals = { ...get().goals };
    if (minutes === null) delete goals[owner]; else goals[owner] = minutes;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(goals)); }
    catch { return false; }
    set({ goals });
    return true;
  },
}));
