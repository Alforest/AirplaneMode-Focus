import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncHistory } from '../lib/historySync';
import { useAuthStore } from '../store/authStore';
import { useHistoryStore } from '../store/historyStore';

export function useAccount() {
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user ?? null;
      useHistoryStore.getState().setOwner(user?.id ?? null);
      useAuthStore.setState({ user, ready: true, error: null, syncStatus: 'idle' });
      // Do not await Supabase API calls inside the auth callback (auth lock).
      if (user) window.setTimeout(() => { if (active) void syncHistory(); }, 0);
    });
    void client.auth.getSession().then(({ error }) => {
      if (active && error) useAuthStore.setState({ ready: true, error: 'Could not restore your account. Please sign in again.' });
    }).catch(() => {
      if (active) useAuthStore.setState({ ready: true, error: 'Could not restore your account. Please sign in again.' });
    });
    const unsubscribeHistory = useHistoryStore.subscribe((state, previous) => {
      const owner = useAuthStore.getState().user?.id;
      if (!owner) return;
      const bucket = state.buckets[owner];
      const old = previous.buckets[owner];
      if (bucket !== old && Object.values(bucket ?? {}).some(record =>
        record.pending && record.revision !== old?.[record.flight.id]?.revision
      )) void syncHistory();
    });
    const retry = () => { void syncHistory(); };
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
