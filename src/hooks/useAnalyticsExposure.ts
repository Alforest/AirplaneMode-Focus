import { useEffect, useRef } from 'react';
import { track } from '../lib/analytics';

// Count exposure when content enters the viewport, not merely when a dialog mounts.
export function useAnalyticsExposure(event: string, props: Record<string, unknown>, identity: string, ready = true) {
  const element = useRef<HTMLElement>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    if (!ready || !element.current) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      track(event, latest.current);
      observer.disconnect();
    }, { threshold: 0.1 });
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [event, identity, ready]);
  return element;
}
