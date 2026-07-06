import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// PrivacyPolicy — static modal, opened from the landing footer. Required by
// AdSense program policies (third-party ad cookies must be disclosed).
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
}

const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="font-mono text-gold/70 text-xs uppercase tracking-[0.18em] mt-6 mb-2">
    {children}
  </h3>
);

const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-muted-white/60 text-sm leading-relaxed font-sans mb-3">
    {children}
  </p>
);

const PrivacyPolicy: React.FC<Props> = ({ open, onClose }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
        style={{ background: 'rgba(3,5,8,0.85)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl px-6 sm:px-8 py-7"
          style={{
            background: '#0d1b2a',
            border: '1px solid rgba(240,192,64,0.15)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Privacy policy"
        >
          <button
            onClick={onClose}
            aria-label="Close privacy policy"
            className="absolute top-4 right-4 px-3 py-2 font-mono text-muted-white/35 hover:text-gold transition-colors"
          >
            ✕
          </button>

          <h2 className="font-serif text-2xl text-muted-white mb-1">
            Privacy <span className="text-gold">policy</span>
          </h2>
          <p className="font-mono text-muted-white/25 text-xs">Last updated July 2026</p>

          <H>What FocusFlight is</H>
          <P>
            FocusFlight is a free study timer. There are no accounts, no sign-ups, and
            nothing you type ever leaves your browser — your flight history is stored
            only on your own device (localStorage).
          </P>

          <H>Analytics</H>
          <P>
            We use PostHog to understand anonymous usage (e.g. how many flights are
            started and completed). A random anonymous identifier is stored in your
            browser's localStorage — no cookies, no names, no email addresses, and no
            session recordings. This data can't reasonably be tied back to you.
          </P>

          <H>Advertising</H>
          <P>
            The flight tracker shows one small ad served by Google AdSense. Google and
            its partners may use cookies or device identifiers to serve and measure
            ads; in the European Economic Area, the UK, and Switzerland ads are only
            personalized if you consent through the message shown on your first visit,
            and you can change that choice at any time from the same message.
          </P>
          <P>
            You can read how Google uses data at{' '}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold/80 hover:text-gold underline decoration-gold/30"
            >
              policies.google.com/technologies/partner-sites
            </a>{' '}
            and opt out of personalized ads at{' '}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold/80 hover:text-gold underline decoration-gold/30"
            >
              adssettings.google.com
            </a>.
          </P>

          <H>Third-party services</H>
          <P>
            The map is rendered by Mapbox and fonts are loaded from Google Fonts; both
            receive standard technical request data (such as your IP address) to
            deliver those assets.
          </P>

          <H>Contact</H>
          <P>
            Questions? Reach out at{' '}
            <a
              href="mailto:admin@focusflight.io"
              className="text-gold/80 hover:text-gold underline decoration-gold/30"
            >
              admin@focusflight.io
            </a>.
          </P>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default PrivacyPolicy;
