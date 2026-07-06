import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import { getFlightsFrom, BoardFlight } from '../../utils/departureBoard';
import FlipText, { PagedFlipText } from '../shared/FlipText';
import { useIsPhone, useMediaQuery } from '../../hooks/useMediaQuery';

const FILTERS = [
  { label: 'ALL',    min: 0,   max: Infinity },
  { label: '< 1 HR', min: 0,   max: 60 },
  { label: '1–2 HR', min: 60,  max: 120 },
  { label: '2–4 HR', min: 120, max: 240 },
  { label: '4 HR +', min: 240, max: Infinity },
];

// "Sydney (Mascot)" / "Darlington, County Durham" → "SYDNEY" / "DARLINGTON"
function boardCity(city: string): string {
  return city.split(/[,(]/)[0].trim().toUpperCase();
}

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}H ${String(m).padStart(2, '0')}M`;
}

const COL_LABEL: React.CSSProperties = {
  color: 'rgba(208,216,232,0.22)',
  fontFamily: "'JetBrains Mono',monospace",
  fontSize: '0.68rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
};

interface RowProps {
  flight: BoardFlight;
  isLast: boolean;
  isPhone: boolean;
  isTiny: boolean;
  onSelect: (flight: BoardFlight) => void;
}

const FlightRow: React.FC<RowProps> = ({ flight, isLast, isPhone, isTiny, onSelect }) => {
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
      onClick={() => onSelect(flight)}
      onKeyDown={e => e.key === 'Enter' && onSelect(flight)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isTiny ? '0.5rem' : isPhone ? '0.75rem' : '1rem',
        padding: isTiny ? '0.8rem 0.6rem' : isPhone ? '0.8rem 0.85rem' : '0.7rem 1.25rem',
        borderBottom: isLast ? 'none' : '1px solid rgba(240,192,64,0.05)',
        cursor: 'pointer',
        background: hovered ? 'rgba(240,192,64,0.05)' : 'transparent',
        transition: 'background 0.15s ease',
        outline: 'none',
      }}
    >
      {/* Flight code — desktop only; destination + duration is what matters on a phone */}
      {!isPhone && (
        <span style={{
          width: '5rem',
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: '0.75rem',
          color: hovered ? 'rgba(240,192,64,0.6)' : 'rgba(208,216,232,0.3)',
          flexShrink: 0,
          transition: 'color 0.15s ease',
        }}>
          {flight.flightNumber}
        </span>
      )}

      {/* Destination city */}
      <div style={{ flex: 1.2, overflow: 'hidden', minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <PagedFlipText
          text={boardCity(flight.destination.city)}
          width={isTiny ? 7 : isPhone ? 9 : 11}
          trigger={trigger}
          small={isPhone}
        />
        <span style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: '0.68rem',
          color: 'rgba(240,192,64,0.35)',
          flexShrink: 0,
        }}>
          {flight.destination.iata}
        </span>
      </div>

      {/* Airline */}
      <span className="hidden md:block" style={{
        flex: 1,
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '0.72rem',
        color: 'rgba(208,216,232,0.4)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {flight.airline}
      </span>

      {/* Aircraft */}
      <span className="hidden lg:block" style={{
        width: '9rem',
        flexShrink: 0,
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '0.7rem',
        color: 'rgba(208,216,232,0.25)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {flight.aircraft}
      </span>

      {/* Duration */}
      <div style={{ width: isPhone ? '8rem' : '8.5rem', flexShrink: 0, overflow: 'hidden' }}>
        <FlipText text={fmtDuration(flight.durationMinutes)} trigger={trigger} small={isPhone} />
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

const DeparturesBoard: React.FC = () => {
  const { departure, selectFlight, setPhase } = useFlightStore();
  const isPhone = useIsPhone();
  const isTiny = useMediaQuery('(max-width: 359px)');

  const [filterIdx, setFilterIdx] = useState(0);
  const [colon, setColon] = useState(true);
  const [nowStr, setNowStr] = useState('');

  // Build the board once per departure — random carrier picks stay stable
  const flights = useMemo(
    () => (departure ? getFlightsFrom(departure) : []),
    [departure]
  );

  const visible = useMemo(() => {
    const f = FILTERS[filterIdx];
    return flights.filter(fl => fl.durationMinutes >= f.min && fl.durationMinutes < f.max);
  }, [flights, filterIdx]);

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

  if (!departure) return null;

  return (
    <div style={{ background: '#06080f' }} className="min-h-screen py-7 sm:py-14 px-3 sm:px-4">
      <div style={{ maxWidth: 960 }} className="mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => setPhase('landing')}
            className="text-muted-white/30 hover:text-muted-white/60 font-mono text-sm tracking-wider transition-colors py-2 -my-2"
          >
            ← Back
          </button>
          <div className="flex-1 h-px" style={{ background: 'rgba(240,192,64,0.08)' }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.75rem', color: 'rgba(240,192,64,0.3)', opacity: colon ? 1 : 0.5, transition: 'opacity 0.1s' }}>
            {nowStr}
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span style={{ color: 'rgba(240,192,64,0.35)', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Departures
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-muted-white mt-1">
            <span className="text-gold font-mono">{departure.iata}</span>{' '}
            {departure.city}
          </h2>
          <p className="text-muted-white/30 font-sans text-sm mt-1">
            {flights.length} flights · pick one — its duration is your study session
          </p>
        </motion.div>

        {/* Duration filter chips */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {FILTERS.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setFilterIdx(i)}
              style={filterIdx === i ? {
                background: '#f0c040', color: '#0a0e1a', fontWeight: 700,
                border: '1px solid transparent',
              } : {
                background: 'transparent', color: 'rgba(208,216,232,0.35)',
                border: '1px solid rgba(240,192,64,0.12)',
              }}
              className="px-3.5 sm:px-4 py-2 sm:py-1.5 rounded-lg font-mono text-xs tracking-widest uppercase transition-all duration-200 hover:border-gold/30"
            >
              {f.label}
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
          {/* Column headers */}
          <div style={{
            background: '#080b14',
            borderBottom: '1px solid rgba(240,192,64,0.08)',
            padding: isTiny ? '0.5rem 0.6rem' : isPhone ? '0.5rem 0.85rem' : '0.5rem 1.25rem',
            display: 'flex',
            gap: isTiny ? '0.5rem' : isPhone ? '0.75rem' : '1rem',
            alignItems: 'center',
          }}>
            {!isPhone && <span style={{ ...COL_LABEL, width: '5rem', flexShrink: 0 }}>Flight</span>}
            <span style={{ ...COL_LABEL, flex: 1.2 }}>Destination</span>
            <span style={{ ...COL_LABEL, flex: 1 }} className="hidden md:block">Airline</span>
            <span style={{ ...COL_LABEL, width: '9rem', flexShrink: 0 }} className="hidden lg:block">Aircraft</span>
            <span style={{ ...COL_LABEL, width: isPhone ? '8rem' : '8.5rem', flexShrink: 0 }}>Duration</span>
            <span style={{ ...COL_LABEL, width: '5.5rem', flexShrink: 0 }} className="hidden sm:block">Status</span>
          </div>

          {/* Scrollable rows */}
          <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
            {visible.length === 0 ? (
              <p className="text-center py-10 font-mono text-xs tracking-widest uppercase" style={{ color: 'rgba(208,216,232,0.25)' }}>
                No flights in this duration range
              </p>
            ) : (
              visible.map((flight, i) => (
                <FlightRow
                  key={`${flight.destination.iata}-${flight.flightNumber}`}
                  flight={flight}
                  isLast={i === visible.length - 1}
                  isPhone={isPhone}
                  isTiny={isTiny}
                  onSelect={f => selectFlight(departure, f)}
                />
              ))
            )}
          </div>
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
          sorted by flight duration · click any flight to board
        </p>

      </div>
    </div>
  );
};

export default DeparturesBoard;
