import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { syncHistory } from '../../lib/historySync';
import { useAuthStore } from '../../store/authStore';
import { useHistoryStore } from '../../store/historyStore';

const buttonClass = 'rounded-lg border border-gold/25 px-4 py-2 text-sm text-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50 disabled:cursor-wait';

export default function AccountPanel() {
  const { user, ready, busy, error, syncStatus, signIn, signOut } = useAuthStore();
  const guestCount = useHistoryStore(state => Object.values(state.buckets.guest ?? {}).filter(r => !r.deleted).length);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  if (!supabase) return null;

  return (
    <div className="mb-8 rounded-xl border border-gold/15 bg-midnight p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-serif text-xl text-muted-white">{user ? 'Account & sync' : 'Your passport starts with a sign-in.'}</h3>
          <p className="mt-1 text-sm text-muted-white/60 break-words">
            {!ready ? 'Checking your account…' : user
              ? `Signed in as ${user.email ?? 'a Google account'}`
              : 'Sign in to save flights across devices. Studying is always available as a guest.'}
          </p>
        </div>
        {user ? (
          <button type="button" className={buttonClass} disabled={busy} onClick={() => void signOut()}>Sign out</button>
        ) : (
          <button type="button" className={buttonClass} disabled={!ready || busy} onClick={() => void signIn()}>
            {busy ? 'Connecting…' : 'Continue with Google'}
          </button>
        )}
      </div>
      {user && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-white/60" role="status">
          <span>{syncStatus === 'syncing' ? 'Syncing flights…' : syncStatus === 'error'
            ? 'Sync unavailable. Flights are saved on this device and will retry automatically.'
            : syncStatus === 'synced' ? 'Flight log synced. Updates refresh automatically.' : 'Flight log saved on this device.'}</span>
          <button type="button" className="text-gold underline underline-offset-4 disabled:opacity-50" disabled={syncStatus === 'syncing'} onClick={() => void syncHistory()}>Sync now</button>
        </div>
      )}
      {user && guestCount > 0 && dismissedFor !== user.id && (
        <div className="mt-4 border-t border-gold/10 pt-4">
          <p className="text-sm text-muted-white/70">Move {guestCount} guest {guestCount === 1 ? 'flight' : 'flights'} from this device into this account?</p>
          <p className="mt-1 text-xs text-muted-white/45">Only import flights that belong to you. They will leave the guest log.</p>
          <div className="mt-3 flex gap-3">
            <button type="button" className={buttonClass} onClick={() => useHistoryStore.getState().importGuest()}>Import flights</button>
            <button type="button" className="px-2 text-sm text-muted-white/60 hover:text-muted-white" onClick={() => setDismissedFor(user.id)}>Not now</button>
          </div>
        </div>
      )}
      {!user && (
        <p className="mt-3 text-xs text-muted-white/60">
          By using FocusFlight, you agree to our <a href="terms/" className="text-gold underline underline-offset-4">Terms of Service</a>.
          {' '}Read our <a href="privacy/" className="text-gold underline underline-offset-4">Privacy Policy</a> for how sign-in and history are handled.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>}
    </div>
  );
}
