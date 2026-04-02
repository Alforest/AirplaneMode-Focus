import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { motion } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import { greatCircleArc, haversineKm } from '../../utils/flightCalculations';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

const STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
} as const;

type MapStyle = keyof typeof STYLES;

function addLayers(map: mapboxgl.Map, arc: [number, number][], currentIdx: number, style: MapStyle = 'dark') {
  const sat = style === 'satellite';

  map.addSource('full-arc', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: arc },
      properties: {},
    },
  });
  map.addLayer({
    id: 'full-arc-layer',
    type: 'line',
    source: 'full-arc',
    paint: {
      'line-color': sat ? '#ffffff' : '#f0c040',
      'line-width': sat ? 2.5 : 1.5,
      'line-opacity': sat ? 0.6 : 0.25,
      'line-dasharray': [4, 4],
    },
  });

  map.addSource('traveled-arc', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: arc.slice(0, Math.max(currentIdx + 1, 1)),
      },
      properties: {},
    },
  });
  map.addLayer({
    id: 'traveled-arc-layer',
    type: 'line',
    source: 'traveled-arc',
    paint: {
      'line-color': '#f0c040',
      'line-width': sat ? 4 : 2.5,
      'line-opacity': sat ? 1 : 0.85,
    },
  });
}

function makeAirportMarkerEl(iata: string, color: string) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #0a0e1a;box-shadow:0 0 8px ${color}99"></div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${color};font-weight:700;text-shadow:0 1px 4px #000;white-space:nowrap">${iata}</div>
    </div>
  `;
  return el;
}

function makePlaneEl() {
  const el = document.createElement('div');
  el.className = 'plane-marker';
  el.innerHTML = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="#f0c040" style="filter:drop-shadow(0 0 6px rgba(240,192,64,0.8));transition:transform 0.3s linear">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>
  `;
  return el;
}

interface MapViewProps {
  targetZoom?: number;
}

