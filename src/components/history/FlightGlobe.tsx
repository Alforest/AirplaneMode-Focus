import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { CompletedFlight } from '../../types/history';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string;

function buildArcGeoJSON(flights: CompletedFlight[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: flights.map(f => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [f.departure.lon, f.departure.lat],
          [f.destination.lon, f.destination.lat],
        ],
      },
      properties: { id: f.id },
    })),
  };
}

function buildDotGeoJSON(flights: CompletedFlight[]): GeoJSON.FeatureCollection {
  const seen = new Set<string>();
  const features: GeoJSON.Feature[] = [];
  flights.forEach(f => {
    [f.departure, f.destination].forEach(ap => {
      if (seen.has(ap.iata)) return;
      seen.add(ap.iata);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ap.lon, ap.lat] },
        properties: { iata: ap.iata },
      });
    });
  });
  return { type: 'FeatureCollection', features };
}

interface FlightGlobeProps {
  flights: CompletedFlight[];
}

const FlightGlobe: React.FC<FlightGlobeProps> = ({ flights }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initializedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const interactingRef = useRef(false);

  useEffect(() => {
    if (!flights.length) return;
    if (initializedRef.current) return;
    if (!containerRef.current) return;
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'pk.your_token_here') return;

    initializedRef.current = true;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [15, 20],
      zoom: 1.4,
      pitch: 0,
      attributionControl: false,
      interactive: true,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.setProjection('globe' as any);
      map.setFog({
        color: 'rgb(10, 14, 26)',
        'high-color': 'rgb(13, 27, 42)',
        'space-color': 'rgb(4, 6, 12)',
        'star-intensity': 0.18,
        'horizon-blend': 0.02,
      } as any);

      // ── Arc source ──────────────────────────────────────────────────────
      map.addSource('history-arcs', {
        type: 'geojson',
        data: buildArcGeoJSON(flights),
      });

      map.addLayer({
        id: 'arcs-glow',
        type: 'line',
        source: 'history-arcs',
        paint: { 'line-color': '#f0c040', 'line-width': 6, 'line-opacity': 0.08, 'line-blur': 4 },
      });

      map.addLayer({
        id: 'arcs-line',
        type: 'line',
        source: 'history-arcs',
        paint: { 'line-color': '#f0c040', 'line-width': 1.5, 'line-opacity': 0.75 },
      });

      // ── Airport dot source — same canvas, same coord space as lines ────
      map.addSource('history-dots', {
        type: 'geojson',
        data: buildDotGeoJSON(flights),
      });

      // Outer glow ring
      map.addLayer({
        id: 'dots-glow',
        type: 'circle',
        source: 'history-dots',
        paint: {
          'circle-radius': 7,
          'circle-color': '#f0c040',
          'circle-opacity': 0.15,
          'circle-blur': 1,
        },
      });

      // Inner solid dot
      map.addLayer({
        id: 'dots-core',
        type: 'circle',
        source: 'history-dots',
        paint: {
          'circle-radius': 3,
          'circle-color': '#f0c040',
          'circle-opacity': 1,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(240,192,64,0.4)',
        },
      });

      // ── Auto-rotation ───────────────────────────────────────────────────
      const rotate = () => {
        if (!interactingRef.current && mapRef.current) {
          const c = map.getCenter();
          map.setCenter([(c.lng + 0.04) % 360, c.lat]);
        }
        rafRef.current = requestAnimationFrame(rotate);
      };
      rafRef.current = requestAnimationFrame(rotate);
    });

    const pause  = () => { interactingRef.current = true; };
    const resume = () => { interactingRef.current = false; };
    map.on('mousedown', pause);
    map.on('mouseup',   resume);
    map.on('touchstart', pause);
    map.on('touchend',   resume);

    return () => {
      cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
      initializedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update both sources when flights change without re-mounting the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flights.length) return;
    if (!map.getSource('history-arcs')) return;
    (map.getSource('history-arcs') as mapboxgl.GeoJSONSource).setData(buildArcGeoJSON(flights));
    (map.getSource('history-dots') as mapboxgl.GeoJSONSource).setData(buildDotGeoJSON(flights));
  }, [flights]);

  if (!flights.length) {
    return (
      <div
        className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-5"
        style={{ background: '#030508', border: '1px solid rgba(240,192,64,0.08)' }}
      >
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(240,192,64,0.15)" strokeWidth="0.8">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <p className="font-mono text-muted-white/25 text-xs uppercase tracking-widest text-center leading-relaxed px-8">
          Complete your first flight<br />to see your routes on the globe
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />;
};

export default FlightGlobe;
