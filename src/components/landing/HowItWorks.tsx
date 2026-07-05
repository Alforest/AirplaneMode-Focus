import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PrivacyPolicy from '../shared/PrivacyPolicy';

// ---------------------------------------------------------------------------
// HowItWorks — below-the-fold content section: the concept in 4 steps, a
// short FAQ, and the site footer (privacy link lives here). Real text
// content on the landing page also matters for AdSense review + SEO.
// ---------------------------------------------------------------------------

const STEPS = [
  {
    code: '01',
    title: 'Check in',
    body: 'Enter the 3-letter code of any real airport — JFK, LHR, MAD — or click a flight on the live board.',
  },
  {
    code: '02',
    title: 'Pick a real flight',
    body: 'Browse actual nonstop routes from that airport. The flight time is your study time: a 2-hour hop or a 9-hour long-haul.',
  },
  {
    code: '03',
    title: 'Go airplane mode',
    body: 'Put your phone in airplane mode, board, and watch your plane cross the map while the countdown runs.',
  },
  {
    code: '04',
    title: 'Land it',
    body: "Stay in your seat until touchdown. Every landing goes in your flight log — abandon mid-air and it doesn't count.",
  },
];

const FAQ = [
  {
    q: 'What is FocusFlight?',
    a: 'A free, gamified study timer. Instead of setting "45 minutes", you board a real flight route and study until it lands — the flight metaphor makes long focus sessions feel like a journey instead of a grind.',
  },
  {
    q: 'Are the flights real?',
    a: 'The routes, airlines, and aircraft are real (based on the OpenFlights dataset), and durations reflect real great-circle distances. The plane on the map is a simulation — no live flight data is used.',
  },
  {
    q: 'Is it free? Do I need an account?',
    a: 'Completely free, no account, no sign-up. Your flight log is stored only in your own browser.',
  },
  {
    q: 'Why airplane mode?',
    a: "It's the whole trick: on a plane your phone is useless, so your brain stops checking it. Recreating that on the ground removes the interruption loop that breaks deep work.",
  },
];

const HowItWorks: React.FC = () => {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <section style={{ background: '#04060c' }} className="px-4 pt-14">
      <div style={{ maxWidth: 860 }} className="mx-auto">

        {/* How it works */}
        <div className="flex items-center gap-4 mb-8">
          <span style={{
            color: 'rgba(240,192,64,0.35)',
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            How it works
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(240,192,64,0.08)' }} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.code}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              style={{
                background: '#060a14',
                border: '1px solid rgba(240,192,64,0.08)',
                borderRadius: 10,
                padding: '1.1rem 1.2rem',
              }}
            >
              <div className="font-mono text-gold/40 text-xs mb-2">{s.code}</div>
              <div className="font-serif text-muted-white text-lg mb-1.5">{s.title}</div>
              <p className="text-muted-white/45 text-sm leading-relaxed font-sans">{s.body}</p>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <div className="flex items-center gap-4 mb-8">
          <span style={{
            color: 'rgba(240,192,64,0.35)',
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Questions
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(240,192,64,0.08)' }} />
        </div>

        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6 mb-16">
          {FAQ.map(item => (
            <div key={item.q}>
              <h3 className="font-sans font-medium text-muted-white/85 text-sm mb-1.5">{item.q}</h3>
              <p className="text-muted-white/45 text-sm leading-relaxed font-sans">{item.a}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer
          className="flex flex-col sm:flex-row items-center justify-between gap-3 py-6"
          style={{ borderTop: '1px solid rgba(240,192,64,0.07)' }}
        >
          <span className="font-mono text-muted-white/20 text-xs">
            FocusFlight · study like you're flying
          </span>
          <button
            onClick={() => setPrivacyOpen(true)}
            className="font-mono text-muted-white/30 hover:text-gold text-xs uppercase tracking-[0.15em] transition-colors px-2 py-1"
          >
            Privacy
          </button>
        </footer>
      </div>

      <PrivacyPolicy open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </section>
  );
};

export default HowItWorks;
