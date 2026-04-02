export interface CompletedFlight {
  id: string;
  departure: {
    iata: string;
    city: string;
    country: string;
    lat: number;
    lon: number;
  };
  destination: {
    iata: string;
    city: string;
    country: string;
    lat: number;
    lon: number;
  };
  durationMinutes: number;
  distanceKm: number;
  date: string;        // ISO 8601
  flightNumber: string;
  airline: string;
}
