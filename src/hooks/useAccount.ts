import { track } from '../lib/analytics';
import { useProfileStore } from '../store/profileStore';
import { useAccountUI } from '../store/accountUIStore';
import { useEffect } from 'react';
import { retryChallengeCompletions } from '../lib/challenge';
import { supabase } from '../lib/supabase';
import { syncHistory } from '../lib/historySync';
import { useAuthStore } from '../store/authStore';
import { useHistoryStore } from '../store/historyStore';

export function useAccount() {
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let loginRequested = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user ?? null;
      useProfileStore.getState().setOwner(user?.id ?? null);
      useHistoryStore.getState().setOwner(user?.id ?? null);
      useAuthStore.setState({ user, ready: true, error: null, syncStatus: 'idle' });
      if (user && loginRequested) {
        track('sign_in_completed', { provider: 'google', signed_in: true });
        loginRequested = false;
        useAccountUI.getState().open('oauth_return');
      }
      // Do not await Supabase API calls inside the auth callback (auth lock).
      if (user) window.setTimeout(() => { if (active) { void syncHistory(); void retryChallengeCompletions(); void useProfileStore.getState().load(); } }, 0);
    });
    void client.auth.getSession().then(({ error }) => {
      if (active && error) useAuthStore.setState({ ready: true, error: 'Could not restore your account. Please sign in again.' });
    }).catch(() => {
      if (active) useAuthStore.setState({ ready: true, error: 'Could not restore your account. Please sign in again.' });
    });
    try {
      if (sessionStorage.getItem('focusflight-open-account') === '1') {
        loginRequested = true;
        sessionStorage.removeItem('focusflight-open-account');
      }
    } catch { /* Sign-in works even without session storage. */ }
    const unsubscribeHistory = useHistoryStore.subscribe((state, previous) => {
      const owner = useAuthStore.getState().user?.id;
      if (!owner) return;
      const bucket = state.buckets[owner];
      const old = previous.buckets[owner];
      if (bucket !== old && Object.values(bucket ?? {}).some(record =>
        record.pending && record.revision !== old?.[record.flight.id]?.revision
      )) void syncHistory();
    });
    const retry = () => { void syncHistory(); void retryChallengeCompletions(); void useProfileStore.getState().load(); };
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    const timer = window.setInterval(retry, 30_000);
    return () => {
      active = false;
      subscription.unsubscribe();
      unsubscribeHistory();
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
      window.clearInterval(timer);
    };
  }, []);
}
