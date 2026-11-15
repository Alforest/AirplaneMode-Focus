import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ChallengeBoard, challengePhase, studyTime } from '../../lib/challenge';
import { useChallengeMembership } from '../../store/challengeMembershipStore';
import { useProfileStore } from '../../store/profileStore';
import { useAccountUI } from '../../store/accountUIStore';
import { useAuthStore } from '../../store/authStore';

const buttonClass = 'rounded-lg border border-gold/30 px-4 py-2 text-sm text-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50';

export function ChallengeBanner() {
  const user = useAuthStore(state => state.user);
  const ready = useAuthStore(state => state.ready);
  const membership = useChallengeMembership(state => user ? state.members[user.id] : undefined);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  // While restoring/checking an account, avoid briefly prompting existing members.
  if (!supabase || !ready || challengePhase(now) !== 'active' || (user && membership !== false)) return null;
  return (
    <aside aria-label="Study challenge" className="relative z-10 mx-5 sm:mx-6 mb-20 rounded-xl border border-gold/25 bg-midnight/90 p-4 sm:p-5 lg:mx-auto lg:w-[calc(100%-3rem)] lg:max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-widest text-gold/70">Syncing and challenges are here</p>
          <h2 className="mt-1 font-serif text-xl text-gold">Pre-Thanksgiving Crunch <span aria-hidden="true">✈</span></h2>
          <p className="mt-1 text-sm text-muted-white/70">Get your work done before the holiday. Sync your flights and join the study-time leaderboard.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a href="#challenge" className={buttonClass}>Join the challenge</a>
          <a href="#challenge" className="text-sm text-muted-white/70 underline underline-offset-4 hover:text-gold">View leaderboard</a>
        </div>
      </div>
    </aside>
  );
}

