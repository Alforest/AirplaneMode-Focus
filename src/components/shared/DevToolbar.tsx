import React, { useState } from 'react';
import { useFlightStore } from '../../store/flightStore';

const SPEEDS = [
  { label: '1×',    value: 1 },
  { label: '10×',   value: 10 },
  { label: '60×',   value: 60 },
  { label: '300×',  value: 300 },
];

const DevToolbar: React.FC = () => {
  const { speedMultiplier, setSpeedMultiplier, phase, landFlight } = useFlightStore();
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
          background: '#1a1200', border: '1px solid rgba(240,192,64,0.4)',
          color: '#f0c040', borderRadius: 8, padding: '4px 10px',
          fontFamily: "'JetBrains Mono',monospace", fontSize: '0.65rem',
          letterSpacing: '0.1em', cursor: 'pointer',
        }}
      >
        DEV
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
      background: 'rgba(10,8,0,0.95)',
      border: '1px solid rgba(240,192,64,0.35)',
      borderRadius: 10, padding: '10px 12px',
      fontFamily: "'JetBrains Mono',monospace",
      backdropFilter: 'blur(12px)',
      minWidth: 200,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: '0.6rem', color: 'rgba(240,192,64,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          ⚡ Dev Tools
        </span>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', color: 'rgba(240,192,64,0.3)', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {/* Speed multiplier */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.6rem', color: 'rgba(208,216,232,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Flight Speed
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {SPEEDS.map(s => (
            <button
              key={s.value}
              onClick={() => setSpeedMultiplier(s.value)}
              style={{
                flex: 1,
                padding: '4px 0',
                borderRadius: 5,
                border: '1px solid',
                borderColor: speedMultiplier === s.value ? '#f0c040' : 'rgba(240,192,64,0.15)',
                background: speedMultiplier === s.value ? 'rgba(240,192,64,0.15)' : 'transparent',
                color: speedMultiplier === s.value ? '#f0c040' : 'rgba(240,192,64,0.4)',
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: '0.65rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Force land */}
      {phase === 'tracker' && (
        <button
          onClick={landFlight}
          style={{
            width: '100%',
            padding: '5px 0',
            borderRadius: 5,
            border: '1px solid rgba(240,192,64,0.2)',
            background: 'transparent',
            color: 'rgba(240,192,64,0.5)',
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(240,192,64,0.5)'; (e.target as HTMLButtonElement).style.color = '#f0c040'; }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(240,192,64,0.2)'; (e.target as HTMLButtonElement).style.color = 'rgba(240,192,64,0.5)'; }}
        >
          Force Land
        </button>
      )}
    </div>
  );
};

export default DevToolbar;
