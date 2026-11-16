import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';
import { useWeeklyGoalStore, CloudGoal } from '../store/weeklyGoalStore';

export function syncWeeklyGoal(): Promise<void> {
  const client = supabase;
  const owner = useAuthStore.getState().user?.id;
  if (!client || !owner) return Promise.resolve();
  const stillCurrent = () => useAuthStore.getState().user?.id === owner;
  return useWeeklyGoalStore.getState().sync(owner, {
    read: async () => {
      const { data, error } = await client.from('weekly_study_goals').select('goal_minutes, revision').eq('user_id', owner).maybeSingle();
      if (error) throw error;
      return data as CloudGoal | null;
    },
    write: async (minutes, expected) => {
      if (!stillCurrent()) throw new Error('Account changed');
      const { data, error } = await client.rpc('save_weekly_study_goal', { p_owner: owner, p_minutes: minutes, p_expected_revision: expected });
      if (error) throw error;
      return data as CloudGoal & { applied: boolean };
    },
  }, stillCurrent);
}
