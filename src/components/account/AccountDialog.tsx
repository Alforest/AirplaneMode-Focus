import AccountFeedback from './AccountFeedback';
import { track } from '../../lib/analytics';
import { useEffect, useRef } from 'react';
import { useAccountUI } from '../../store/accountUIStore';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { findAirportByIata } from '../../data/airports';
import AccountPanel from './AccountPanel';
import ProfileEditor from './ProfileEditor';
import WeeklyGoal from './WeeklyGoal';
import PersonalStats from './PersonalStats';

export default function AccountDialog() {
  const { isOpen, source, close } = useAccountUI();
  const user = useAuthStore(state => state.user);
  const { profile, loading, error, load } = useProfileStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const scrollport = useRef<HTMLDivElement>(null);
  const home = profile?.home_airport ? findAirportByIata(profile.home_airport) : null;
  useEffect(() => {
    const element = dialog.current;
    if (!isOpen || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    if (source === 'goal_prompt') {
      const heading = element.querySelector<HTMLElement>('#weekly-goal-title');
      heading?.focus({ preventScroll: true });
      const scroller = scrollport.current;
      if (heading && scroller) scroller.scrollTo({ top: scroller.scrollTop + heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 24, behavior: 'auto' });
    } else {
      if (scrollport.current) scrollport.current.scrollTop = 0;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [isOpen, source]);
  useEffect(() => {
    if (isOpen && user) track('personal_stats_viewed', { signed_in: true, surface: 'passport' });
  }, [isOpen, user?.id]);
  if (!isOpen) return null;
  return <dialog ref={dialog} aria-labelledby="passport-title" onCancel={() => close('escape')} onClose={() => close('native')} onClick={event => { if (event.target === event.currentTarget) close('backdrop'); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-gold/25 bg-midnight p-0 text-muted-white shadow-2xl backdrop:bg-navy/80">
    <div className="absolute right-5 top-5 z-20 sm:right-8 sm:top-8">
      <button type="button" autoFocus onClick={() => close('close_button')} aria-label="Close account" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-midnight text-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">✕</button>
    </div>
    {/* One native scroll surface; the close button stays outside its layer. */}
    <div ref={scrollport} className="max-h-[calc(90dvh-2px)] overflow-y-auto overscroll-y-contain touch-pan-y touch-pinch-zoom [-webkit-overflow-scrolling:touch]">
      <div className="p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4 pr-14">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold/60">FocusFlight · Traveler passport</p>
            <h2 id="passport-title" className="mt-2 font-serif text-3xl text-gold">{user ? profile ? `Welcome aboard, ${profile.nickname}.` : 'Your next chapter starts here.' : 'A little more you. Every flight.'}</h2>
            <p className="mt-2 text-sm text-muted-white/60">{user ? home ? `Home base: ${home.iata} · ${home.city}` : 'Your focus, your flights, your home base.' : 'Save your progress and make this terminal your own.'}</p>
          </div>
        </div>
        <div className="mt-7 space-y-6">
          {user && <>
            <PersonalStats />
            {loading ? <p role="status" className="text-sm text-muted-white/60">Getting your passport ready…</p> : error && !profile ? <div role="alert" className="rounded-xl border border-gold/15 p-4 text-sm text-muted-white/70">{error} <button type="button" className="text-gold underline" onClick={() => void load()}>Retry</button></div>
              : <ProfileEditor key={user.id} profile={profile} />}
          </>}
          {!user && <div className="grid gap-3 sm:grid-cols-3">{['Your own nickname', 'A home airport', 'Focus stats everywhere'].map(item => <div key={item} className="rounded-xl border border-gold/10 bg-navy/50 p-4 text-sm text-gold/80">{item}</div>)}</div>}
          <WeeklyGoal />
          <AccountPanel />
          {!user && <PersonalStats />}
          <AccountFeedback key={user?.id ?? 'guest'} owner={user?.id ?? 'guest'} />
        </div>
      </div>
    </div>
  </dialog>;
}
