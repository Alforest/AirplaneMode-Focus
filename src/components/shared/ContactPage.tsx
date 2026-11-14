import React, { useEffect, useRef } from 'react';
import { CONTACT_EMAIL } from '../../lib/contact';

const ContactPage: React.FC = () => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Contact — FocusFlight';
    window.scrollTo(0, 0);
    headingRef.current?.focus();
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <main className="min-h-screen bg-navy text-muted-white px-5 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <a href="#" className="inline-block font-mono text-sm text-gold/80 hover:text-gold focus-visible:outline focus-visible:outline-gold rounded px-1 py-2">
          ← Back to FocusFlight
        </a>
        <section className="mt-10 sm:mt-16 rounded-2xl border border-gold/15 bg-midnight/60 p-6 sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-gold/60 mb-4">Get in touch</p>
          <h1 ref={headingRef} tabIndex={-1} className="font-serif text-4xl sm:text-5xl outline-none">Contact <span className="text-gold">FocusFlight</span></h1>
          <p className="mt-6 text-muted-white/70 leading-relaxed">
            Found a bug, have an idea, or just want to say hello? I'd love to hear from you.
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-block mt-8 rounded-xl bg-gold px-5 py-3 font-mono text-sm sm:text-base font-bold text-navy hover:bg-amber transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold break-all">
            {CONTACT_EMAIL}
          </a>
          <p className="mt-4 text-sm text-muted-white/50 leading-relaxed">Opens your email app. You can also copy the address above into your preferred email service.</p>
          <p className="mt-8 pt-6 border-t border-gold/10 text-sm text-muted-white/60 leading-relaxed">Reporting a problem? Include your browser, device, and what happened so I can take a closer look.</p>
        </section>
      </div>
    </main>
  );
};

export default ContactPage;
