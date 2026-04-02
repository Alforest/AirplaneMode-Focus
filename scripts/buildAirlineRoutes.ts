/**
 * buildAirlineRoutes.ts
 *
 * One-time data generation script. Run with:
 *   npx tsx scripts/buildAirlineRoutes.ts
 *
 * Prerequisites — place these files in scripts/data/ (never commit them):
 *   scripts/data/routes.dat   from https://github.com/jpatokal/openflights/blob/master/data/routes.dat
 *   scripts/data/airlines.dat from https://github.com/jpatokal/openflights/blob/master/data/airlines.dat
 *
 * Output: src/data/airlineRoutes.ts (commit this file)
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
    if (iata && iata !== '\\N' && iata.length === 2 && active === 'Y') {
      airlineNames.set(iata, name);
    }
  }
  console.log(`Loaded ${airlineNames.size} active airlines`);

  // Parse routes.dat
  // Format: Airline,AirlineID,SourceAirport,SourceAirportID,DestAirport,DestAirportID,Codeshare,Stops,Equipment
  // routeMap: sourceAirport → airlineCode → Set<displayName>
  const routeMap = new Map<string, Map<string, Set<string>>>();
  const routeLines = await readLines(ROUTES_DAT);
  let skipped = 0;
  let processed = 0;

  for (const line of routeLines) {
    const parts = line.split(',');
    if (parts.length < 9) continue;

    const airlineCode  = parts[0].trim();
    const sourceAirport = parts[2].trim();
    const codeshare    = parts[6].trim();
    const equipmentStr = parts[8].trim();

    // Skip invalid or codeshare routes
    if (airlineCode === '\\N' || sourceAirport === '\\N') { skipped++; continue; }
    if (codeshare === 'Y') { skipped++; continue; }
    if (!airlineNames.has(airlineCode)) { skipped++; continue; }
    if (!knownAirports.has(sourceAirport)) { skipped++; continue; }

    const equipCodes = equipmentStr.split(' ').filter(Boolean);
    const aircraftNames: string[] = [];
    for (const code of equipCodes) {
      const name = EQUIPMENT_MAP[code];
      if (name) aircraftNames.push(name);
    }
    if (aircraftNames.length === 0) { skipped++; continue; }

    if (!routeMap.has(sourceAirport)) routeMap.set(sourceAirport, new Map());
    const byAirline = routeMap.get(sourceAirport)!;
    if (!byAirline.has(airlineCode)) byAirline.set(airlineCode, new Set());
    const aircraftSet = byAirline.get(airlineCode)!;
    for (const name of aircraftNames) aircraftSet.add(name);
    processed++;
  }

  console.log(`Routes processed: ${processed}, skipped: ${skipped}`);
  console.log(`Airports with data: ${routeMap.size}`);

  // Build output structure
  const output: Record<string, Array<{ name: string; code: string; aircraft: string[] }>> = {};
  for (const [airportIata, byAirline] of routeMap) {
    const entries: Array<{ name: string; code: string; aircraft: string[] }> = [];
    for (const [airlineCode, aircraftSet] of byAirline) {
      entries.push({
        name: airlineNames.get(airlineCode)!,
        code: airlineCode,
        aircraft: [...aircraftSet].sort(),
      });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    output[airportIata] = entries;
  }

  // Serialize
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED by scripts/buildAirlineRoutes.ts — do not edit manually');
  lines.push('// Source: OpenFlights routes.dat + airlines.dat (github.com/jpatokal/openflights)');
  lines.push('');
  lines.push('export interface AirlineEntry {');
  lines.push('  name: string;');
  lines.push('  code: string;');
  lines.push('  aircraft: string[];');
  lines.push('}');
  lines.push('');
  lines.push('export const airlinesByAirport: Record<string, AirlineEntry[]> = {');

  const airportKeys = Object.keys(output).sort();
  for (const iata of airportKeys) {
    lines.push(`  "${iata}": [`);
    for (const entry of output[iata]) {
      const aircraftJson = JSON.stringify(entry.aircraft);
      lines.push(`    { name: ${JSON.stringify(entry.name)}, code: ${JSON.stringify(entry.code)}, aircraft: ${aircraftJson} },`);
    }
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');
  lines.push('export const FALLBACK_AIRLINES: AirlineEntry[] = [');
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
  console.log(`Written: ${OUT_FILE}`);
  console.log('Done! Spot-check PIT (no EK), DXB (EK with A380/777), JFK (many carriers).');
}

main().catch(err => { console.error(err); process.exit(1); });
