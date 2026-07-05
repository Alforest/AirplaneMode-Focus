import React, { useEffect, useState } from 'react';
import { Airport } from '../../data/airports';
import { BoardFlight, randomFlightFrom } from '../../utils/departureBoard';
import { useFlightStore } from '../../store/flightStore';
import FlipText, { PagedFlipText } from '../shared/FlipText';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POOL = [
  'JFK', 'LAX', 'LHR', 'CDG', 'DXB', 'NRT',
  'SYD', 'SIN', 'YYZ', 'AMS', 'FRA', 'ICN', 'HKG', 'GRU', 'MEX',
];

// ---------------------------------------------------------------------------
// Row type + generation — real flights from a random hub
// ---------------------------------------------------------------------------

interface Row {
  id: number;
  fromAirport: Airport;
  flight: BoardFlight;
  from: string;   // city name, uppercase, truncated — display only
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
// BoardRow — has its own hover state so trigger works per-row
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
        gap: '1rem',
        padding: '0.7rem 1.25rem',
        borderBottom: isLast ? 'none' : '1px solid rgba(240,192,64,0.05)',
        cursor: 'pointer',
        background: hovered ? 'rgba(240,192,64,0.05)' : 'transparent',
        transition: 'background 0.15s ease',
        outline: 'none',
      }}
    >
      {/* Flight code */}
      <span style={{
        width: '4.5rem',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '0.75rem',
        color: hovered ? 'rgba(240,192,64,0.6)' : 'rgba(208,216,232,0.3)',
        flexShrink: 0,
        transition: 'color 0.15s ease',
      }}>
        {row.flightCode}
      </span>

      {/* FROM city */}
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <PagedFlipText text={row.from} trigger={trigger} />
      </div>

      {/* TO city */}
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <PagedFlipText text={row.to} trigger={trigger} />
      </div>

      {/* Duration */}
      <div style={{ width: '8.5rem', flexShrink: 0, overflow: 'hidden' }}>
        <FlipText text={row.duration} trigger={trigger} />
      </div>

      {/* Status / CTA */}
      <div className="hidden sm:flex" style={{ width: '5.5rem', flexShrink: 0, alignItems: 'center', gap: '0.4rem' }}>
        {hovered ? (
          <span style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: '0.68rem',
            color: '#f0c040',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}>
            ↗ BOARD
          </span>
        ) : (
          <>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 5px rgba(74,222,128,0.7)',
              flexShrink: 0,
              display: 'inline-block',
            }} />
            <span style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: '0.7rem',
              color: '#4ade80',
              letterSpacing: '0.05em',
            }}>ON TIME</span>
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Column header
// ---------------------------------------------------------------------------

const COL_LABEL: React.CSSProperties = {
  color: 'rgba(208,216,232,0.22)',
  fontFamily: "'JetBrains Mono',monospace",
  fontSize: '0.68rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

const BoardHeader: React.FC = () => (
  <div style={{
    background: '#080b14',
    borderBottom: '1px solid rgba(240,192,64,0.08)',
    padding: '0.5rem 1.25rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  }}>
    <span style={{ ...COL_LABEL, width: '4.5rem', flexShrink: 0 }}>Flight</span>
    <span style={{ ...COL_LABEL, flex: 1 }}>From</span>
    <span style={{ ...COL_LABEL, flex: 1 }}>Destination</span>
    <span style={{ ...COL_LABEL, width: '8.5rem', flexShrink: 0 }}>Duration</span>
    <span style={{ ...COL_LABEL, width: '5.5rem', flexShrink: 0 }} className="hidden sm:block">Status</span>
  </div>
);

// ---------------------------------------------------------------------------
// DepartureBoard — ambient "now boarding worldwide" board on the landing page.
// Every row is a real route; clicking one boards that flight directly.
// ---------------------------------------------------------------------------

const DepartureBoard: React.FC = () => {
  const { selectFlight } = useFlightStore();

  const [rows, setRows] = useState<Row[]>(() => buildRows());
  const [colon, setColon] = useState(true);
  const [nowStr, setNowStr] = useState('');

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

  // Blinking clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setColon(c => !c);
      setNowStr(
        d.getHours().toString().padStart(2, '0') + ':' +
        d.getMinutes().toString().padStart(2, '0')
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSelect = (row: Row) => {
    selectFlight(row.fromAirport, row.flight);
  };

  return (
    <div style={{ background: '#06080f' }} className="py-14 px-4">
      <div style={{ maxWidth: 860 }} className="mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <span style={{ color: 'rgba(240,192,64,0.35)', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Now boarding worldwide
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(240,192,64,0.08)' }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.75rem', color: 'rgba(240,192,64,0.3)', opacity: colon ? 1 : 0.5, transition: 'opacity 0.1s' }}>
            {nowStr}
          </span>
        </div>

        {/* Board */}
        <div style={{
          background: '#030508',
          border: '1px solid rgba(240,192,64,0.1)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <BoardHeader />
          {rows.map((row, i) => (
            <BoardRow
              key={row.id}
              row={row}
              isLast={i === rows.length - 1}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Footer */}
        <p style={{
          marginTop: '0.875rem',
          textAlign: 'center',
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(208,216,232,0.12)',
        }}>
          real routes from major hubs · click any flight to board
        </p>

      </div>
    </div>
  );
};

export default DepartureBoard;
