import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Map, Marker, type GeoJSONSource, type StyleSpecification, setWorkerCount, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useLocale } from '../i18n';
import { CompassSeal } from '../ui/Ornament';
import type { Field } from './PinButton';
import type { Journey, Place, RoadRoute } from './types';

setWorkerUrl(new URL(workerUrl, location.href).href);
setWorkerCount(1);
const vectorStyle = 'https://tiles.openfreemap.org/styles/positron';
const motionDuration = (milliseconds: number) => matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : milliseconds;
const rasterTiles = ['https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'];
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> / <a href="https://www.hotosm.org/" target="_blank" rel="noreferrer">HOT</a> / <a href="https://www.openstreetmap.fr/" target="_blank" rel="noreferrer">OSM France</a>';
const routeLayers = (): StyleSpecification['layers'] => [
  { id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fffaf0', 'line-width': 8 } },
  { id: 'route-rides', type: 'line', source: 'route', filter: ['!=', ['get', 'kind'], 'walk'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 4.5 } },
  { id: 'route-walking', type: 'line', source: 'route', filter: ['==', ['get', 'kind'], 'walk'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#6b715d', 'line-width': 3, 'line-dasharray': [1, 2] } },
];
const fallbackStyle = (): StyleSpecification => ({ version: 8, sources: { basemap: { type: 'raster', tiles: rasterTiles, tileSize: 256, maxzoom: 19, attribution } }, layers: [
  { id: 'paper', type: 'background', paint: { 'background-color': '#e5e3d4' } },
  { id: 'streets', type: 'raster', source: 'basemap', paint: { 'raster-fade-duration': 0 } },
] });
export interface MapHandle { unprojectScreen: (x: number, y: number) => { lat: number; lon: number } | null }
type Props = { origin: Place | null; destination: Place | null; road: RoadRoute | null; journey: Journey | null; collapsed: boolean; pickField: Field | null; onPin: (lat: number, lon: number, field: Field) => void };

export default forwardRef<MapHandle, Props>(function MapCanvas(props, ref) {
  const { t, locale } = useLocale(), container = useRef<HTMLDivElement>(null), map = useRef<Map | null>(null);
  const current = useRef(props); current.current = props;
  const [epoch, setEpoch] = useState(0), [styleEpoch, setStyleEpoch] = useState(0), [loaded, setLoaded] = useState(false), [tilted, setTilted] = useState(true), [bearing, setBearing] = useState(-12);
  const [health, setHealth] = useState<'loading' | 'ready' | 'recovering' | 'failed' | 'unsupported'>('loading');
  const markers = useRef<Marker[]>([]), cameraSignature = useRef(''), healthRef = useRef(health); healthRef.current = health;
  useImperativeHandle(ref, () => ({ unprojectScreen(x, y) {
    const bounds = container.current?.getBoundingClientRect(), instance = map.current;
    if (!bounds || !instance || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
    const point = instance.unproject([x - bounds.left, y - bounds.top]); return { lat: point.lat, lon: point.lng };
  } }), []);
  useEffect(() => {
    let instance: Map, alive = true, fallback = false, retries = 0, retryScheduled = false, hadTileError = false, hasBaseContent = false, recoveryExhausted = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => { const timer = setTimeout(() => { timers.delete(timer); if (alive) fn(); }, ms); timers.add(timer); return timer; };
    setLoaded(false); setHealth('loading'); cameraSignature.current = '';
    try {
      instance = new Map({ container: container.current!, style: vectorStyle, center: [106.702, 10.778], zoom: 14, pitch: 42, bearing: -12, maxPitch: 60, maxZoom: 19, renderWorldCopies: false, attributionControl: { compact: true }, scrollZoom: false, canvasContextAttributes: { antialias: true }, transformRequest: url => ({ url, referrerPolicy: 'strict-origin-when-cross-origin' }) });
    } catch { setHealth('unsupported'); return; }
    map.current = instance; setTilted(true);
    // Pins and camera controls must work even while an upstream tile request is stalled.
    instance.on('style.load', () => {
      if (!alive) return;
      if (!instance.getSource('route')) {
        instance.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        for (const layer of routeLayers()) instance.addLayer(layer);
      }
      for (const layer of instance.getStyle().layers) {
        if (layer.type === 'background') instance.setPaintProperty(layer.id, 'background-color', '#e8e5d9');
        else if (layer.type === 'fill' && /water/.test(layer.id)) instance.setPaintProperty(layer.id, 'fill-color', '#bbcfc6');
      }
      setLoaded(true); setStyleEpoch(value => value + 1);
    });
    instance.on('click', event => { const p = current.current; if (p.pickField) p.onPin(event.lngLat.lat, event.lngLat.lng, p.pickField); });
    instance.on('pitchend', () => { if (alive) setTilted(instance.getPitch() > 5); });
    instance.on('rotateend', () => { if (alive) setBearing(instance.getBearing()); });
    const baseSource = () => fallback ? 'basemap' : 'openmaptiles';
    const switchToFallback = () => { fallback = true; hadTileError = false; hasBaseContent = false; setLoaded(false); instance.setStyle(fallbackStyle()); };
    let loadingTimer: ReturnType<typeof setTimeout> | undefined, stallTimer: ReturnType<typeof setTimeout> | undefined;
    const clearTileWatch = () => { for (const timer of [loadingTimer, stallTimer]) if (timer) { clearTimeout(timer); timers.delete(timer); } loadingTimer = undefined; stallTimer = undefined; };
    instance.on('sourcedataloading', event => {
      if (!alive || event.sourceId !== baseSource() || stallTimer || recoveryExhausted) return;
      loadingTimer = later(() => { if (!instance.areTilesLoaded()) setHealth('loading'); }, 900);
      stallTimer = later(() => {
        clearTileWatch();
        if (!instance.areTilesLoaded()) { setHealth('recovering'); if (!fallback) switchToFallback(); else { recoveryExhausted = true; setHealth('failed'); } }
      }, 14000);
    });
    instance.on('sourcedata', event => { if (event.sourceId === baseSource() && event.sourceDataType === 'content') hasBaseContent = true; });
    instance.on('idle', () => { clearTileWatch(); if (alive && hasBaseContent && !hadTileError) setHealth('ready'); });
    instance.on('error', event => {
      if (!alive || ('sourceId' in event && event.sourceId === 'route')) return;
      if (recoveryExhausted) { setHealth('failed'); return; }
      hadTileError = true; setHealth('recovering');
      if (retryScheduled) return;
      retryScheduled = true;
      if (!fallback) {
        later(() => { retryScheduled = false; switchToFallback(); }, 1200);
      } else if (retries++ < 2) later(() => { retryScheduled = false; hadTileError = false; instance.refreshTiles(baseSource()); }, retries * 2500);
      else { recoveryExhausted = true; setHealth('failed'); }
    });
    const canvas = instance.getCanvas();
    const lost = (event: Event) => { event.preventDefault(); if (alive) setHealth('recovering'); later(() => setHealth(previous => previous === 'ready' ? previous : 'failed'), 6000); };
    const restored = () => { if (alive) { instance.resize(); instance.triggerRepaint(); setHealth('loading'); } };
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored);
    const resize = () => {
      if (!alive) return;
      instance.resize(); instance.triggerRepaint();
      const element = container.current!, sheet = element.parentElement?.querySelector('.map-search-sheet');
      if (sheet) element.parentElement!.style.setProperty('--map-controls-top', Math.max(12, sheet.getBoundingClientRect().bottom - element.getBoundingClientRect().top + 10) + 'px');
    };
    const observer = new ResizeObserver(resize); observer.observe(container.current!);
    const sheet = container.current!.parentElement?.querySelector('.map-search-sheet'); if (sheet) observer.observe(sheet);
    const visible = () => { if (document.visibilityState === 'visible') { resize(); if (healthRef.current !== 'ready' && instance.getSource(baseSource())) { hadTileError = false; instance.refreshTiles(baseSource()); } } };
    document.addEventListener('visibilitychange', visible); window.addEventListener('pageshow', resize);
    later(() => {
      if (healthRef.current === 'loading' && !fallback && !hasBaseContent) {
        setHealth('recovering'); switchToFallback();
      }
    }, 8000);
    later(() => { if (healthRef.current === 'loading' || healthRef.current === 'recovering') { recoveryExhausted = true; setHealth('failed'); } }, 18000);
    return () => {
      alive = false; timers.forEach(clearTimeout); observer.disconnect(); document.removeEventListener('visibilitychange', visible); window.removeEventListener('pageshow', resize);
      canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored);
      markers.current.forEach(marker => marker.remove()); markers.current = []; instance.remove(); map.current = null;
    };
  }, [epoch]);
  useEffect(() => {
    const instance = map.current; if (!instance || !loaded) return;
    markers.current.forEach(marker => marker.remove()); markers.current = [];
    const bounds: [number, number][] = [];
    for (const [point, field, letter] of [[props.origin, 'origin', 'A'], [props.destination, 'destination', 'B']] as const) if (point) {
      const element = document.createElement('button'); element.className = `map-pin ${field === 'destination' ? 'destination' : ''}`;
      element.textContent = letter; element.title = point.address || point.name; element.setAttribute('aria-label', t(field === 'origin' ? 'originPin' : 'destinationPin') + ': ' + point.name);
      const marker = new Marker({ element, draggable: true, anchor: 'center', rotationAlignment: 'viewport', pitchAlignment: 'viewport' }).setLngLat([point.lon, point.lat]).addTo(instance);
      marker.on('dragend', () => { const p = marker.getLngLat(); current.current.onPin(p.lat, p.lng, field); });
      markers.current.push(marker); bounds.push([point.lon, point.lat]);
    }
    const paths = props.road ? [{ kind: 'road', color: '#284e40', coordinates: props.road.coordinates }] : (props.journey?.legs || []).map(leg => ({ kind: leg.kind, color: leg.kind === 'metro' ? '#355e86' : '#8e3e34', coordinates: leg.coordinates }));
    const features = paths.map(path => {
      const coordinates = path.coordinates.map(([lat, lon]) => [lon, lat] as [number, number]); bounds.push(...coordinates);
      return { type: 'Feature' as const, properties: { kind: path.kind, color: path.color }, geometry: { type: 'LineString' as const, coordinates } };
    });
    (instance.getSource('route') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
    for (const leg of props.journey?.legs || []) if (leg.line) for (const point of [leg.from, leg.to]) {
      const element = document.createElement('span'); element.className = 'map-stop'; element.title = point.name;
      markers.current.push(new Marker({ element }).setLngLat([point.lon, point.lat]).addTo(instance));
    }
    const signature = JSON.stringify([props.origin?.lat, props.origin?.lon, props.destination?.lat, props.destination?.lon, props.road?.meters, props.journey?.seconds, props.collapsed]);
    if (bounds.length && signature !== cameraSignature.current) {
      cameraSignature.current = signature;
      const width = container.current!.clientWidth, height = container.current!.clientHeight, mobile = width <= 760;
      if (bounds.length === 1) instance.easeTo({ center: bounds[0], zoom: 16, duration: 0 });
      else {
        const west = Math.min(...bounds.map(p => p[0])), east = Math.max(...bounds.map(p => p[0])), south = Math.min(...bounds.map(p => p[1])), north = Math.max(...bounds.map(p => p[1]));
        instance.fitBounds([[west, south], [east, north]], { padding: mobile ? { top: Math.min(height * .30, props.collapsed ? 190 : 300), bottom: Math.min(height * .32, paths.length ? 230 : 40), left: 25, right: 25 } : { top: 45, bottom: 50, left: Math.min(width * .35, 400), right: Math.min(width * .35, paths.length ? 390 : 60) }, maxZoom: 17, pitch: instance.getPitch(), bearing: instance.getBearing(), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550 });
      }
    }
  }, [props.origin, props.destination, props.road, props.journey, props.collapsed, loaded, styleEpoch, locale]);
  function retry() { setEpoch(value => value + 1); }
  return <>
    <div className="map-canvas" ref={container} role="region" aria-label={t('cityMap')} data-map-health={health}/>
    <div className="map-view-controls">
      <button className="map-perspective" disabled={!loaded} onClick={() => map.current?.easeTo({ pitch: tilted ? 0 : 42, duration: motionDuration(650) })} aria-label={t(tilted ? 'flatMap' : 'tiltedMap')}>{tilted ? '2D' : '3D'}</button>
      <button className="map-north" disabled={!loaded} aria-label={t('resetNorth')} onClick={() => map.current?.easeTo({ bearing: 0, duration: motionDuration(550) })}><span style={{transform:`rotate(${-bearing}deg)`}}><CompassSeal/></span></button>
      <button disabled={!loaded} aria-label={t('zoomIn')} onClick={() => map.current?.zoomIn({ duration: motionDuration(300) })}>+</button>
      <button disabled={!loaded} aria-label={t('zoomOut')} onClick={() => map.current?.zoomOut({ duration: motionDuration(300) })}>−</button>
    </div>
    {health !== 'ready' && <div className={`map-load-status ${health}`} role="status"><span>{t(health === 'unsupported' ? 'mapUnsupported' : health === 'failed' ? 'mapTilesFailed' : health === 'recovering' ? 'mapRecovering' : 'mapTilesLoading')}</span>{(health === 'failed' || health === 'unsupported') && <button onClick={retry}>{t('retry')}</button>}</div>}
  </>;
});
