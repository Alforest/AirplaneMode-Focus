import { WeeklyGoalProgress } from './WeeklyGoal';
import { useWeeklyGoalStore } from '../../store/weeklyGoalStore';
import { useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { useHistoryStore } from '../../store/historyStore';
import { useAccountUI } from '../../store/accountUIStore';
import { personalStats, personalTime } from '../../utils/personalStats';

export default function PersonalWelcome() {
  const guestGoal = useWeeklyGoalStore(state => state.goals.guest);
  const user = useAuthStore(state => state.user);
  const profile = useProfileStore(state => state.profile);
  const flights = useHistoryStore(state => state.flights);
  const open = useAccountUI(state => state.open);
  const stats = useMemo(() => personalStats(flights), [flights]);
  if (!user && !guestGoal) return null;
  return <div className="mb-5 rounded-xl border border-gold/15 bg-midnight/70 px-4 py-3">
    <button type="button" onClick={() => open('welcome')} className="text-left text-sm text-gold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">{user ? profile ? `Welcome back, ${profile.nickname}.` : 'Welcome aboard. Make this terminal yours →' : 'Your weekly flight plan →'}</button>
    <p className="mt-1 text-xs text-muted-white/60">{personalTime(stats.weekMinutes)} studied this week · {stats.flightCount} {stats.flightCount === 1 ? 'flight' : 'flights'} landed{profile?.home_airport ? ` · Home base ${profile.home_airport}` : ''}</p>
    <WeeklyGoalProgress compact />
  </div>;
}
