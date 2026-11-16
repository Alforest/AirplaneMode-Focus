import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { flightElapsed } from '../../lib/activeFlight';
import { track } from '../../lib/analytics';
import { motion } from 'framer-motion';
import { useFlightStore } from '../../store/flightStore';
import { greatCircleArc, haversineKm } from '../../utils/flightCalculations';
import { getTimeline, arcFraction } from '../../utils/flightPhases';

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

// Anchor the marker so the coordinate sits at the center of the DOT, not the
// center of the dot+label stack (which made arcs end between dot and label).
// The dot renders 14px tall (10px + 2px border each side), so its center is
// 7px below the element's top edge.
const AIRPORT_MARKER_OPTS = { anchor: 'top' as const, offset: [0, -7] as [number, number] };

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

type CameraMode = 'route' | 'follow' | 'free';

function fitRouteBounds(map: mapboxgl.Map, arc: [number, number][], duration: number) {
  if (!arc.length) return;
  const lons = arc.map(point => point[0]);
  const lats = arc.map(point => point[1]);
  const width = map.getContainer().clientWidth;
  map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {
    padding: { top: 100, left: width < 500 ? 35 : 65, right: 35, bottom: 65 },
    duration, maxZoom: 10, retainPadding: false,
  });
}

const MapView: React.FC = () => {
  const { departure, destination } = useFlightStore();
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');
  const [cameraMode, setCameraMode] = useState<CameraMode>('route');
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(2);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const arcPointsRef = useRef<[number, number][]>([]);
  const positionRef = useRef<[number, number]>([0, 0]);
  const modeRef = useRef<CameraMode>('route');
  const styleRef = useRef<MapStyle>('dark');

  const chooseMode = (mode: CameraMode) => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    modeRef.current = mode;
    setCameraMode(mode);
    map.stop();
    if (mode === 'route') fitRouteBounds(map, arcPointsRef.current, 600);
    else if (mode === 'follow') map.easeTo({ center: positionRef.current, zoom: Math.max(map.getZoom(), 6), padding: { top: 0, left: 0, right: 0, bottom: 0 }, duration: 600 });
    track('map_view_changed', { mode });
  };
  const changeZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (modeRef.current === 'route') { modeRef.current = 'free'; setCameraMode('free'); }
    map.stop();
    map.zoomTo(Math.min(16, Math.max(1, map.getZoom() + delta)), { duration: 250 });
    track('map_zoom_changed', { direction: delta > 0 ? 'in' : 'out', mode: modeRef.current });
  };

  useEffect(() => {
    if (!departure || !destination || !mapContainerRef.current || mapRef.current || !MAPBOX_TOKEN || MAPBOX_TOKEN === 'pk.your_token_here') return;
    let disposed = false;
    let raf = 0;
    let lastPathUpdate = 0;
    let lastFollow = 0;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const arc = greatCircleArc(departure.lat, departure.lon, destination.lat, destination.lon, 200);
    arcPointsRef.current = arc;
    const totalKm = haversineKm(departure.lat, departure.lon, destination.lat, destination.lon);
    const timeline = getTimeline(useFlightStore.getState().durationMinutes);
    const position = () => {
      const state = useFlightStore.getState();
      const progress = state.phase === 'landed' ? 1 : state.startTime ? flightElapsed(state.startTime, state.durationMinutes, state.speedMultiplier).progress : 0;
      const raw = arcFraction(progress, timeline, totalKm) * (arc.length - 1);
      const low = Math.min(Math.floor(raw), arc.length - 2);
      const fraction = raw - low;
      const from = arc[low]; const to = arc[low + 1];
      return { point: [from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction] as [number, number], index: low + 1, from, to };
    };
    const initial = position();
    positionRef.current = initial.point;
    const map = new mapboxgl.Map({ container: mapContainerRef.current, style: STYLES.dark, center: initial.point, zoom: 2, minZoom: 1, maxZoom: 16, attributionControl: false });
    mapRef.current = map;
    styleRef.current = 'dark';
    modeRef.current = 'route';
    setCameraMode('route');
    setMapStyle('dark');
    const origin = new mapboxgl.Marker({ ...AIRPORT_MARKER_OPTS, element: makeAirportMarkerEl(departure.iata, '#f0c040') }).setLngLat(arc[0]).addTo(map);
    const dest = new mapboxgl.Marker({ ...AIRPORT_MARKER_OPTS, element: makeAirportMarkerEl(destination.iata, '#e8a020') }).setLngLat(arc[arc.length - 1]).addTo(map);
    const plane = new mapboxgl.Marker({ element: makePlaneEl(), anchor: 'center' }).setLngLat(initial.point).addTo(map);
    const layers = () => {
      if (disposed || map.getSource('full-arc')) return;
      addLayers(map, arc, position().index, styleRef.current);
    };
    const explore = (event: unknown) => {
      if (!(event as { originalEvent?: unknown }).originalEvent) return;
      modeRef.current = 'free'; setCameraMode('free');
    };
    map.on('dragstart', explore);
    map.on('zoomstart', explore);
    map.on('rotatestart', explore);
    map.on('zoomend', () => { if (!disposed) setZoom(map.getZoom()); });
    map.on('style.load', layers);
    const tick = () => {
      if (disposed) return;
      const current = position();
      positionRef.current = current.point;
      plane.setLngLat(current.point);
      const svg = plane.getElement().querySelector('svg') as SVGElement | null;
      if (svg) svg.style.transform = `rotate(${Math.atan2(current.to[0] - current.from[0], current.to[1] - current.from[1]) * 180 / Math.PI}deg)`;
      const now = Date.now();
      if (now - lastPathUpdate > 100) {
        lastPathUpdate = now;
        const source = map.getSource('traveled-arc') as mapboxgl.GeoJSONSource | undefined;
        source?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [...arc.slice(0, current.index), current.point] }, properties: {} });
      }
      // Follow changes only the center. It never fights a user-selected zoom,
      // and waits for zoom/pan animations to finish before moving again.
      if (modeRef.current === 'follow' && now - lastFollow > 1000 && !map.isMoving()) {
        lastFollow = now;
        map.easeTo({ center: current.point, duration: 900, easing: t => t });
      }
      raf = requestAnimationFrame(tick);
    };
    map.on('load', () => {
      if (disposed) return;
      layers();
      setLoaded(true);
      fitRouteBounds(map, arc, 0);
      raf = requestAnimationFrame(tick);
    });
    const resize = new ResizeObserver(() => {
      if (disposed) return;
      map.resize();
      if (map.loaded() && modeRef.current === 'route') fitRouteBounds(map, arc, 0);
    });
    resize.observe(mapContainerRef.current);
    return () => {
      disposed = true;
      resize.disconnect();
      cancelAnimationFrame(raf);
      origin.remove(); dest.remove(); plane.remove();
      map.remove(); mapRef.current = null;
      setLoaded(false);
    };
  }, [departure, destination]);

  const changeStyle = () => {
    const next = mapStyle === 'dark' ? 'satellite' : 'dark';
    styleRef.current = next;
    setMapStyle(next);
    mapRef.current?.setStyle(STYLES[next]);
  };
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'pk.your_token_here') return <div className="flex h-full w-full items-center justify-center rounded-2xl bg-midnight/80 p-6 text-center text-sm text-muted-white/60">The map is unavailable. Your study timer is still running.</div>;
  const control = 'min-h-[44px] rounded-lg border px-3 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-40';
  return <div className="relative h-full w-full">
    <div ref={mapContainerRef} className="h-full w-full overflow-hidden rounded-2xl" style={{ minHeight: 300 }} />
    <div className="absolute left-3 top-3 z-10 rounded-xl border border-gold/20 bg-navy/90 p-2 shadow-lg" aria-label="Map camera controls" role="group">
      <div className="flex flex-col gap-2">
        <button type="button" disabled={!loaded} aria-pressed={cameraMode === 'route'} onClick={() => chooseMode('route')} className={`${control} ${cameraMode === 'route' ? 'border-gold/50 bg-gold/15 text-gold' : 'border-gold/15 text-muted-white/70'}`}>Full route</button>
        <button type="button" disabled={!loaded} aria-pressed={cameraMode === 'follow'} onClick={() => chooseMode('follow')} className={`${control} ${cameraMode === 'follow' ? 'border-gold/50 bg-gold/15 text-gold' : 'border-gold/15 text-muted-white/70'}`}>Follow plane</button>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={!loaded || zoom <= 1} aria-label="Zoom out" title="Zoom out" onClick={() => changeZoom(-1)} className={`${control} flex-1 border-gold/15 text-lg text-gold`}>−</button>
        <button type="button" disabled={!loaded || zoom >= 16} aria-label="Zoom in" title="Zoom in" onClick={() => changeZoom(1)} className={`${control} flex-1 border-gold/15 text-lg text-gold`}>+</button>
      </div>
      <p className="mt-2 max-w-[112px] text-center text-[10px] text-muted-white/50" role="status">{cameraMode === 'route' ? 'Route overview' : cameraMode === 'follow' ? 'Following plane' : 'Explore map freely'}</p>
    </div>
    <div className="absolute right-3 top-3 z-10"><motion.button type="button" disabled={!loaded} onClick={changeStyle} whileTap={{ scale: 0.97 }} className="min-h-[44px] rounded-xl border border-white/15 bg-navy/90 px-3 text-xs text-muted-white/80 hover:text-gold disabled:opacity-40">{mapStyle === 'dark' ? 'Satellite view' : 'Dark view'}</motion.button></div>
  </div>;
};

export default MapView;
