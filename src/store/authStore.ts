import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  ready: boolean;
  busy: boolean;
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: !supabase,
  busy: false,
  error: null,
  syncStatus: 'idle',
  signIn: async () => {
    if (!supabase) return;
    set({ busy: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
      if (error) throw error;
    } catch {
      set({ error: 'Google sign-in failed. Please try again.' });
    } finally {
      set({ busy: false });
    }
  },
  signOut: async () => {
    if (!supabase) return;
    set({ busy: true, error: null });
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch {
      set({ error: 'Could not sign out. Please try again.' });
    } finally {
      set({ busy: false });
    }
  },
}));
