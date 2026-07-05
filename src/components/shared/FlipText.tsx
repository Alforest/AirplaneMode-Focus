import React, { useEffect, useMemo, useRef, useState } from 'react';

const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ---------------------------------------------------------------------------
// FlipChar — scrambles on char change OR external trigger (hover)
// ---------------------------------------------------------------------------

const FlipChar: React.FC<{ char: string; idx: number; trigger?: number; small?: boolean }> = ({
  char, idx, trigger = 0, small = false,
}) => {
  const [shown, setShown] = useState(char);
  const prevChar = useRef(char);
  const t1 = useRef<ReturnType<typeof setTimeout>>();
  const t2 = useRef<ReturnType<typeof setInterval>>();

  const scrambleTo = (target: string) => {
    clearTimeout(t1.current);
    clearInterval(t2.current);
    let count = 0;
    const flips = 4 + Math.floor(Math.random() * 5);
    t1.current = setTimeout(() => {
      t2.current = setInterval(() => {
        if (count++ >= flips) {
          clearInterval(t2.current);
          setShown(target);
        } else {
          setShown(SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]);
        }
      }, 55);
    }, idx * 45);
  };

  // Char changed → scramble to new char
  useEffect(() => {
    if (prevChar.current === char) return;
    prevChar.current = char;
    scrambleTo(char);
    return () => { clearTimeout(t1.current); clearInterval(t2.current); };
  }, [char]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hover trigger → scramble then settle back to same char
  useEffect(() => {
    if (trigger === 0) return;
    scrambleTo(char);
    return () => { clearTimeout(t1.current); clearInterval(t2.current); };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  if (char === ' ') return <span style={{ display: 'inline-block', width: small ? '0.45rem' : '0.6rem' }} />;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: small ? '1.02rem' : '1.2rem',
      height: small ? '1.5rem' : '1.75rem',
      background: '#07090e',
      borderRadius: '2px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: small ? '0.68rem' : '0.8rem',
      fontWeight: 700,
      color: '#f2c84b',
      position: 'relative',
      flexShrink: 0,
      marginRight: '2px',
      userSelect: 'none',
    }}>
      {shown}
      <span style={{
        position: 'absolute',
        left: 0, right: 0, top: '50%',
        height: '1px',
        background: 'rgba(0,0,0,0.55)',
        pointerEvents: 'none',
      }} />
    </span>
  );
};

// ---------------------------------------------------------------------------
// FlipText
// ---------------------------------------------------------------------------

const FlipText: React.FC<{ text: string; trigger?: number; small?: boolean }> = ({ text, trigger, small }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap' }}>
    {text.split('').map((ch, i) => (
      <FlipChar key={i} char={ch} idx={i} trigger={trigger} small={small} />
    ))}
  </span>
);

// ---------------------------------------------------------------------------
// PagedFlipText — long text is split into word pages that fit `width` chars,
// then cycled with the flip animation, like a real split-flap board:
// "FRANKFURT AM MAIN" → "FRANKFURT" ⟳ "AM MAIN"
// ---------------------------------------------------------------------------

function paginate(text: string, width: number): string[] {
  const pages: string[] = [];
  let current = '';
  for (const word of text.split(' ').filter(Boolean)) {
    // Hyphenate single words longer than the board width
    const chunks: string[] = [];
    let rest = word;
    while (rest.length > width) {
      chunks.push(rest.slice(0, width - 1) + '-');
      rest = rest.slice(width - 1);
    }
    chunks.push(rest);

    for (const chunk of chunks) {
      if (!current) current = chunk;
      else if (current.length + 1 + chunk.length <= width) current += ' ' + chunk;
      else { pages.push(current); current = chunk; }
    }
  }
  if (current) pages.push(current);
  return pages.length ? pages : [''];
}

const PAGE_INTERVAL_MS = 2400;

export const PagedFlipText: React.FC<{ text: string; width?: number; trigger?: number; small?: boolean }> = ({
  text, width = 11, trigger, small,
}) => {
  const pages = useMemo(() => paginate(text, width), [text, width]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
    if (pages.length < 2) return;
    const id = setInterval(() => setPage(p => (p + 1) % pages.length), PAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pages]);

  return <FlipText text={pages[Math.min(page, pages.length - 1)]} trigger={trigger} small={small} />;
};

export default FlipText;