export default function ChallengeSection() {
  const profile = useProfileStore(state => state.profile);
  const openAccount = useAccountUI(state => state.open);
  const { user, ready, busy, error: authError, signIn } = useAuthStore();
  const [board, setBoard] = useState<ChallengeBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [nickname, setNickname] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let fetching = false;
    setBoard(null);
    setLoading(true);
    const load = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const { data, error: failure } = await client.rpc('study_challenge_board');
        if (failure || !data) throw failure;
        if (active) {
          const value = data as ChallengeBoard;
          if (user) useChallengeMembership.getState().update(user.id, !!value.me);
          setBoard(value);
          setOffset(Date.parse(value.server_now) - Date.now());
          setError(null);
        }
      } catch {
        if (active) setError('The leaderboard is unavailable right now. Please try again.');
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const retry = () => { void load(); };
    window.addEventListener('focus', retry);
    window.addEventListener('online', retry);
    const timer = window.setInterval(retry, 30_000);
    const tick = window.setInterval(() => setClock(Date.now()), 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.clearInterval(tick);
      window.removeEventListener('focus', retry);
      window.removeEventListener('online', retry);
    };
  }, [user?.id, refresh, profile?.nickname]);

  if (!supabase) return null;
  const phase = challengePhase(clock + offset);
  const hoursLeft = Math.max(0, Math.ceil((Date.parse(board?.ends_at ?? '2026-11-26T00:00:00-05:00') - clock - offset) / 3_600_000));
  const join = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || joining) return;
    setJoining(true);
    setError(null);
    try {
      const { error: failure } = await supabase.rpc('join_study_challenge', { p_nickname: profile?.nickname ?? nickname.trim() });
      if (failure) {
        setError(failure.code === '23505' ? 'That nickname is taken. Try another.'
          : failure.code === '23514' && failure.message.includes('nickname_appropriate')
            ? 'Please choose a nickname without profanity or slurs.'
            : 'Could not join the challenge. Check your nickname and try again.');
      } else {
        if (user) useChallengeMembership.getState().update(user.id, true);
        void useProfileStore.getState().load();
        setRefresh(value => value + 1);
      }
    } catch { setError('Could not connect. Please try again.'); }
    finally { setJoining(false); }
  };

  return (
    <section id="challenge" aria-labelledby="challenge-title" className="scroll-mt-6 mx-auto max-w-6xl px-5 sm:px-6 py-12 sm:py-16">
      <div className="rounded-2xl border border-gold/20 bg-midnight/70 p-5 sm:p-8">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold/60">Our first community challenge</p>
            <h2 id="challenge-title" className="mt-2 font-serif text-3xl text-gold">Pre-Thanksgiving Crunch</h2>
            <p className="mt-3 text-muted-white/70">A little focus now. A little more freedom for the holiday.</p>
            <p className="mt-2 text-xs text-muted-white/60">November 14–25, 2026 · Ends Nov 25 at 11:59 p.m. Eastern</p>
          </div>
          <span className="rounded-full border border-gold/20 px-3 py-1.5 font-mono text-xs text-gold" role="status">
            {phase === 'ended' ? 'Final standings' : phase === 'upcoming' ? 'Boarding soon' : `${Math.floor(hoursLeft / 24)}d ${hoursLeft % 24}h left`}
          </span>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-muted-white/60">Ranked by total study time on completed challenge flights. Join before takeoff, stay signed in to the same account, and be online at takeoff and landing. Flights must land before the deadline. Imported history and accelerated flights do not count. Starting another flight replaces your active challenge flight. Equal study time shares a rank. This is a friendly challenge, with no prizes.</p>

        {phase === 'active' && !board?.me && (
          <div className="mt-6 rounded-xl border border-gold/15 p-4 sm:p-5">
            {!user ? <>
              <h3 className="font-serif text-xl text-muted-white">Your seat on the leaderboard is waiting.</h3>
              <p className="mt-2 text-sm text-muted-white/60">Sign in to sync your flight log, then choose a public nickname to join.</p>
              <button type="button" disabled={!ready || busy} className={`${buttonClass} mt-4`} onClick={() => void signIn()}>{busy ? 'Connecting…' : 'Continue with Google'}</button>
              <p className="mt-3 text-xs text-muted-white/60">By using FocusFlight, you agree to our <a className="underline text-gold" href="terms/">Terms</a>. Read our <a className="underline text-gold" href="privacy/">Privacy Policy</a>.</p>
            </> : <form onSubmit={event => void join(event)}>
              {profile ? <div className="mb-3"><p className="text-sm text-gold">Joining as {profile.nickname}</p><button type="button" onClick={() => openAccount('challenge_profile')} className="mt-1 text-xs text-gold/70 underline">Edit your traveler profile</button></div> : <label htmlFor="challenge-nickname" className="block text-sm text-muted-white">Choose your public nickname</label>}
              <p id="nickname-help" className="mt-1 text-xs text-muted-white/60">Your nickname, rank, and challenge study total will be public. Your email and routes stay private. Use 3–20 letters, numbers, spaces, hyphens or underscores. No profanity or slurs.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {!profile && <input id="challenge-nickname" aria-describedby="nickname-help" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_ \-]{3,20}" autoComplete="off" value={nickname} onChange={event => setNickname(event.target.value)} className="min-w-0 w-full sm:w-64 rounded-lg border border-gold/25 bg-navy px-3 py-2 text-muted-white focus:outline focus:outline-2 focus:outline-gold" placeholder="e.g. CloudScholar" />}
                <button disabled={joining || loading || !board} className={buttonClass}>{joining ? 'Joining…' : 'Join the challenge'}</button>
              </div>
            </form>}
          </div>
        )}

        {board?.me && <div className="mt-6 rounded-xl border border-gold/30 bg-gold/5 p-4">
          <p className="text-sm text-gold">{phase === 'ended' ? 'Your final result' : 'You’re on board'}, {board.me.nickname}</p>
          <p className="mt-1 font-mono text-lg text-muted-white">#{board.me.position} <span className="text-muted-white/40">·</span> {studyTime(board.me.minutes)}</p>
          {phase === 'active' && <p className="mt-1 text-xs text-muted-white/60">Book a flight above. Eligible completed flights add to your total automatically.</p>}
        </div>}

        <div className="mt-8 flex flex-wrap justify-between items-center gap-3">
          <h3 className="font-serif text-xl text-muted-white">{phase === 'ended' ? 'Final leaderboard' : 'Study-time leaderboard'}</h3>
          <span className="text-xs text-muted-white/60">Top 10</span>
        </div>
        {loading && <p className="mt-4 text-sm text-muted-white/60" role="status">Loading leaderboard…</p>}
        {(error || authError) && <div className="mt-4 text-sm text-red-300" role="alert">{error || authError} <button type="button" className="underline underline-offset-4" onClick={() => setRefresh(value => value + 1)}>Retry</button></div>}
        {!loading && board?.entries.length === 0 && <p className="mt-4 rounded-lg border border-gold/10 p-5 text-sm text-muted-white/60">{phase === 'ended' ? 'This challenge has ended with no participants.' : 'The runway is clear. Be the first to join.'}</p>}
        {!!board?.entries.length && <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Challenge rankings by completed study time</caption>
            <thead className="font-mono text-xs text-muted-white/50"><tr><th scope="col" className="py-3 pr-3">Rank</th><th scope="col" className="py-3 pr-3">Traveler</th><th scope="col" className="py-3 text-right">Study time</th></tr></thead>
            <tbody>{board.entries.slice(0, 10).map(entry => <tr key={entry.nickname} className={`border-t border-gold/10 ${entry.is_you ? 'bg-gold/5 text-gold' : 'text-muted-white/80'}`}>
              <td className="py-3 pr-3 font-mono">#{entry.position}</td><th scope="row" className="py-3 pr-3 font-normal break-words">{entry.nickname}{entry.is_you && <span className="ml-2 text-xs text-gold">You</span>}</th><td className="py-3 text-right font-mono whitespace-nowrap">{studyTime(entry.minutes)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        <p className="mt-4 text-xs text-muted-white/50">Standings refresh every 30 seconds. Flight times are checked against server elapsed time; the timer cannot verify attention or studying.</p>
      </div>
    </section>
  );
}
