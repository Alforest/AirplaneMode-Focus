import { useEffect, useRef } from 'react';

const GUARD = 'focusflightFlight';
// Add a same-URL history entry so browser Back opens the same warning as the
// in-app Back button. Refreshing remains safe and doesn't trigger a warning.
export function useFlightBackGuard(active: boolean, sessionId: string | null, onBack: () => void) {
  const callback = useRef(onBack);
  const generation = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  callback.current = onBack;
  useEffect(() => {
    const current = ++generation.current;
    if (!active || !sessionId) return;
    const state = () => ({ ...(window.history.state ?? {}), [GUARD]: sessionId });
    if (window.history.state?.[GUARD] !== sessionId) window.history.pushState(state(), '', window.location.href);
    const back = () => {
      if (window.history.state?.[GUARD] === sessionId) return;
      window.history.pushState(state(), '', window.location.href);
      callback.current();
    };
    window.addEventListener('popstate', back);
    return () => {
      window.removeEventListener('popstate', back);
      queueMicrotask(() => {
        if ((generation.current === current || !activeRef.current) && window.history.state?.[GUARD] === sessionId) window.history.back();
      });
    };
  }, [active, sessionId]);
}
