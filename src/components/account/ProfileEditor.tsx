import { useMemo, useState } from 'react';
import { airports, findAirportByIata } from '../../data/airports';
import { useProfileStore, TravelerProfile } from '../../store/profileStore';

const fieldClass = 'mt-2 w-full rounded-lg border border-gold/20 bg-navy px-3 py-3 text-sm text-muted-white focus:outline focus:outline-2 focus:outline-gold';

export default function ProfileEditor({ profile }: { profile: TravelerProfile | null }) {
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [home, setHome] = useState(profile?.home_airport ?? '');
  const [saved, setSaved] = useState(false);
  const [airportError, setAirportError] = useState('');
  const { saving, error, save } = useProfileStore();
  const airport = findAirportByIata(home);
  const suggestions = useMemo(() => airports.filter(item => item.iata.startsWith(home)).sort((a, b) => Number(b.size === 'large') - Number(a.size === 'large')).slice(0, 20), [home]);
  const dirty = nickname.trim() !== (profile?.nickname ?? '') || home !== (profile?.home_airport ?? '');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    if (home && !airport) { setAirportError('Choose a valid airport code, such as JFK or LHR.'); return; }
    setAirportError('');
    if (await save(nickname, home)) setSaved(true);
  };
  return <form onSubmit={event => void submit(event)} className="rounded-xl border border-gold/15 p-4 sm:p-5">
    <h3 className="font-serif text-xl text-muted-white">Make yourself at home</h3>
    <div className="mt-4 grid gap-5 sm:grid-cols-2">
      <div>
        <label htmlFor="profile-nickname" className="text-sm text-muted-white/80">Nickname</label>
        <input id="profile-nickname" value={nickname} onChange={event => { setNickname(event.target.value); setSaved(false); }} required minLength={3} maxLength={20} pattern="[A-Za-z0-9_ \-]{3,20}" autoComplete="off" placeholder="CloudScholar" aria-describedby="profile-nickname-help" className={fieldClass} disabled={saving} />
        <p id="profile-nickname-help" className="mt-2 text-xs leading-relaxed text-muted-white/50">3–20 letters, numbers, spaces, hyphens or underscores. No profanity or slurs. Public if you join a challenge; changes update your leaderboard name.</p>
      </div>
      <div>
        <label htmlFor="profile-home" className="text-sm text-muted-white/80">Home airport <span className="text-muted-white/40">· optional</span></label>
        <input id="profile-home" list="profile-airports" value={home} onChange={event => { setHome(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)); setAirportError(''); setSaved(false); }} maxLength={3} autoComplete="off" placeholder="JFK" aria-describedby="profile-home-help" aria-invalid={!!airportError} className={`${fieldClass} font-mono uppercase`} disabled={saving} />
        <datalist id="profile-airports">{suggestions.map(item => <option key={item.iata} value={item.iata}>{item.city} — {item.name}</option>)}</datalist>
        <p id="profile-home-help" className="mt-2 text-xs leading-relaxed text-muted-white/50">{airport ? `${airport.city}, ${airport.country}. ` : ''}Your default departure airport, synced across devices. Kept private. Clear to remove.</p>
      </div>
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button disabled={saving || !dirty} className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-navy hover:bg-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button>
      {saved && <p className="text-sm text-gold" role="status">Profile saved. Welcome aboard.</p>}
    </div>
    {(airportError || error) && <p className="mt-3 text-sm text-red-300" role="alert">{airportError || error}</p>}
  </form>;
}
