/**
 * buildAirlineRoutes.ts
 *
 * Data generation script. Run with:
 *   npm run data:routes   (or: npx tsx scripts/buildAirlineRoutes.ts)
 *
 * Rerun after regenerating airports (npm run data:airports) so the
 * route keys stay in sync with the airport list.
 *
 * Prerequisites — place these files in scripts/data/ (never commit them):
 *   scripts/data/routes.dat   from https://github.com/jpatokal/openflights/blob/master/data/routes.dat
 *   scripts/data/airlines.dat from https://github.com/jpatokal/openflights/blob/master/data/airlines.dat
 *
 * Output: src/data/airlineRoutes.ts (commit this file) — real route pairs:
 * for each source airport, the destinations actually served nonstop and the
 * airlines/equipment flying each leg. Airline names and aircraft display
 * names are emitted once and referenced by index to keep the file small.
 *
 * Caveat: OpenFlights route data is a June 2014 snapshot (the only good free
 * bulk source; current schedules are commercial). DEFUNCT_AIRLINES prunes
 * carriers that have since folded.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { airports } from '../src/data/airports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ROUTES_DAT  = path.join(ROOT, 'scripts/data/routes.dat');
const AIRLINES_DAT = path.join(ROOT, 'scripts/data/airlines.dat');
const OUT_FILE    = path.join(ROOT, 'src/data/airlineRoutes.ts');

// Airlines that ceased operations after the 2014 route snapshot
const DEFUNCT_AIRLINES = new Set([
  'AB', // airberlin (2017)
  '9W', // Jet Airways (2019)
  'MT', // Thomas Cook Airlines (2019)
  'ZB', // Monarch Airlines (2017)
  'WU', // Wizz Air Ukraine (2015)
  'VX', // Virgin America (merged into Alaska, 2018)
  'IG', // Meridiana / Air Italy (2020)
  'KF', // Blue1 (2016)
  '7H', // Ravn Alaska (2020)
  'US', // US Airways (merged into American, 2015)
  'FL', // AirTran (merged into Southwest, 2014)
  'WW', // WOW air (2019)
  'UN', // Transaero (2015)
]);

// Carriers that rebranded since the 2014 snapshot — same code, new name
const RENAMED_AIRLINES: Record<string, string> = {
  'AZ': 'ITA Airways',      // was Alitalia
  'LA': 'LATAM Airlines',   // was LAN Airlines
  'JJ': 'LATAM Brasil',     // was TAM Linhas Aéreas
  '4U': 'Eurowings',        // was Germanwings
  'BY': 'TUI Airways',      // was Thomson Airways
};

// IATA equipment code → display name
// Codes from OpenFlights planes.dat + common additions
const EQUIPMENT_MAP: Record<string, string> = {
  // Regional jets & turboprops
  'AT4': 'ATR 42',
  'AT7': 'ATR 72',
  'CR2': 'CRJ-200',
  'CRJ': 'CRJ-200',
  'CR7': 'CRJ-700',
  'CR9': 'CRJ-900',
  'DH4': 'Dash 8 Q400',
  'E70': 'Embraer E170',
  'E7W': 'Embraer E175',
  'E75': 'Embraer E175',
  'E7S': 'Embraer E175',
  'E90': 'Embraer E190',
  'E95': 'Embraer E195',
  'ER4': 'Embraer ERJ-145',
  'ERJ': 'Embraer ERJ-145',
  'ER3': 'Embraer ERJ-145',
  'E45': 'Embraer ERJ-145',
  'EM2': 'Embraer EMB-120',
  'CRK': 'CRJ-1000',
  'DH8': 'Dash 8 Q300',
  'DH1': 'Dash 8 Q300',
  'DH2': 'Dash 8 Q300',
  'DH3': 'Dash 8 Q300',
  'SF3': 'Saab 340',
  'S20': 'Saab 2000',
  'F50': 'Fokker 50',
  'F70': 'Fokker 70',
  '100': 'Fokker 100',
  '146': 'Avro RJ85',
  'AR1': 'Avro RJ85',
  'AR7': 'Avro RJ85',
  'AR8': 'Avro RJ85',
  'RJ1': 'Avro RJ85',
  'RJ8': 'Avro RJ85',
  'J31': 'Jetstream 41',
  'J32': 'Jetstream 41',
  'J41': 'Jetstream 41',
  'BEH': 'Beech 1900D',
  'DHT': 'DHC-6 Twin Otter',
  'SU9': 'Sukhoi Superjet 100',
  'AN4': 'Antonov An-24',
  'ATR': 'ATR 72',
  'AT3': 'ATR 42',
  'AT5': 'ATR 42',

  // Narrowbodies
  '221': 'Airbus A220-100',
  'BCS1': 'Airbus A220-100',
  '223': 'Airbus A220-300',
  'BCS3': 'Airbus A220-300',
  '318': 'Airbus A319',
  '319': 'Airbus A319',
  '320': 'Airbus A320',
  '321': 'Airbus A321',
  '32N': 'Airbus A321neo',
  '32Q': 'Airbus A220-300',
  '735': 'Boeing 737-500',
  '73W': 'Boeing 737-700',
  '738': 'Boeing 737-800',
  '73H': 'Boeing 737-800',
  '739': 'Boeing 737-900',
  '73J': 'Boeing 737-900',
  '7M8': 'Boeing 737 MAX 8',
  '7M9': 'Boeing 737 MAX 9',
  'B38M': 'Boeing 737 MAX 8',
  'B39M': 'Boeing 737 MAX 9',
  '737': 'Boeing 737-800',
  '73G': 'Boeing 737-700',
  '733': 'Boeing 737-300',
  '734': 'Boeing 737-400',
  '736': 'Boeing 737-600',
  '757': 'Boeing 757-200',
  '752': 'Boeing 757-200',
  '753': 'Boeing 757-300',
  '717': 'Boeing 717',
  '727': 'Boeing 727-200',
  '722': 'Boeing 727-200',
  '32S': 'Airbus A320',
  'M80': 'MD-80',
  'M81': 'MD-80',
  'M82': 'MD-80',
  'M83': 'MD-80',
  'M87': 'MD-80',
  'M88': 'MD-80',
  'M90': 'MD-90',

  // Widebodies
  '332': 'Airbus A330-200',
  '333': 'Airbus A330-300',
  '338': 'Airbus A330-800neo',
  '339': 'Airbus A330-900neo',
  '343': 'Airbus A340-300',
  '346': 'Airbus A340-600',
  '359': 'Airbus A350-900',
  '35K': 'Airbus A350-900',
  '351': 'Airbus A350-1000',
  '388': 'Airbus A380-800',
  '744': 'Boeing 747-400',
  '74H': 'Boeing 747-400',
  '748': 'Boeing 747-8',
  '767': 'Boeing 767-300ER',
  '76W': 'Boeing 767-300ER',
  '76E': 'Boeing 767-300ER',
  '763': 'Boeing 767-300ER',
  '772': 'Boeing 777-200',
  '77L': 'Boeing 777-200LR',
  '773': 'Boeing 777-300',
  '77W': 'Boeing 777-300ER',
  '788': 'Boeing 787-8',
  '789': 'Boeing 787-9',
  '78X': 'Boeing 787-10',
  '777': 'Boeing 777-300ER',
  '787': 'Boeing 787-9',
  '747': 'Boeing 747-400',
  '764': 'Boeing 767-300ER',
  '330': 'Airbus A330-300',
  '340': 'Airbus A340-300',
  '350': 'Airbus A350-900',
  '380': 'Airbus A380-800',
  '310': 'Airbus A310',
  '312': 'Airbus A310',
  '313': 'Airbus A310',
  'AB6': 'Airbus A300-600',
  'M11': 'MD-11',
};

async function readLines(filePath: string): Promise<string[]> {
  const lines: string[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    lines.push(line);
  }
  return lines;
}

async function main() {
  if (!fs.existsSync(ROUTES_DAT)) {
    console.error(`Missing: ${ROUTES_DAT}`);
    console.error('Download from: https://github.com/jpatokal/openflights/blob/master/data/routes.dat');
    process.exit(1);
  }
  if (!fs.existsSync(AIRLINES_DAT)) {
    console.error(`Missing: ${AIRLINES_DAT}`);
    console.error('Download from: https://github.com/jpatokal/openflights/blob/master/data/airlines.dat');
    process.exit(1);
  }

  // Build known airports set
  const knownAirports = new Set(airports.map(a => a.iata));
  console.log(`Loaded ${knownAirports.size} airports from airports.ts`);

  // Parse airlines.dat → Map<iataCode, displayName>
  // Format: AirlineID,Name,Alias,IATA,ICAO,Callsign,Country,Active
  const airlineNames = new Map<string, string>();
  const airlineLines = await readLines(AIRLINES_DAT);
  for (const line of airlineLines) {
    const parts = line.split(',');
    if (parts.length < 8) continue;
    const name   = parts[1].replace(/^"|"$/g, '');
    const iata   = parts[3].replace(/^"|"$/g, '');
    const active = parts[7].replace(/^"|"$/g, '');
    if (iata && iata !== '\\N' && iata.length === 2 && active === 'Y' && !DEFUNCT_AIRLINES.has(iata)) {
      if (/cargo/i.test(name)) continue; // freight carriers share codes with pax siblings (LH → Lufthansa Cargo)
      if (airlineNames.has(iata)) continue; // duplicate IATA codes: first entry wins (the primary carrier)
      airlineNames.set(iata, RENAMED_AIRLINES[iata] ?? name);
    }
  }
  console.log(`Loaded ${airlineNames.size} active airlines`);

  // Parse routes.dat
  // Format: Airline,AirlineID,SourceAirport,SourceAirportID,DestAirport,DestAirportID,Codeshare,Stops,Equipment
  // routeMap: sourceAirport → destAirport → airlineCode → Set<aircraftDisplayName>
  const routeMap = new Map<string, Map<string, Map<string, Set<string>>>>();
  const routeLines = await readLines(ROUTES_DAT);
  let skipped = 0;
  let processed = 0;

  for (const line of routeLines) {
    const parts = line.split(',');
    if (parts.length < 9) continue;

    const airlineCode   = parts[0].trim();
    const sourceAirport = parts[2].trim();
    const destAirport   = parts[4].trim();
    const equipmentStr  = parts[8].trim();

    // Codeshare rows are kept: they're bookable flights under the marketing
    // carrier (e.g. Iberia's MAD→TLS operated by Air Nostrum).
    if (airlineCode === '\\N' || sourceAirport === '\\N' || destAirport === '\\N') { skipped++; continue; }
    if (!airlineNames.has(airlineCode)) { skipped++; continue; }
    if (!knownAirports.has(sourceAirport) || !knownAirports.has(destAirport)) { skipped++; continue; }

    const equipCodes = equipmentStr.split(' ').filter(Boolean);
    const aircraftNames: string[] = [];
    for (const code of equipCodes) {
      const name = EQUIPMENT_MAP[code];
      if (name) aircraftNames.push(name);
    }
    if (aircraftNames.length === 0) { skipped++; continue; }

    if (!routeMap.has(sourceAirport)) routeMap.set(sourceAirport, new Map());
    const byDest = routeMap.get(sourceAirport)!;
    if (!byDest.has(destAirport)) byDest.set(destAirport, new Map());
    const byAirline = byDest.get(destAirport)!;
    if (!byAirline.has(airlineCode)) byAirline.set(airlineCode, new Set());
    const aircraftSet = byAirline.get(airlineCode)!;
    for (const name of aircraftNames) aircraftSet.add(name);
    processed++;
  }

  const totalLegs = [...routeMap.values()].reduce((n, byDest) => n + byDest.size, 0);
  console.log(`Routes processed: ${processed}, skipped: ${skipped}`);
  console.log(`Source airports with data: ${routeMap.size}, nonstop legs: ${totalLegs}`);

  // Normalize: airline codes and aircraft names → index tables
  const usedAirlineCodes = new Set<string>();
  const usedAircraft = new Set<string>();
  for (const byDest of routeMap.values()) {
    for (const byAirline of byDest.values()) {
      for (const [code, aircraftSet] of byAirline) {
        usedAirlineCodes.add(code);
        for (const name of aircraftSet) usedAircraft.add(name);
      }
    }
  }
  const airlineList = [...usedAirlineCodes]
    .map(code => ({ code, name: airlineNames.get(code)! }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const airlineIndex = new Map(airlineList.map((a, i) => [a.code, i]));
  const aircraftList = [...usedAircraft].sort();
  const aircraftIndex = new Map(aircraftList.map((a, i) => [a, i]));

  // Serialize
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED by scripts/buildAirlineRoutes.ts — do not edit manually');
  lines.push('// Source: OpenFlights routes.dat + airlines.dat (github.com/jpatokal/openflights)');
  lines.push('// Real nonstop route pairs. Airlines and aircraft are referenced by index');
  lines.push('// into AIRLINES / AIRCRAFT to keep the bundle small.');
  lines.push('');
  lines.push('export interface AirlineRef {');
  lines.push('  name: string;');
  lines.push('  code: string;');
  lines.push('}');
  lines.push('');
  lines.push('/** [airlineIndex, aircraftIndexes] — one carrier operating a leg */');
  lines.push('export type RouteOption = [number, number[]];');
  lines.push('');
  lines.push('/** [destinationIata, carriers] — one nonstop leg from a source airport */');
  lines.push('export type AirportRoute = [string, RouteOption[]];');
  lines.push('');
  lines.push(`export const AIRLINES: AirlineRef[] = [`);
  for (const a of airlineList) {
    lines.push(`  { name: ${JSON.stringify(a.name)}, code: ${JSON.stringify(a.code)} },`);
  }
  lines.push('];');
  lines.push('');
  lines.push(`export const AIRCRAFT: string[] = ${JSON.stringify(aircraftList)};`);
  lines.push('');
  lines.push('export const routesByAirport: Record<string, AirportRoute[]> = {');

  const sourceKeys = [...routeMap.keys()].sort();
  for (const source of sourceKeys) {
    const byDest = routeMap.get(source)!;
    const destKeys = [...byDest.keys()].sort();
    const legs: string[] = [];
    for (const dest of destKeys) {
      const byAirline = byDest.get(dest)!;
      const options = [...byAirline.entries()]
        .map(([code, aircraftSet]) => [
          airlineIndex.get(code)!,
          [...aircraftSet].map(n => aircraftIndex.get(n)!).sort((x, y) => x - y),
        ] as const)
        .sort((a, b) => a[0] - b[0]);
      const optStr = options.map(([ai, acs]) => `[${ai},[${acs.join(',')}]]`).join(',');
      legs.push(`["${dest}",[${optStr}]]`);
    }
    lines.push(`  "${source}": [${legs.join(',')}],`);
  }
  lines.push('};');
  lines.push('');
  lines.push('// Used when an airport has no route data (smaller fields, post-2014 airports)');
  lines.push('export const FALLBACK_AIRLINES: { name: string; code: string; aircraft: string[] }[] = [');
  lines.push('  { name: "American Airlines",  code: "AA", aircraft: ["Boeing 737-800", "Airbus A321neo", "Boeing 787-9"] },');
  lines.push('  { name: "Delta Air Lines",    code: "DL", aircraft: ["Airbus A220-300", "Boeing 737-800", "Boeing 767-300ER"] },');
  lines.push('  { name: "United Airlines",    code: "UA", aircraft: ["Boeing 737 MAX 8", "Boeing 737-800", "Boeing 787-9"] },');
  lines.push('  { name: "Southwest Airlines", code: "WN", aircraft: ["Boeing 737-800", "Boeing 737 MAX 8"] },');
  lines.push('  { name: "Emirates",           code: "EK", aircraft: ["Airbus A380-800", "Boeing 777-300ER"] },');
  lines.push('  { name: "Lufthansa",          code: "LH", aircraft: ["Airbus A320", "Airbus A321", "Boeing 747-8", "Airbus A350-900"] },');
  lines.push('  { name: "British Airways",    code: "BA", aircraft: ["Airbus A320", "Boeing 777-300ER", "Boeing 787-9"] },');
  lines.push('  { name: "Singapore Airlines", code: "SQ", aircraft: ["Airbus A350-900", "Airbus A380-800", "Boeing 787-10"] },');
  lines.push('  { name: "Qatar Airways",      code: "QR", aircraft: ["Airbus A350-900", "Boeing 777-300ER"] },');
  lines.push('  { name: "Air France",         code: "AF", aircraft: ["Airbus A320", "Airbus A330-200", "Boeing 777-300ER"] },');
  lines.push('];');
  lines.push('');

  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf-8');
  const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(0);
  console.log(`Written: ${OUT_FILE} (${kb} KB, ${airlineList.length} airlines, ${aircraftList.length} aircraft types)`);
  console.log('Done! Spot-check MAD→TLS (Iberia CRJ only), DXB→LHR (Emirates A380/777).');
}

main().catch(err => { console.error(err); process.exit(1); });
