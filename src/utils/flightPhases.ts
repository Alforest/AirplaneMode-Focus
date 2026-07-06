// ---------------------------------------------------------------------------
// flightPhases — ground-phase theater. A flight is: boarding (parked) →
// taxiing (creep along the first ~2.5 km of the arc at ground zoom) →
// airborne (the remaining arc) → landing rollout (last ~2 km on the ground).
// Session progress p (0–1, timer-driven) is remapped onto the arc so the
// plane behaves like the status label says. Ground phases are percentage-
// based but time-capped so a 9-hour long-haul doesn't taxi for 40 minutes.
// ---------------------------------------------------------------------------

export interface PhaseTimeline {
  boardEnd: number;  // p where pushback/taxi starts
  takeoff: number;   // p where wheels leave the ground
  touchdown: number; // p where wheels touch at the destination
}

const BOARD_CAP_S = 45;
const TAXI_CAP_S = 150;
const ROLLOUT_CAP_S = 90;

// Kept short enough to stay on the airfield — the arc leaves the airport
// reference point in the flight direction, and e.g. JFK meets water ~2 km out
const TAXI_KM = 1.8;    // ground distance covered while taxiing out
const ROLLOUT_KM = 1.5; // ground distance after touchdown

export function getTimeline(durationMinutes: number): PhaseTimeline {
  const totalS = durationMinutes * 60;
  const board = Math.min(0.03 * totalS, BOARD_CAP_S) / totalS;
  const taxi = Math.min(0.05 * totalS, TAXI_CAP_S) / totalS;
  const rollout = Math.min(0.04 * totalS, ROLLOUT_CAP_S) / totalS;
  return { boardEnd: board, takeoff: board + taxi, touchdown: 1 - rollout };
}

function groundArcFractions(totalKm: number) {
  return {
    taxi: Math.min(TAXI_KM / totalKm, 0.02),
    rollout: Math.min(ROLLOUT_KM / totalKm, 0.015),
  };
}

/** Fraction of the great-circle arc traveled at session progress p. */
export function arcFraction(p: number, tl: PhaseTimeline, totalKm: number): number {
  const g = groundArcFractions(totalKm);
  if (p <= tl.boardEnd) return 0;
  if (p < tl.takeoff) {
    return g.taxi * ((p - tl.boardEnd) / (tl.takeoff - tl.boardEnd));
  }
  if (p < tl.touchdown) {
    return g.taxi + (1 - g.taxi - g.rollout) * ((p - tl.takeoff) / (tl.touchdown - tl.takeoff));
  }
  return Math.min(1, 1 - g.rollout + g.rollout * ((p - tl.touchdown) / (1 - tl.touchdown)));
}

/** On the ground (parked, taxiing, or rolling out) → camera stays zoomed in. */
export function isOnGround(p: number, tl: PhaseTimeline): boolean {
  return p < tl.takeoff || p >= tl.touchdown;
}

export function getFlightStatus(p: number, tl: PhaseTimeline): string {
  if (p >= 1) return 'Landed!';
  if (p < tl.boardEnd) return 'Boarding';
  if (p < tl.takeoff) return 'Taxiing';
  if (p >= tl.touchdown) return 'Taxiing to gate';
  const ap = (p - tl.takeoff) / (tl.touchdown - tl.takeoff);
  if (ap < 0.15) return 'Ascending';
  if (ap < 0.85) return 'Cruising';
  return 'Descending';
}

export function getSimulatedStats(p: number, tl: PhaseTimeline, totalKm: number) {
  const distRemainingKm = Math.round(totalKm * (1 - arcFraction(p, tl, totalKm)));

  if (p < tl.boardEnd) {
    return { altitudeFt: 0, speedMph: 0, distRemainingKm };
  }
  if (p < tl.takeoff) {
    // taxi speed ramps up and back down before holding short of the runway
    const tp = (p - tl.boardEnd) / (tl.takeoff - tl.boardEnd);
    return { altitudeFt: 0, speedMph: Math.round(21 * Math.sin(Math.PI * tp)), distRemainingKm };
  }
  if (p >= tl.touchdown) {
    // decelerating down the runway, then a slow taxi to the gate
    const rp = (p - tl.touchdown) / (1 - tl.touchdown);
    return {
      altitudeFt: 0,
      speedMph: p >= 1 ? 0 : Math.max(Math.round(130 * (1 - rp)), 9),
      distRemainingKm,
    };
  }
  // airborne — parabolic curve over the air segment; floor keeps rotation
  // and final approach at a plausible ~165 mph instead of dipping to zero
  const ap = (p - tl.takeoff) / (tl.touchdown - tl.takeoff);
  const curve = Math.sin(Math.PI * ap);
  return {
    altitudeFt: Math.round(35000 * curve),
    speedMph: Math.max(Math.round(575 * curve), 165),
    distRemainingKm,
  };
}
