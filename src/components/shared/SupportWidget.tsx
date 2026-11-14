import React from 'react';

const SupportWidget: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <aside
    aria-label="Support FocusFlight"
    className={compact
      ? 'mt-7 border-t border-gold/10 pt-6'
      : 'mb-8 rounded-2xl border border-gold/15 bg-midnight/40 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5'}
  >
    <div>
      <h2 className={`font-serif text-muted-white ${compact ? 'text-xl' : 'text-2xl'}`}>
        {compact ? 'Enjoyed the flight?' : 'Help keep FocusFlight free.'}
      </h2>
      <p className={`text-sm leading-relaxed text-muted-white/60 ${compact ? 'mt-2' : 'mt-2 max-w-md'}`}>
        {compact
          ? 'Buy me a coffee to support the next flight.'
          : 'Your coffee supports map/API costs and the time I spend building FocusFlight. Thanks for flying with me.'}
      </p>
    </div>
    <a
      href="https://www.buymeacoffee.com/alforest"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Buy me a coffee (opens in a new tab)"
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gold/35 bg-gold/10 px-5 py-3 font-mono text-sm text-gold hover:bg-gold/20 transition-colors shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${compact ? 'mt-4' : ''}`}
    >
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z" />
        <path d="M17 9h1a3 3 0 1 1 0 6h-1M8 3v2m4-2v2m4-2v2M3 22h16" />
      </svg>
      Buy me a coffee
    </a>
  </aside>
);

export default SupportWidget;
