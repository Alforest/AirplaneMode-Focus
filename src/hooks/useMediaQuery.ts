import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// useMediaQuery — reactive matchMedia. Used where layout differences can't be
// expressed with Tailwind classes (inline-styled split-flap rows).
// ---------------------------------------------------------------------------

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** True below Tailwind's `sm` breakpoint (640px) — phone-sized screens. */
export function useIsPhone(): boolean {
  return useMediaQuery('(max-width: 639px)');
}
