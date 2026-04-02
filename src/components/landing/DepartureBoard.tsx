import React, { useEffect, useRef, useState } from 'react';
import { Airport, findAirportByIata } from '../../data/airports';
import { findDestinations } from '../../utils/flightCalculations';
import { useFlightStore } from '../../store/flightStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const PRESETS = [
  { label: '30 MIN', minutes: 30 },
  { label: '1 HR',   minutes: 60 },
  { label: '2 HR',   minutes: 120 },
  { label: '4 HR',   minutes: 240 },
  { label: '8 HR',   minutes: 480 },
];

const POOL = [
  'JFK', 'LAX', 'LHR', 'CDG', 'DXB', 'NRT',
  'SYD', 'SIN', 'YYZ', 'AMS', 'FRA', 'ICN', 'HKG', 'GRU', 'MEX',
];

const AIRLINES = ['CA', 'ZA', 'CL', 'ST', 'CX', 'AT', 'KL', 'LH', 'SK', 'AM'];

function randFlight() {
  const al = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
  return `${al} ${Math.floor(Math.random() * 900) + 100}`;
}

// ---------------------------------------------------------------------------
// Row type + generation
// ---------------------------------------------------------------------------

interface Row {
  id: number;
  fromAirport: Airport;
  toAirport: Airport;
  from: string;   // city name, uppercase, truncated — display only
  to: string;
  duration: string;
  flight: string;
}

let _id = 0;

function makeRow(minutes: number): Row | null {
  const iata = POOL[Math.floor(Math.random() * POOL.length)];
  const hub = findAirportByIata(iata);
  if (!hub) return null;

  const dests = findDestinations(hub, minutes);
  if (!dests.length) return null;

  const dest = dests[Math.floor(Math.random() * dests.length)];
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return {
    id: _id++,
    fromAirport: hub,
    toAirport: dest,
    from: hub.city.toUpperCase().slice(0, 11),
    to:   dest.city.toUpperCase().slice(0, 11),
    duration: `${h}H ${String(m).padStart(2, '0')}M`,
    flight: randFlight(),
  };
}

function buildRows(minutes: number, count = 6): Row[] {
  const out: Row[] = [];
  let tries = 0;
  while (out.length < count && tries < 40) {
    const r = makeRow(minutes);
    if (r) out.push(r);
    tries++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// FlipChar — scrambles on char change OR external trigger (hover)
// ---------------------------------------------------------------------------

const FlipChar: React.FC<{ char: string; idx: number; trigger?: number }> = ({
  char, idx, trigger = 0,
}) => {
  const [shown, setShown] = useState(char);
  const prevChar = useRef(char);
  const t1 = useRef<ReturnType<typeof setTimeout>>();
  const t2 = useRef<ReturnType<typeof setInterval>>();

  const scrambleTo = (target: string) => {
    clearTimeout(t1.current);
    clearInterval(t2.current);
    let count = 0;
    const flips = 4 + Math.floor(Math.random() * 5);
    t1.current = setTimeout(() => {
      t2.current = setInterval(() => {
        if (count++ >= flips) {
          clearInterval(t2.current);
          setShown(target);
        } else {
          setShown(SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]);
        }
      }, 55);
    }, idx * 45);
  };

  // Char changed → scramble to new char
  useEffect(() => {
    if (prevChar.current === char) return;
    prevChar.current = char;
    scrambleTo(char);
    return () => { clearTimeout(t1.current); clearInterval(t2.current); };
  }, [char]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hover trigger → scramble then settle back to same char
  useEffect(() => {
    if (trigger === 0) return;
    scrambleTo(char);
    return () => { clearTimeout(t1.current); clearInterval(t2.current); };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  if (char === ' ') return <span style={{ display: 'inline-block', width: '0.6rem' }} />;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '1.2rem',
      height: '1.75rem',
      background: '#07090e',
      borderRadius: '2px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '0.8rem',
      fontWeight: 700,
      color: '#f2c84b',
      position: 'relative',
      flexShrink: 0,
      marginRight: '2px',
      userSelect: 'none',
    }}>
      {shown}
      <span style={{
        position: 'absolute',
        left: 0, right: 0, top: '50%',
        height: '1px',
        background: 'rgba(0,0,0,0.55)',
        pointerEvents: 'none',
      }} />
    </span>
  );
};

// ---------------------------------------------------------------------------
// FlipText
// ---------------------------------------------------------------------------

const FlipText: React.FC<{ text: string; trigger?: number }> = ({ text, trigger }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap' }}>
    {text.split('').map((ch, i) => (
      <FlipChar key={i} char={ch} idx={i} trigger={trigger} />
    ))}
  </span>
);

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
        {row.flight}
      </span>

      {/* FROM city */}
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <FlipText text={row.from} trigger={trigger} />
      </div>

      {/* TO city */}
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <FlipText text={row.to} trigger={trigger} />
      </div>

      {/* Duration */}
      <div style={{ width: '5rem', flexShrink: 0, overflow: 'hidden' }}>
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
            ↗ DEPART
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
    <span style={{ ...COL_LABEL, width: '5rem', flexShrink: 0 }}>Duration</span>
    <span style={{ ...COL_LABEL, width: '5.5rem', flexShrink: 0 }} className="hidden sm:block">Status</span>
  </div>
);

// ---------------------------------------------------------------------------
// DepartureBoard
// ---------------------------------------------------------------------------

const DepartureBoard: React.FC = () => {
  const { setDeparture, setGeneratedDestinations, setDuration, setPhase } = useFlightStore();

  const [minutes, setMinutes] = useState(120);
  const [rows, setRows] = useState<Row[]>(() => buildRows(120));
  const [colon, setColon] = useState(true);
  const [nowStr, setNowStr] = useState('');
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;

  useEffect(() => {
    setRows(buildRows(minutes));
  }, [minutes]);

  // Auto-cycle one row every 4s — both FROM and TO flip
  useEffect(() => {
    const id = setInterval(() => {
      const newRow = makeRow(minutesRef.current);
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
    // Get 3 destinations from this departure, putting the clicked one first
    const allDests = findDestinations(row.fromAirport, minutes);
    const others = allDests.filter(d => d.iata !== row.toAirport.iata);
    const ordered = [row.toAirport, ...others].slice(0, 3);

    setDeparture(row.fromAirport);
    setGeneratedDestinations(ordered);
    setDuration(minutes);
    setPhase('boarding');
  };

  return (
    <div style={{ background: '#06080f' }} className="py-14 px-4">
      <div style={{ maxWidth: 860 }} className="mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <span style={{ color: 'rgba(240,192,64,0.35)', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Departures
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(240,192,64,0.08)' }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.75rem', color: 'rgba(240,192,64,0.3)', opacity: colon ? 1 : 0.5, transition: 'opacity 0.1s' }}>
            {nowStr}
          </span>
        </div>

        {/* Duration chips */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p.minutes}
              onClick={() => setMinutes(p.minutes)}
              style={minutes === p.minutes ? {
                background: '#f0c040', color: '#0a0e1a', fontWeight: 700,
                border: '1px solid transparent',
              } : {
                background: 'transparent', color: 'rgba(208,216,232,0.35)',
                border: '1px solid rgba(240,192,64,0.12)',
              }}
              className="px-4 py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase transition-all duration-200 hover:border-gold/30"
            >
              {p.label}
            </button>
          ))}
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
          {minutes < 60
            ? `${minutes}m`
            : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
          } study duration · click any flight to depart
        </p>

      </div>
    </div>
  );
};

export default DepartureBoard;
