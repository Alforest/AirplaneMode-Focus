import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalStats } from '../src/utils/personalStats';
import type { CompletedFlight } from '../src/types/history';

function flight(date: Date, durationMinutes = 60, destination = 'LHR'): CompletedFlight {
  return {
    id: crypto.randomUUID(), date: date.toISOString(), durationMinutes, distanceKm: 1000,
    departure: { iata: 'JFK', city: 'New York', country: 'US', lat: 40, lon: -73 },
    destination: { iata: destination, city: 'London', country: 'UK', lat: 51, lon: 0 },
    flightNumber: 'CL100', airline: 'CloudAir',
  };
}
test('new traveler has zero stats', () => {
  assert.deepEqual(personalStats([], new Date(2026, 10, 16, 12)), {
    totalMinutes: 0, weekMinutes: 0, totalKm: 0, longestMinutes: 0,
    destinations: 0, countries: 0, flightCount: 0, streak: 0,
  });
});
test('week starts Monday and does not count future sessions', () => {
  const now = new Date(2026, 10, 16, 12);
  const stats = personalStats([
    flight(new Date(2026, 10, 15, 22), 120),
    flight(new Date(2026, 10, 16, 1), 45),
    flight(new Date(2026, 10, 16, 11), 30),
    flight(new Date(2026, 10, 17, 1), 90),
  ], now);
  assert.equal(stats.weekMinutes, 75);
  assert.equal(stats.longestMinutes, 120);
  assert.equal(stats.destinations, 1);
  assert.equal(stats.flightCount, 4);
  assert.equal(stats.streak, 2);
});
test('multiple flights on one day contribute one streak day', () => {
  const stats = personalStats([
    flight(new Date(2026, 10, 15, 9)), flight(new Date(2026, 10, 15, 11)),
    flight(new Date(2026, 10, 14, 9)),
  ], new Date(2026, 10, 16, 12));
  assert.equal(stats.streak, 2);
  assert.equal(stats.totalMinutes, 180);
});
test('missing yesterday breaks streak', () => {
  assert.equal(personalStats([flight(new Date(2026, 10, 14, 9))], new Date(2026, 10, 16, 12)).streak, 0);
});
test('streak crosses month and year boundaries', () => {
  const stats = personalStats([
    flight(new Date(2027, 0, 1, 9)), flight(new Date(2026, 11, 31, 9)),
    flight(new Date(2026, 11, 30, 9)),
  ], new Date(2027, 0, 1, 12));
  assert.equal(stats.streak, 3);
});
test('destinations count unique airports', () => {
  const stats = personalStats([
    flight(new Date(2026, 10, 16, 9), 45, 'LHR'),
    flight(new Date(2026, 10, 16, 10), 60, 'LGW'),
    flight(new Date(2026, 10, 16, 11), 90, 'LHR'),
  ], new Date(2026, 10, 16, 12));
  assert.equal(stats.destinations, 2);
  assert.equal(stats.totalMinutes, 195);
  assert.equal(stats.countries, 1);
});
