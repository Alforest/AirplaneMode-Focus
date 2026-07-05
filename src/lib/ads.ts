// ---------------------------------------------------------------------------
// Ads — thin Google AdSense wrapper. This is the ONLY file that knows about
// adsbygoogle; components use adsEnabled() / adSlotId() / pushAd().
//
// Policy: one manual slot in the tracker sidebar, Auto ads OFF (AdSense UI
// setting — nothing gets injected over the map or landing). Prod builds only;
// without VITE_ADSENSE_CLIENT the whole module is a silent no-op. Consent for
// EU/UK visitors is handled by AdSense's own certified CMP ("Privacy &
// messaging"), served by this same script — no code here.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const client = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const slot = import.meta.env.VITE_ADSENSE_SLOT as string | undefined;

let enabled = false;

export function initAds(): void {
  if (!import.meta.env.PROD || !client) return;

  // Sitewide <head> script: required by Google's review crawler even though
  // ads only render where an <ins> unit exists (tracker sidebar).
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
  enabled = true;
}

/** True when the ad script is live AND a slot id exists — i.e. AdSlot should render. */
export function adsEnabled(): boolean {
  return enabled && !!slot;
}

export function adClientId(): string | undefined {
  return client;
}

export function adSlotId(): string | undefined {
  return slot;
}

/** Ask AdSense to fill the most recently rendered <ins> unit. */
export function pushAd(): void {
  if (!enabled) return;
  (window.adsbygoogle = window.adsbygoogle || []).push({});
}
