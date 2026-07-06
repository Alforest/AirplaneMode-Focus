import React, { useEffect, useState } from 'react';
import { Airport } from '../../data/airports';
import { BoardFlight, randomFlightFrom } from '../../utils/departureBoard';
import { useFlightStore } from '../../store/flightStore';
import { PagedFlipText } from '../shared/FlipText';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POOL = [
  'JFK', 'LAX', 'LHR', 'CDG', 'DXB', 'NRT',
  'SYD', 'SIN', 'YYZ', 'AMS', 'FRA', 'ICN', 'HKG', 'GRU', 'MEX',
];

const CITY_WIDTH = 9; // flip cells per city column in the compact board

// ---------------------------------------------------------------------------
// Row type + generation — real flights from a random hub
// ---------------------------------------------------------------------------

interface Row {
  id: number;
  fromAirport: Airport;
  flight: BoardFlight;
  from: string;   // city name, uppercase — display only
  to: string;
  duration: string;
  flightCode: string;
}

let _id = 0;

// "Sydney (Mascot)" / "Darlington, County Durham" → "SYDNEY" / "DARLINGTON"
function boardCity(city: string): string {
  return city.split(/[,(]/)[0].trim().toUpperCase();
}

function makeRow(): Row | null {
  const iata = POOL[Math.floor(Math.random() * POOL.length)];
  const result = randomFlightFrom(iata);
  if (!result) return null;

  const { departure, flight } = result;
  const h = Math.floor(flight.durationMinutes / 60);
  const m = flight.durationMinutes % 60;

  return {
    id: _id++,
    fromAirport: departure,
    flight,
    from: boardCity(departure.city),
    to:   boardCity(flight.destination.city),
    duration: `${h}H ${String(m).padStart(2, '0')}M`,
    flightCode: flight.flightNumber,
  };
}

function buildRows(count = 6): Row[] {
  const out: Row[] = [];
  let tries = 0;
  while (out.length < count && tries < 40) {
    const r = makeRow();
    if (r) out.push(r);
    tries++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// BoardRow — compact: code · FROM → TO · duration
// ---------------------------------------------------------------------------

interface BoardRowProps {
  row: Row;
  isLast: boolean;
  onSelect: (row: Row) => void;
}

const BoardRow: React.FC<BoardRowProps> = ({ row, isLast, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const [trigger, setTrigger] = useState(0);

  const handleEnter = () => {
    setHovered(true);
    setTrigger(t => t + 1);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(row)}
      onKeyDown={e => e.key === 'Enter' && onSelect(row)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.65rem 1rem',
        borderBottom: isLast ? 'none' : '1px solid rgba(240,192,64,0.05)',
        cursor: 'pointer',
        background: hovered ? 'rgba(240,192,64,0.05)' : 'transparent',
        transition: 'background 0.15s ease',
        outline: 'none',
      }}
    >
      {/* Flight code */}
      <span className="hidden sm:block" style={{
        width: '3.6rem',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '0.68rem',
        color: hovered ? 'rgba(240,192,64,0.6)' : 'rgba(208,216,232,0.3)',
        flexShrink: 0,
        transition: 'color 0.15s ease',
      }}>
        {row.flightCode}
      </span>

      {/* FROM city — destination + duration is the essential info on mobile */}
      <div className="hidden sm:block" style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <PagedFlipText text={row.from} width={CITY_WIDTH} trigger={trigger} small />
      </div>

      {/* Arrow */}
      <span className="hidden sm:inline" style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '0.75rem',
        color: hovered ? '#f0c040' : 'rgba(240,192,64,0.3)',
        flexShrink: 0,
        transition: 'color 0.15s ease',
      }}>
        →
      </span>

      {/* TO city */}
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <PagedFlipText text={row.to} width={CITY_WIDTH} trigger={trigger} small />
      </div>

      {/* Duration / CTA */}
      <span style={{
        width: '4.2rem',
        flexShrink: 0,
        textAlign: 'right',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '0.7rem',
        letterSpacing: '0.04em',
        color: hovered ? '#f0c040' : 'rgba(240,192,64,0.55)',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s ease',
      }}>
        {hovered ? '↗ BOARD' : row.duration}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// DepartureBoard — compact live "now boarding worldwide" panel, embedded in
// the hero's right column. Every row is a real route; clicking one boards it.
// ---------------------------------------------------------------------------

const DepartureBoard: React.FC = () => {
  const { selectFlight } = useFlightStore();

  const [rows, setRows] = useState<Row[]>(() => buildRows());
  const [pulse, setPulse] = useState(true);

  // Auto-cycle one row every 4s — both FROM and TO flip
  useEffect(() => {
    const id = setInterval(() => {
      const newRow = makeRow();
      if (!newRow) return;
      setRows(prev => {
        const next = [...prev];
        next[Math.floor(Math.random() * next.length)] = newRow;
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // LIVE dot pulse
  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSelect = (row: Row) => {
    selectFlight(row.fromAirport, row.flight, 'landing_board');
  };

  return (
    <div style={{
      background: '#030508',
      border: '1px solid rgba(240,192,64,0.12)',
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
    }}>
      {/* Title bar */}
      <div style={{
        background: '#080b14',
        borderBottom: '1px solid rgba(240,192,64,0.08)',
        padding: '0.55rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#4ade80',
          boxShadow: '0 0 5px rgba(74,222,128,0.7)',
          opacity: pulse ? 1 : 0.35,
          transition: 'opacity 0.4s ease',
          flexShrink: 0,
        }} />
        <span style={{
          color: 'rgba(240,192,64,0.4)',
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: '0.65rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          Now boarding worldwide
        </span>
      </div>

      {rows.map((row, i) => (
        <BoardRow
          key={row.id}
          row={row}
          isLast={i === rows.length - 1}
          onSelect={handleSelect}
        />
      ))}

      {/* Footer hint */}
      <div style={{
        borderTop: '1px solid rgba(240,192,64,0.05)',
        padding: '0.45rem 1rem',
        textAlign: 'center',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '0.6rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'rgba(208,216,232,0.18)',
      }}>
        real routes · click any flight to board it
      </div>
    </div>
  );
};

export default DepartureBoard;
