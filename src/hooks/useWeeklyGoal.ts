import { useEffect, useState } from 'react';
import { useHistoryStore } from '../store/historyStore';
import { useWeeklyGoalStore } from '../store/weeklyGoalStore';
import { personalStats } from '../utils/personalStats';

export function useWeeklyGoal() {
  const owner = useHistoryStore(state => state.owner);
  const flights = useHistoryStore(state => state.flights);
  const goal = useWeeklyGoalStore(state => state.goals[owner] ?? null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); };
  }, []);
  const minutes = personalStats(flights, now).weekMinutes;
  return { owner, goal, minutes, remaining: goal ? Math.max(0, goal - minutes) : 0, percent: goal ? Math.min(100, Math.floor(minutes / goal * 100)) : 0 };
}
