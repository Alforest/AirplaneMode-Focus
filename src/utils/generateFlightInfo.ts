import { airlinesByAirport, FALLBACK_AIRLINES, type AirlineEntry } from '../data/airlineRoutes';
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

// Returns preferred tier first, then fallback tiers, for the given distance
function preferredTiers(distanceKm: number): AircraftTier[] {
  if (distanceKm < 1_500)  return ['regional', 'narrowbody'];
  if (distanceKm < 4_500)  return ['narrowbody', 'regional', 'widebody'];
  return ['widebody', 'narrowbody'];
}

function pickAircraft(entry: AirlineEntry, distanceKm: number): string {
  const tiers = preferredTiers(distanceKm);
  for (const tier of tiers) {
    const candidates = entry.aircraft.filter(a => AIRCRAFT_TIER[a] === tier);
    if (candidates.length > 0) return pick(candidates);
  }
  // No tier match — use any aircraft this airline operates from this airport
  return pick(entry.aircraft);
}

export function generateFlightInfo(departureIata: string, distanceKm: number): FlightInfo {
  const airlinePool = airlinesByAirport[departureIata]?.length
    ? airlinesByAirport[departureIata]
    : FALLBACK_AIRLINES;

  const airline = pick(airlinePool);
  const aircraft = pickAircraft(airline, distanceKm);
  const seatClass = pick(SEAT_CLASSES);
  const flightNumber = `${airline.code}${randInt(1000, 9999)}`;

  let seat: string;
  if (seatClass === 'Business') {
    seat = `${pick(SEAT_ROWS_BUSINESS)}${pick(SEAT_LETTERS_BUSINESS)}`;
  } else if (seatClass === 'Premium Economy') {
    seat = `${pick(SEAT_ROWS_PREMIUM)}${pick(SEAT_LETTERS_PREMIUM)}`;
  } else {
    seat = `${pick(SEAT_ROWS_ECONOMY)}${pick(SEAT_LETTERS_ECONOMY)}`;
  }

  const gate = `${pick(GATES)}${randInt(1, 32)}`;
  const terminal = pick(TERMINALS);
  const passengerName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

  return {
    airline: airline.name,
    flightNumber,
    aircraft,
    seat,
    gate,
    seatClass,
    passengerName,
    terminal,
  };
}
