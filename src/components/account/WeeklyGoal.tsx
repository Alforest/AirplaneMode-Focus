import { track } from '../../lib/analytics';
import { useAnalyticsExposure } from '../../hooks/useAnalyticsExposure';
import { useState } from 'react';
import { useWeeklyGoal } from '../../hooks/useWeeklyGoal';
import { useWeeklyGoalStore } from '../../store/weeklyGoalStore';
import { useAccountUI } from '../../store/accountUIStore';
import { personalTime } from '../../utils/personalStats';

export function WeeklyGoalProgress({ compact = false }: { compact?: boolean }) {
  const { goal, minutes, remaining, percent } = useWeeklyGoal();
  const open = useAccountUI(state => state.open);
  if (!goal) return compact ? <button type="button" onClick={() => open('goal_prompt')} className="mt-3 text-xs text-gold/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">Set a weekly study goal →</button> : null;
  return <div className={compact ? 'mt-3' : 'rounded-xl border border-gold/20 bg-gold/5 p-4 text-left'}>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="text-gold">{remaining === 0 ? '✓ Weekly goal reached' : 'Your weekly flight plan'}</span>
      <span className="font-mono text-muted-white/70">{personalTime(minutes)} / {personalTime(goal)}</span>
    </div>
    <progress aria-label="Weekly study goal" max={goal} value={Math.min(minutes, goal)} className="weekly-goal-progress mt-2 block h-2 w-full overflow-hidden rounded-full" />
    <p className="mt-2 text-xs text-muted-white/60">{remaining === 0 ? 'You made it. Any extra focus is a bonus.' : `${personalTime(remaining)} to go. One flight at a time.`}{!compact && ` · ${percent}%`}</p>
  </div>;
}

function GoalEditor({ owner, goal }: { owner: string; goal: number | null }) {
  const [hours, setHours] = useState(goal ? String(goal / 60) : '5');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const save = useWeeklyGoalStore(state => state.save);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const minutes = Number(hours) * 60;
    if (!save(owner, minutes)) { track('weekly_goal_save_failed', { signed_in: owner !== 'guest' }); setError('Choose 0.5–168 hours in half-hour steps. Your browser must allow local storage.'); return; }
    track('weekly_goal_saved', { goal_minutes: minutes, previous_goal_minutes: goal, is_new_goal: goal === null, signed_in: owner !== 'guest' });
    setError('');
    setMessage('Weekly goal saved. Your flight plan is set.');
  };
  return <form onSubmit={submit} className="mt-4">
    <label htmlFor="weekly-goal-hours" className="text-sm text-muted-white/80">Hours per week</label>
    <div className="mt-2 flex flex-wrap gap-2">{[2, 5, 10].map(value => <button key={value} type="button" aria-pressed={Number(hours) === value} onClick={() => { setHours(String(value)); setMessage(''); }} className={`rounded-lg border px-4 py-2 text-sm ${Number(hours) === value ? 'border-gold/50 bg-gold/15 text-gold' : 'border-gold/15 text-muted-white/60 hover:text-gold'}`}>{value}h</button>)}</div>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <input id="weekly-goal-hours" aria-describedby="weekly-goal-help" type="number" min="0.5" max="168" step="0.5" required value={hours} onChange={event => { setHours(event.target.value); setMessage(''); setError(''); }} className="w-24 rounded-lg border border-gold/25 bg-navy px-3 py-2 font-mono text-sm text-muted-white focus:outline focus:outline-2 focus:outline-gold" />
      <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">Save goal</button>
      {goal && <button type="button" onClick={() => { if (save(owner, null)) { track('weekly_goal_removed', { previous_goal_minutes: goal, signed_in: owner !== 'guest' }); setMessage('Weekly goal removed. You can set a new one anytime.'); setError(''); } else { track('weekly_goal_save_failed', { signed_in: owner !== 'guest', action: 'remove' }); setError('Could not save your change on this device. Please try again.'); } }} className="text-xs text-muted-white/60 underline">Remove goal</button>}
    </div>
    {message && <p role="status" className="mt-3 text-sm text-gold">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </form>;
}

export default function WeeklyGoal() {
  const { owner, goal } = useWeeklyGoal();
  const exposure = useAnalyticsExposure('weekly_goal_editor_viewed', { signed_in: owner !== 'guest', has_weekly_goal: !!goal }, owner);
  return <section ref={exposure} aria-labelledby="weekly-goal-title" className="rounded-xl border border-gold/15 p-4 sm:p-5">
    <h3 id="weekly-goal-title" className="font-serif text-xl text-gold">Your weekly flight plan</h3>
    <p id="weekly-goal-help" className="mt-2 text-xs leading-relaxed text-muted-white/60">Pick a little time for yourself, every week. Monday–Sunday in your local time; includes completed and imported flights. Your target repeats each week and is saved on this device for this {owner === 'guest' ? 'guest log' : 'account'}.</p>
    <div className="mt-4"><WeeklyGoalProgress /></div>
    <GoalEditor key={owner} owner={owner} goal={goal} />
  </section>;
}
