import { Airport, airports } from '../data/airports';

const CRUISING_SPEED_KMH = 885; // ~550 mph

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Compute a great-circle arc as N interpolated [lon, lat] points
 */
export function greatCircleArc(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  numPoints = 100
): [number, number][] {
  const points: [number, number][] = [];

  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  // Central angle
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
  ));

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;

    if (d === 0) {
      points.push([lon1, lat1]);
      continue;
    }

    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    const lon = toDeg(Math.atan2(y, x));

    points.push([lon, lat]);
  }

  return points;
}

/**
 * Find 3 destination airports in different compass sectors
 * for a given departure and study duration
 */
export function findDestinations(departure: Airport, durationMinutes: number): Airport[] {
  const durationHours = durationMinutes / 60;
  const maxDistKm = durationHours * CRUISING_SPEED_KMH;
  const minDistKm = maxDistKm * 0.65;

  // Score and filter airports
  const candidates = airports
    .filter(a => a.iata !== departure.iata)
    .map(a => ({
      airport: a,
      dist: haversineKm(departure.lat, departure.lon, a.lat, a.lon),
      bearing: bearingDeg(departure.lat, departure.lon, a.lat, a.lon),
    }))
    .filter(({ dist }) => dist >= minDistKm && dist <= maxDistKm)
    .sort((a, b) => {
      // Prefer airports closer to 85% of max distance
      const targetDist = maxDistKm * 0.85;
      return Math.abs(a.dist - targetDist) - Math.abs(b.dist - targetDist);
    });

  if (candidates.length === 0) {
    // Fallback: just pick 3 closest to target distance regardless of range
    const targetDist = maxDistKm * 0.85;
    const fallback = airports
      .filter(a => a.iata !== departure.iata)
      .map(a => ({
        airport: a,
        dist: haversineKm(departure.lat, departure.lon, a.lat, a.lon),
        bearing: bearingDeg(departure.lat, departure.lon, a.lat, a.lon),
      }))
      .sort((a, b) => Math.abs(a.dist - targetDist) - Math.abs(b.dist - targetDist))
      .slice(0, 20);

    return pickDiverse(fallback);
  }

  return pickDiverse(candidates);
}

function pickDiverse(
  candidates: { airport: Airport; dist: number; bearing: number }[]
): Airport[] {
  // Divide compass into 3 sectors of 120° each
  const sectors = [
    { min: 0, max: 120 },
    { min: 120, max: 240 },
    { min: 240, max: 360 },
  ];

  const picks: Airport[] = [];
  const usedIatas = new Set<string>();

  for (const sector of sectors) {
    const inSector = candidates.filter(
      c => c.bearing >= sector.min && c.bearing < sector.max && !usedIatas.has(c.airport.iata)
    );
    if (inSector.length > 0) {
      picks.push(inSector[0].airport);
      usedIatas.add(inSector[0].airport.iata);
    }
  }

  // If we didn't fill all 3 sectors, fill from remaining candidates
  for (const c of candidates) {
    if (picks.length >= 3) break;
    if (!usedIatas.has(c.airport.iata)) {
      picks.push(c.airport);
      usedIatas.add(c.airport.iata);
    }
  }

  return picks.slice(0, 3);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
