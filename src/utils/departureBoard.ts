import { Airport, findAirportByIata } from '../data/airports';
import { AIRLINES, AIRCRAFT, routesByAirport, FALLBACK_AIRLINES } from '../data/airlineRoutes';
import { haversineKm, findDestinations, CRUISING_SPEED_KMH } from './flightCalculations';

/** One row on the departure board — a bookable flight */
export interface BoardFlight {
  destination: Airport;
  distanceKm: number;
  durationMinutes: number;
  airline: string;
  airlineCode: string;
  aircraft: string;
  flightNumber: string;
  /** false when synthesized because the airport has no route data */
  isReal: boolean;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Block time: cruise at 885 km/h plus taxi/climb overhead, rounded to 5 min */
function blockMinutes(distanceKm: number): number {
  const cruise = (distanceKm / CRUISING_SPEED_KMH) * 60;
  return Math.max(25, Math.round((cruise + 20) / 5) * 5);
}

/** Synthetic flights for airports with no route data: geometric destinations across duration bands */
function syntheticFlights(departure: Airport, excludeIatas: Set<string>): BoardFlight[] {
  const flights: BoardFlight[] = [];
  for (const minutes of [30, 60, 90, 120, 180, 240, 360, 480, 600]) {
    for (const dest of findDestinations(departure, minutes)) {
      if (excludeIatas.has(dest.iata)) continue;
      excludeIatas.add(dest.iata);
      const dist = haversineKm(departure.lat, departure.lon, dest.lat, dest.lon);
      const airline = FALLBACK_AIRLINES[Math.floor(Math.random() * FALLBACK_AIRLINES.length)];
      flights.push({
        destination: dest,
        distanceKm: dist,
        durationMinutes: blockMinutes(dist),
        airline: airline.name,
        airlineCode: airline.code,
        aircraft: airline.aircraft[Math.floor(Math.random() * airline.aircraft.length)],
        flightNumber: `${airline.code} ${randInt(100, 999)}`,
        isReal: false,
      });
    }
  }
  return flights;
}

/**
 * The full departure board for an airport: every real nonstop route (one row
 * per destination, random pick among the carriers actually flying it),
 * sorted by flight duration. Airports with little or no route data get
 * synthetic geometric destinations so the board is never empty.
 */
export function getFlightsFrom(departure: Airport): BoardFlight[] {
  const legs = routesByAirport[departure.iata] ?? [];
  const flights: BoardFlight[] = [];
  const seen = new Set<string>();

  for (const [destIata, options] of legs) {
    const dest = findAirportByIata(destIata);
    if (!dest) continue;
    const [airlineIdx, aircraftIdxs] = options[Math.floor(Math.random() * options.length)];
    const airline = AIRLINES[airlineIdx];
    const dist = haversineKm(departure.lat, departure.lon, dest.lat, dest.lon);
    seen.add(destIata);
    flights.push({
      destination: dest,
      distanceKm: dist,
      durationMinutes: blockMinutes(dist),
      airline: airline.name,
      airlineCode: airline.code,
      aircraft: AIRCRAFT[aircraftIdxs[Math.floor(Math.random() * aircraftIdxs.length)]],
      flightNumber: `${airline.code} ${randInt(100, 9999)}`,
      isReal: true,
    });
  }

  if (flights.length < 5) {
    seen.add(departure.iata);
    flights.push(...syntheticFlights(departure, seen));
  }

  return flights.sort(
    (a, b) => a.durationMinutes - b.durationMinutes || a.destination.city.localeCompare(b.destination.city)
  );
}

/** One random bookable flight from an airport (landing-page ambient board) */
export function randomFlightFrom(departureIata: string): { departure: Airport; flight: BoardFlight } | null {
  const departure = findAirportByIata(departureIata);
  if (!departure) return null;
  const flights = getFlightsFrom(departure);
  if (!flights.length) return null;
  return { departure, flight: flights[Math.floor(Math.random() * flights.length)] };
}
