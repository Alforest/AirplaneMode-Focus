export type MapPoint = [number, number];
export interface FollowMap {
  isMoving: () => boolean;
  easeTo: (options: { center: MapPoint; duration: number; easing: (t: number) => number; easeId: string; noMoveStart: boolean }) => unknown;
}

// Retarget a still-running native animation, using the same easeId so Mapbox
// doesn't emit an end/start pair. Predicting the endpoint avoids chasing an
// already-old position. For constant-speed flight, each segment has the same
// velocity even when frame rates or the retarget interval vary.
export function createFollowCamera() {
  const duration = 800;
  const interval = 200;
  let nextUpdate = 0;
  let ownsAnimation = false;
  let lastTarget: MapPoint | null = null;
  return {
    release() { ownsAnimation = false; nextUpdate = 0; lastTarget = null; },
    update(map: FollowMap, positionAt: (time: number) => MapPoint, now: number) {
      if (now < nextUpdate || (!ownsAnimation && map.isMoving())) return;
      const center = positionAt(now + duration);
      nextUpdate = now + interval;
      if (lastTarget && center[0] === lastTarget[0] && center[1] === lastTarget[1]) return;
      lastTarget = center;
      map.easeTo({ center, duration, easing: t => t, easeId: 'focusflight-follow', noMoveStart: true });
      ownsAnimation = true;
    },
  };
}
