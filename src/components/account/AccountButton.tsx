import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import { useAccountUI } from '../../store/accountUIStore';
import { supabase } from '../../lib/supabase';

export default function AccountButton() {
  const user = useAuthStore(state => state.user);
  const nickname = useProfileStore(state => state.profile?.nickname);
  const open = useAccountUI(state => state.open);
  const label = user ? nickname ?? 'Account' : supabase ? 'Sign in' : 'Flight log';
  return <button type="button" onClick={open} aria-label={user ? 'Open your account' : 'Open your traveler passport'} aria-haspopup="dialog"
    className="flex min-h-[44px] items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-3 py-1.5 text-gold/90 transition-colors hover:border-gold/50 hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 font-mono text-xs">{user ? (nickname?.[0] ?? '✈').toUpperCase() : '✈'}</span>
    <span className="max-w-[72px] truncate font-mono text-xs sm:max-w-[160px]">{label}</span>
  </button>;
}
