export type AircraftTier = 'regional' | 'narrowbody' | 'widebody';

export const AIRCRAFT_TIER: Record<string, AircraftTier> = {
  // Regional jets & turboprops
  'ATR 42':       'regional',
  'ATR 72':       'regional',
  'CRJ-200':      'regional',
  'CRJ-700':      'regional',
  'CRJ-900':      'regional',
  'Dash 8 Q400':  'regional',
  'Embraer E170': 'regional',
  'Embraer E175': 'regional',
  'Embraer E190': 'regional',
  'Embraer E195': 'regional',

  // Narrowbodies (short to medium-haul)
  'Airbus A220-100':  'narrowbody',
  'Airbus A220-300':  'narrowbody',
  'Airbus A319':      'narrowbody',
  'Airbus A320':      'narrowbody',
  'Airbus A321':      'narrowbody',
  'Airbus A321neo':   'narrowbody',
  'Boeing 737-500':   'narrowbody',
  'Boeing 737-700':   'narrowbody',
  'Boeing 737-800':   'narrowbody',
  'Boeing 737-900':   'narrowbody',
  'Boeing 737 MAX 8': 'narrowbody',
  'Boeing 737 MAX 9': 'narrowbody',

  // Widebodies (medium to long-haul)
  'Airbus A330-200':    'widebody',
  'Airbus A330-300':    'widebody',
  'Airbus A330-900neo': 'widebody',
  'Airbus A340-300':    'widebody',
  'Airbus A340-600':    'widebody',
  'Airbus A350-900':    'widebody',
  'Airbus A350-1000':   'widebody',
  'Airbus A380-800':    'widebody',
  'Boeing 747-400':     'widebody',
  'Boeing 747-8':       'widebody',
  'Boeing 767-300ER':   'widebody',
  'Boeing 777-200':     'widebody',
  'Boeing 777-300':     'widebody',
  'Boeing 777-300ER':   'widebody',
  'Boeing 777-200LR':   'widebody',
  'Boeing 787-8':       'widebody',
  'Boeing 787-9':       'widebody',
  'Boeing 787-10':      'widebody',
};
