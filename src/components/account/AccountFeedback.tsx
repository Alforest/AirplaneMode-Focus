import { useState } from 'react';
import { track } from '../../lib/analytics';

export default function AccountFeedback({ owner }: { owner: string }) {
  const key = `focusflight-passport-feedback-v1:${owner}`;
  const [submitted, setSubmitted] = useState(() => {
    try { return localStorage.getItem(key) === 'submitted'; } catch { return false; }
  });
  const submit = (rating: 'positive' | 'negative') => {
    if (submitted) return;
    track('account_feedback_submitted', { rating, signed_in: owner !== 'guest', surface: 'passport' });
    setSubmitted(true);
    try { localStorage.setItem(key, 'submitted'); } catch { /* Feedback still works without persistence. */ }
  };
  return <section aria-label="Passport feedback" className="border-t border-gold/10 pt-5">
    {submitted ? <p role="status" className="text-xs text-gold/70">Thanks for helping shape FocusFlight.</p> : <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-white/60">How’s your passport feeling?</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => submit('positive')} className="rounded-lg border border-gold/20 px-3 py-2 text-xs text-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">Feels good</button>
        <button type="button" onClick={() => submit('negative')} className="rounded-lg border border-gold/15 px-3 py-2 text-xs text-muted-white/60 hover:text-muted-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">Needs work</button>
      </div>
    </div>}
  </section>;
}
