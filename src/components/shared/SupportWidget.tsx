import React from 'react';
import { track } from '../../lib/analytics';
import { useAnalyticsExposure } from '../../hooks/useAnalyticsExposure';

const SUPPORT_COPY_VERSION = 'support_clarity_v1';

const SupportWidget: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const placement = compact ? 'flight_completed' : 'homepage_footer';
  const props = {
    placement,
    copy_version: SUPPORT_COPY_VERSION,
    intent: 'financial_support',
    provider: 'buy_me_a_coffee',
  };
  const exposure = useAnalyticsExposure('support_prompt_viewed', props, placement);
  // Retain the existing event for historical comparisons. A click records
  // intent to visit the support page, not a completed contribution.
  const trackSupportClick = () => track('coffee_clicked', props, { instant: true });

  return (
    <aside
      ref={exposure}
      aria-label="Support FocusFlight"
      className={compact
        ? 'mt-7 border-t border-gold/10 pt-6'
        : 'mb-8 rounded-2xl border border-gold/20 bg-midnight/40 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6'}
    >
      <div className="min-w-0 flex-1">
        <h2 className={`font-serif text-muted-white ${compact ? 'text-xl' : 'text-2xl'}`}>
          {compact ? 'Help keep the next flight free.' : 'Help keep FocusFlight free.'}
        </h2>
        <p className={`mt-2 text-sm leading-relaxed text-muted-white/70 ${compact ? '' : 'max-w-md'}`}>
          {compact
            ? 'If this session helped you focus, your support helps cover map costs and the time spent improving FocusFlight.'
            : 'I build FocusFlight, and your support helps cover map costs and the time spent improving the website.'}
        </p>
        <p className={`mt-3 text-xs leading-relaxed text-muted-white/60 ${compact ? '' : 'max-w-md'}`}>
          Buy Me a Coffee is the service we use to accept optional financial contributions to support this website.
        </p>
      </div>
      <div className={`w-full shrink-0 sm:w-auto ${compact ? 'mt-4' : ''}`}>
        <a
          href="https://www.buymeacoffee.com/alforest"
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackSupportClick}
          onAuxClick={event => {
            if (event.button === 1) trackSupportClick();
          }}
          aria-label="Support FocusFlight financially via Buy Me a Coffee (opens in a new tab)"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-gold/45 bg-gold/15 px-5 py-3 text-sm font-semibold text-gold hover:bg-gold/25 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold sm:w-auto"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
          </svg>
          Support FocusFlight
          <span aria-hidden="true">↗</span>
        </a>
        <p className="mt-2 text-center text-xs leading-relaxed text-muted-white/60">
          Via Buy Me a Coffee · opens a new tab
        </p>
        <p className="mt-1 text-center text-xs leading-relaxed text-muted-white/50">
          Optional support. Free to use.
        </p>
      </div>
    </aside>
  );
};

export default SupportWidget;
