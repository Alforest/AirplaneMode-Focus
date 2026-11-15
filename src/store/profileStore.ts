import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface TravelerProfile { nickname: string; home_airport: string | null }
interface ProfileState {
  owner: string | null;
  profile: TravelerProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  setOwner: (owner: string | null) => void;
  load: () => Promise<void>;
  save: (nickname: string, homeAirport: string) => Promise<boolean>;
}
export function profileError(code?: string, message = '') {
  if (code === '23505') return 'That nickname is taken. Try another.';
  if (code === '23514' && message.includes('appropriate')) return 'Please choose a nickname without profanity or slurs.';
  if (code === '23514' || code === '23502') return 'Use 3–20 letters, numbers, spaces, hyphens or underscores for your nickname.';
  if (code === '23503') return 'Choose a valid home airport from the list.';
  return 'Your profile could not be saved. Check your connection and try again.';
}
let generation = 0;
export const useProfileStore = create<ProfileState>((set, get) => ({
  owner: null, profile: null, loading: false, saving: false, error: null,
  setOwner: owner => {
    if (get().owner === owner) return;
    generation++;
    set({ owner, profile: null, loading: !!owner, saving: false, error: null });
  },
  load: async () => {
    const { owner, saving } = get();
    const client = supabase;
    if (!owner || !client || saving) return;
    const version = ++generation;
    try {
      const { data, error } = await client.from('user_profiles').select('nickname, home_airport').eq('user_id', owner).maybeSingle();
      if (get().owner !== owner || generation !== version) return;
      if (error) throw error;
      set({ profile: data as TravelerProfile | null, loading: false, error: null });
    } catch {
      if (get().owner === owner && generation === version) set({ loading: false, error: 'Could not load your profile. Please try again.' });
    }
  },
  save: async (nickname, homeAirport) => {
    const { owner, saving } = get();
    if (!owner || !supabase || saving) return false;
    const version = ++generation;
    set({ saving: true, error: null });
    try {
      const { data, error } = await supabase.rpc('save_study_profile', { p_nickname: nickname.trim(), p_home_airport: homeAirport || null });
      if (get().owner !== owner || generation !== version) return false;
      if (error) { set({ error: profileError(error.code, error.message), saving: false }); return false; }
      set({ profile: data as TravelerProfile, saving: false, loading: false, error: null });
      return true;
    } catch {
      if (get().owner === owner && generation === version) set({ saving: false, error: profileError() });
      return false;
    }
  },
}));
