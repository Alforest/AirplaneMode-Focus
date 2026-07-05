/**
 * buildAirports.ts
 *
 * Data generation script. Run with:
 *   npm run data:airports   (or: npx tsx scripts/buildAirports.ts)
 *
 * Requires Node 18+ (native fetch). Fetches the OurAirports dataset
 * (public domain, updated daily). If scripts/data/airports.csv exists,
 * it is read instead of fetching (offline/reproducible runs).
 *
 * Filter: 3-letter IATA code, scheduled airline service, type
 * large_airport or medium_airport.
 *
 * Output: src/data/airports.ts (commit this file)
 *
 * After regenerating airports, also rerun: npm run data:routes
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const LOCAL_CSV = path.join(ROOT, 'scripts/data/airports.csv');
const OUT_FILE = path.join(ROOT, 'src/data/airports.ts');

interface AirportEntry {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  size: 'large' | 'medium';
}

/** RFC 4180 CSV parser: quoted fields, "" escapes, commas/newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

/** Fallback city when municipality is empty: strip airport-type suffixes from the name. */
function cityFromName(name: string): string {
  const stripped = name.replace(/\s+(international\s+)?(airport|airfield|aerodrome|air\s+base)$/i, '').trim();
  return stripped || name;
}

const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

async function main() {
  let csvText: string;
  if (fs.existsSync(LOCAL_CSV)) {
    console.log(`Reading local ${LOCAL_CSV}`);
    csvText = fs.readFileSync(LOCAL_CSV, 'utf-8');
  } else {
    console.log(`Fetching ${CSV_URL}`);
    const res = await fetch(CSV_URL);
    if (!res.ok) {
      console.error(`Fetch failed: ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    csvText = await res.text();
  }

  const rows = parseCsv(csvText);
  const header = rows[0];
  const col = (name: string) => {
    const idx = header.indexOf(name);
    if (idx === -1) {
      console.error(`Column "${name}" not found in CSV header`);
      process.exit(1);
    }
    return idx;
  };
  const cType = col('type');
  const cName = col('name');
  const cLat = col('latitude_deg');
  const cLon = col('longitude_deg');
  const cCountry = col('iso_country');
  const cCity = col('municipality');
  const cScheduled = col('scheduled_service');
  const cIata = col('iata_code');

  const regionNames = new Intl.DisplayNames('en', { type: 'region' });
  const byIata = new Map<string, AirportEntry>();
  let collisions = 0;
  let cityFallbacks = 0;

  for (const row of rows.slice(1)) {
    const type = row[cType];
    if (type !== 'large_airport' && type !== 'medium_airport') continue;
    if (row[cScheduled] !== 'yes') continue;
    const iata = row[cIata];
    if (!/^[A-Z]{3}$/.test(iata)) continue;
    const lat = Number(row[cLat]);
    const lon = Number(row[cLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    let country: string;
    try {
      country = regionNames.of(row[cCountry]) ?? row[cCountry];
    } catch {
      country = row[cCountry];
    }
    if (!row[cCity]) cityFallbacks++;

    const entry: AirportEntry = {
      iata,
      name: row[cName],
      city: row[cCity] || cityFromName(row[cName]),
      country,
      lat: round4(lat),
      lon: round4(lon),
      size: type === 'large_airport' ? 'large' : 'medium',
    };

    const existing = byIata.get(iata);
    if (existing) {
      collisions++;
      console.warn(`IATA collision: ${iata} — "${existing.name}" vs "${entry.name}"`);
      if (existing.size === 'medium' && entry.size === 'large') byIata.set(iata, entry);
    } else {
      byIata.set(iata, entry);
    }
  }

  const entries = [...byIata.values()].sort((a, b) => a.iata.localeCompare(b.iata));
  const large = entries.filter(e => e.size === 'large').length;
  const medium = entries.length - large;

  console.log(`Airports: ${entries.length} (${large} large, ${medium} medium)`);
  console.log(`Collisions: ${collisions}, empty-municipality fallbacks: ${cityFallbacks}`);

  if (entries.length < 3000 || !['JFK', 'LHR', 'DXB'].every(c => byIata.has(c))) {
    console.error('Sanity check failed: expected >3000 airports including JFK, LHR, DXB — not writing output');
    process.exit(1);
  }

  const lines = entries.map(e =>
    `  { iata: ${JSON.stringify(e.iata)}, name: ${JSON.stringify(e.name)}, city: ${JSON.stringify(e.city)}, country: ${JSON.stringify(e.country)}, lat: ${e.lat}, lon: ${e.lon}, size: ${JSON.stringify(e.size)} },`
  );

  const out = `// AUTO-GENERATED by scripts/buildAirports.ts — do not edit manually
// Source: OurAirports (davidmegginson.github.io/ourairports-data), public domain
// Filter: 3-letter IATA code, scheduled_service=yes, type in (large_airport, medium_airport)
// ${entries.length} airports (${large} large, ${medium} medium)

export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  size: 'large' | 'medium';
}

export const airports: Airport[] = [
${lines.join('\n')}
];

const byIata: Record<string, Airport> = {};
for (const a of airports) byIata[a.iata] = a;

export function findAirportByIata(iata: string): Airport | undefined {
  return byIata[iata.toUpperCase()];
}
`;

  fs.writeFileSync(OUT_FILE, out);
  console.log(`Wrote ${OUT_FILE} (${(out.length / 1024).toFixed(0)} KB)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
