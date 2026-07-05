import { AIRLINES, AIRCRAFT, routesByAirport, FALLBACK_AIRLINES } from '../data/airlineRoutes';
import { AIRCRAFT_TIER, type AircraftTier } from '../data/aircraftTiers';

export interface FlightInfo {
  airline: string;
  flightNumber: string;
  aircraft: string;
  seat: string;
  gate: string;
  seatClass: string;
  passengerName: string;
  terminal: string;
}

/** A carrier operating a specific leg, with the equipment it flies on it */
export interface RouteCarrier {
  name: string;
  code: string;
  aircraft: string[];
}

const SEAT_CLASSES = ['Economy', 'Premium Economy', 'Business'];
const SEAT_ROWS_ECONOMY = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const SEAT_ROWS_PREMIUM = [8, 9, 10, 11, 12, 13, 14, 15];
const SEAT_ROWS_BUSINESS = [1, 2, 3, 4, 5, 6];
const SEAT_LETTERS_ECONOMY = ['A', 'B', 'C', 'D', 'E', 'F'];
const SEAT_LETTERS_PREMIUM = ['A', 'C', 'D', 'F'];
const SEAT_LETTERS_BUSINESS = ['A', 'D'];

const GATES = ['A', 'B', 'C', 'D', 'E'];
const TERMINALS = ['1', '2', '3', 'A', 'B'];

const FIRST_NAMES = ['Alex', 'Jordan', 'Sam', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Avery', 'Quinn', 'Drew'];
const LAST_NAMES = ['Chen', 'Rivera', 'Smith', 'Johnson', 'Williams', 'Brown', 'Lee', 'Garcia', 'Martinez', 'Davis'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Carriers actually flying departure → destination nonstop (empty if no data) */
export function getCarriersForRoute(departureIata: string, destinationIata: string): RouteCarrier[] {
  const legs = routesByAirport[departureIata];
  const leg = legs?.find(([dest]) => dest === destinationIata);
  if (!leg) return [];
  return leg[1].map(([airlineIdx, aircraftIdxs]) => ({
    ...AIRLINES[airlineIdx],
    aircraft: aircraftIdxs.map(i => AIRCRAFT[i]),
  }));
}

/** All carriers departing an airport, across all its legs (fallback pool) */
function getCarriersAtAirport(departureIata: string): RouteCarrier[] {
  const legs = routesByAirport[departureIata];
  if (!legs) return [];
  const byAirline = new Map<number, Set<number>>();
  for (const [, options] of legs) {
    for (const [airlineIdx, aircraftIdxs] of options) {
      if (!byAirline.has(airlineIdx)) byAirline.set(airlineIdx, new Set());
      const set = byAirline.get(airlineIdx)!;
      for (const i of aircraftIdxs) set.add(i);
    }
  }
  return [...byAirline.entries()].map(([airlineIdx, aircraftIdxs]) => ({
    ...AIRLINES[airlineIdx],
    aircraft: [...aircraftIdxs].map(i => AIRCRAFT[i]),
  }));
}

// Returns preferred tier first, then fallback tiers, for the given distance
function preferredTiers(distanceKm: number): AircraftTier[] {
  if (distanceKm < 1_500)  return ['regional', 'narrowbody'];
  if (distanceKm < 4_500)  return ['narrowbody', 'regional', 'widebody'];
  return ['widebody', 'narrowbody'];
}

export function pickAircraftFor(aircraft: string[], distanceKm: number): string {
  const tiers = preferredTiers(distanceKm);
  for (const tier of tiers) {
    const candidates = aircraft.filter(a => AIRCRAFT_TIER[a] === tier);
    if (candidates.length > 0) return pick(candidates);
  }
  return pick(aircraft);
}

/** Pick a real carrier + aircraft for a leg: route data first, then airport-level, then fallback */
export function pickCarrier(departureIata: string, destinationIata: string, distanceKm: number): {
  airline: string;
  code: string;
  aircraft: string;
} {
  const pool = getCarriersForRoute(departureIata, destinationIata);
  const carriers = pool.length ? pool : getCarriersAtAirport(departureIata);
  const carrier = carriers.length ? pick(carriers) : pick(FALLBACK_AIRLINES);
  return {
    airline: carrier.name,
    code: carrier.code,
    aircraft: pickAircraftFor(carrier.aircraft, distanceKm),
  };
}

/** Random seat/gate/passenger details around a known airline + aircraft */
export function buildFlightInfo(airline: string, code: string, aircraft: string, flightNumber?: string): FlightInfo {
  const seatClass = pick(SEAT_CLASSES);

  let seat: string;
  if (seatClass === 'Business') {
    seat = `${pick(SEAT_ROWS_BUSINESS)}${pick(SEAT_LETTERS_BUSINESS)}`;
  } else if (seatClass === 'Premium Economy') {
    seat = `${pick(SEAT_ROWS_PREMIUM)}${pick(SEAT_LETTERS_PREMIUM)}`;
  } else {
    seat = `${pick(SEAT_ROWS_ECONOMY)}${pick(SEAT_LETTERS_ECONOMY)}`;
  }

  return {
    airline,
    flightNumber: flightNumber ?? `${code}${randInt(1000, 9999)}`,
    aircraft,
    seat,
    gate: `${pick(GATES)}${randInt(1, 32)}`,
    seatClass,
    passengerName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    terminal: pick(TERMINALS),
  };
}

export function generateFlightInfo(departureIata: string, destinationIata: string, distanceKm: number): FlightInfo {
  const { airline, code, aircraft } = pickCarrier(departureIata, destinationIata, distanceKm);
  return buildFlightInfo(airline, code, aircraft);
}
