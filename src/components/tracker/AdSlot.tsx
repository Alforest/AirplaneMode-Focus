import React, { useEffect, useRef, useState } from 'react';
import { adClientId, adSlotId, adsEnabled, pushAd } from '../../lib/ads';
import { track } from '../../lib/analytics';
import { useFlightStore } from '../../store/flightStore';

// ---------------------------------------------------------------------------
// AdSlot — the single AdSense unit, tracker sidebar only. Fixed 250×250 so
// the sidebar never shifts. Renders nothing when ads are off (dev shows a
// placeholder instead) and collapses entirely when Google returns no fill,
// so there's never an empty gold-bordered hole mid-flight.
// ---------------------------------------------------------------------------

const AD_SIZE = 250;

const AdSlot: React.FC = () => {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false); // StrictMode guard — double push({}) throws
  const [status, setStatus] = useState<'pending' | 'filled' | 'unfilled'>('pending');
  const devChromeHidden = useFlightStore((s) => s.devChromeHidden);

  const live = adsEnabled();

  useEffect(() => {
    if (!live || pushed.current) return;
    pushed.current = true;
    pushAd();

    // AdSense reports the outcome by setting data-ad-status on the <ins>
    const ins = insRef.current;
    if (!ins) return;
    const observer = new MutationObserver(() => {
      const s = ins.getAttribute('data-ad-status');
      if (s === 'filled' || s === 'unfilled') {
        setStatus(s);
        track(s === 'filled' ? 'ad_filled' : 'ad_unfilled');
        observer.disconnect();
      }
    });
    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });

    // Adblock / script never loaded → no status ever arrives. Collapse rather
    // than leave an empty box mid-flight.
    const timeout = setTimeout(() => {
      if (!ins.getAttribute('data-ad-status')) {
        setStatus('unfilled');
        track('ad_unfilled', { reason: 'blocked_or_timeout' });
        observer.disconnect();
      }
    }, 8000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [live]);

  // Dev / preview without keys: dashed placeholder so the layout stays tunable
  if (!live) {
    if (import.meta.env.PROD) return null;
    if (devChromeHidden) return null; // ` toggle — clean frame for recordings
    return (
      <div className="glass-card rounded-xl px-4 py-3">
        <div className="font-mono text-muted-white/25 text-xs uppercase tracking-widest mb-2 text-center">
          Advertisement
        </div>
        <div
          className="mx-auto flex items-center justify-center font-mono text-xs text-muted-white/20"
          style={{
            width: AD_SIZE,
            maxWidth: '100%',
            height: AD_SIZE,
            border: '1px dashed rgba(240,192,64,0.25)',
            borderRadius: 6,
          }}
        >
          AD 250×250
        </div>
      </div>
    );
  }

  // No fill → collapse the whole card
  if (status === 'unfilled') return null;

  return (
    <div className="glass-card rounded-xl px-4 py-3 text-center">
      <div className="font-mono text-muted-white/25 text-xs uppercase tracking-widest mb-2">
        Advertisement
      </div>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'inline-block', width: AD_SIZE, height: AD_SIZE }}
        data-ad-client={adClientId()}
        data-ad-slot={adSlotId()}
        data-ad-format="rectangle"
        data-full-width-responsive="false"
      />
    </div>
  );
};

export default AdSlot;