const MapView: React.FC<MapViewProps> = ({ targetZoom }) => {
  const { departure, destination } = useFlightStore();
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const arcPointsRef = useRef<[number, number][]>([]);
  const initializedRef = useRef(false);
  const styleRef = useRef<MapStyle>('dark');
  const hasZoomedInRef = useRef(false);
  const rafRef = useRef<number>(0);
  const lastCameraPanRef = useRef(0);
  const targetZoomRef = useRef<number>(targetZoom ?? 7);

  // Keep targetZoomRef in sync and apply immediately if map is ready
  useEffect(() => {
    targetZoomRef.current = targetZoom ?? 7;
    const map = mapRef.current;
    if (!map || !hasZoomedInRef.current) return;
    map.easeTo({ zoom: targetZoom ?? 7, duration: 600 });
  }, [targetZoom]);

  // Main map init + rAF animation loop
  useEffect(() => {
    if (!departure || !destination) return;
    if (initializedRef.current) return;
    if (!mapContainerRef.current) return;
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'pk.your_token_here') return;

    initializedRef.current = true;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const arc = greatCircleArc(
      departure.lat, departure.lon,
      destination.lat, destination.lon,
      200  // more points = smoother interpolation
    );
    arcPointsRef.current = arc;

    const midIdx = Math.floor(arc.length / 2);

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: STYLES.dark,
      center: arc[midIdx],
      zoom: 2,
      pitch: 0,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on('load', () => {
      addLayers(map, arc, 0);

      originMarkerRef.current = new mapboxgl.Marker({ element: makeAirportMarkerEl(departure.iata, '#f0c040') })
        .setLngLat([departure.lon, departure.lat])
        .addTo(map);

      destMarkerRef.current = new mapboxgl.Marker({ element: makeAirportMarkerEl(destination.iata, '#e8a020') })
        .setLngLat([destination.lon, destination.lat])
        .addTo(map);

      markerRef.current = new mapboxgl.Marker({ element: makePlaneEl(), anchor: 'center' })
        .setLngLat(arc[0])
        .addTo(map);

      // Fit full route overview
      const lons = arc.map(p => p[0]);
      const lats = arc.map(p => p[1]);
      map.fitBounds(
        [[Math.min(...lons) - 3, Math.min(...lats) - 3], [Math.max(...lons) + 3, Math.max(...lats) + 3]],
        { padding: 60, duration: 1800 }
      );

      // After overview, zoom in and start the animation loop
      setTimeout(() => {
        hasZoomedInRef.current = true;

        // Get current position from store at this moment
        const store = useFlightStore.getState();
        const { startTime, durationMinutes } = store;
        const totalMs = durationMinutes * 60 * 1000;
        const progress = startTime ? Math.min((Date.now() - startTime) / totalMs, 1) : 0;
        const startIdx = Math.min(Math.floor(progress * (arc.length - 1)), arc.length - 1);

        map.easeTo({
          center: arc[startIdx] as [number, number],
          zoom: targetZoomRef.current,
          duration: 2000,
        });

        // Start rAF loop — reads store directly, never triggers React renders
        const tick = () => {
          const { startTime: st, durationMinutes: dur, phase, speedMultiplier } = useFlightStore.getState();
          if (phase !== 'tracker' || !st) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          const p = Math.min(((Date.now() - st) * speedMultiplier) / (dur * 60 * 1000), 1);

          // Interpolate smoothly between arc points so position is continuous
          const rawIdx = p * (arc.length - 1);
          const idxLow = Math.min(Math.floor(rawIdx), arc.length - 2);
          const idxHigh = idxLow + 1;
          const frac = rawIdx - idxLow;

          const lo = arc[idxLow];
          const hi = arc[idxHigh];
          const pos: [number, number] = [
            lo[0] + (hi[0] - lo[0]) * frac,
            lo[1] + (hi[1] - lo[1]) * frac,
          ];

          // Update plane marker position
          if (markerRef.current) {
            markerRef.current.setLngLat(pos);

            // Rotate plane to face direction of travel
            const rotation = Math.atan2(hi[0] - lo[0], hi[1] - lo[1]) * (180 / Math.PI);
            const svg = markerRef.current.getElement().querySelector('svg') as SVGElement | null;
            if (svg) svg.style.transform = `rotate(${rotation}deg)`;
          }

          // Update traveled-arc path (throttled to ~10fps — no need for 60fps GeoJSON updates)
          const now = Date.now();
          if (now - lastCameraPanRef.current > 100) {
            if (map.getSource('traveled-arc')) {
              (map.getSource('traveled-arc') as mapboxgl.GeoJSONSource).setData({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  // include interpolated current position as final point
                  coordinates: [...arc.slice(0, idxHigh), pos],
                },
                properties: {},
              });
            }
          }

          // Camera pan — only every 4 seconds to avoid interrupting easeTo
          if (now - lastCameraPanRef.current > 4000) {
            lastCameraPanRef.current = now;
            map.easeTo({
              center: pos,
              zoom: targetZoomRef.current,
              duration: 4500,
              easing: (t) => t,
            });
          }

          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      }, 2800);
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
      initializedRef.current = false;
      hasZoomedInRef.current = false;
    };
  }, [departure, destination]);

  // Style switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !departure || !destination) return;
    if (styleRef.current === mapStyle) return;
    styleRef.current = mapStyle;

    const arc = arcPointsRef.current;
    const { startTime, durationMinutes } = useFlightStore.getState();
    const totalMs = durationMinutes * 60 * 1000;
    const progress = startTime ? Math.min((Date.now() - startTime) / totalMs, 1) : 0;
    const currentIdx = Math.min(Math.floor(progress * (arc.length - 1)), arc.length - 1);

    map.setStyle(STYLES[mapStyle]);

    map.once('style.load', () => {
      addLayers(map, arc, currentIdx, mapStyle);

      originMarkerRef.current?.remove();
      destMarkerRef.current?.remove();
      markerRef.current?.remove();

      originMarkerRef.current = new mapboxgl.Marker({ element: makeAirportMarkerEl(departure.iata, '#f0c040') })
        .setLngLat([departure.lon, departure.lat])
        .addTo(map);

      destMarkerRef.current = new mapboxgl.Marker({ element: makeAirportMarkerEl(destination.iata, '#e8a020') })
        .setLngLat([destination.lon, destination.lat])
        .addTo(map);

      markerRef.current = new mapboxgl.Marker({ element: makePlaneEl(), anchor: 'center' })
        .setLngLat(arc[currentIdx] as [number, number])
        .addTo(map);
    });
  }, [mapStyle, departure, destination]);

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'pk.your_token_here') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-midnight/80 rounded-2xl">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">🗺️</div>
          <p className="font-mono text-gold/80 text-sm mb-2">Mapbox token required</p>
          <p className="font-sans text-muted-white/40 text-xs max-w-xs">
            Add your <code className="text-gold/60">VITE_MAPBOX_ACCESS_TOKEN</code> to a{' '}
            <code className="text-gold/60">.env</code> file in the project root.
          </p>
          {departure && destination && (
            <div className="mt-6 font-mono text-muted-white/50 text-sm">
              <p>{departure.iata} → {destination.iata}</p>
              <p className="text-muted-white/30 text-xs mt-1">
                ~{Math.round(haversineKm(departure.lat, departure.lon, destination.lat, destination.lon)).toLocaleString()} km
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-2xl overflow-hidden"
        style={{ minHeight: 300 }}
      />

      {/* Style toggle */}
      <div className="absolute top-3 right-3 z-10">
        <motion.button
          onClick={() => setMapStyle(s => s === 'dark' ? 'satellite' : 'dark')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs tracking-widest uppercase backdrop-blur-sm transition-all duration-200 ${
            mapStyle === 'satellite'
              ? 'bg-gold/30 text-gold border border-gold/50'
              : 'bg-black/50 text-muted-white/70 border border-white/10 hover:border-gold/30 hover:text-gold'
          }`}
        >
          {mapStyle === 'satellite' ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          )}
          {mapStyle === 'satellite' ? 'Dark' : 'Satellite'}
        </motion.button>
      </div>
    </div>
  );
};

export default MapView;
