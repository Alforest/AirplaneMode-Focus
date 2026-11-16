export interface AnalyticsAdapter {
  getDistinctId: () => string;
  identify: (id: string) => void;
  reset: () => void;
  capture: (event: string, props?: Record<string, unknown>, instant?: boolean) => void;
}

// Pure identity state machine, also tested without a browser or PostHog network calls.
export function createAnalyticsIdentity(adapter: AnalyticsAdapter) {
  let ready = false;
  let user: string | null | undefined;
  let initialPageview = false;
  const queued: Array<{ event: string; props?: Record<string, unknown>; instant?: boolean }> = [];
  function resolve() {
    if (!ready || user === undefined) return;
    const target = user ? `account:${user}` : null;
    const current = adapter.getDistinctId();
    if (current.startsWith('account:') && current !== target) adapter.reset();
    if (target && adapter.getDistinctId() !== target) adapter.identify(target);
    if (!initialPageview) {
      adapter.capture('$pageview');
      initialPageview = true;
    }
    for (const item of queued.splice(0)) adapter.capture(item.event, item.props, item.instant);
  }
  return {
    ready() { ready = true; resolve(); },
    setUser(id: string | null) { user = id; resolve(); },
    capture(event: string, props?: Record<string, unknown>, instant?: boolean) {
      if (!ready || user === undefined) {
        if (queued.length < 100) queued.push({ event, props, instant });
      } else adapter.capture(event, props, instant);
    },
  };
}
