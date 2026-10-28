import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { rpc } from '../client';
import Icon from '../ui/Icon';
import { useButtonMotion } from '../ui/Motion';
import { coordinates, distance } from './geo';
import { walkingKey } from './transit';
import type { Journey, Place, RoadRoute, TravelMode } from './types';
const modes = [{ id: 'walk', text: 'Đi bộ', icon: 'walk' }, { id: 'motorbike', text: 'Xe máy', icon: 'bike' }, { id: 'transit', text: 'Bus / Metro', icon: 'transit' }] as const;
const metersText = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
const inside = (point: Place) => point.lat >= 10.25 && point.lat <= 11.4 && point.lon >= 106.15 && point.lon <= 107.4;
const tooltipText = (name: string) => { const span = document.createElement('span'); span.textContent = name; return span; };
export default function MapsPanel() {
  const [origin, setOrigin] = useState<Place | null>(null), [destination, setDestination] = useState<Place | null>(null);
  const [originText, setOriginText] = useState(''), [destinationText, setDestinationText] = useState('');
  const [mode, setMode] = useState<TravelMode>('walk'), [busy, setBusy] = useState(false), [progress, setProgress] = useState('');
  const [error, setError] = useState(''), [results, setResults] = useState<Place[]>([]), [searchingFor, setSearchingFor] = useState<'origin' | 'destination'>('origin');
  const [road, setRoad] = useState<RoadRoute | null>(null), [journey, setJourney] = useState<Journey | null>(null), [collapsed, setCollapsed] = useState(false), [expanded, setExpanded] = useState(false);
  const canvas = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null), lines = useRef<L.LayerGroup | null>(null);
  const worker = useRef<Worker | null>(null), sequence = useRef(0), generation = useRef(0), mounted = useRef(true);
  const pending = useRef(new Map<number, { resolve: (journey: Journey | null) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>());
  useButtonMotion(`${mode}:${collapsed}:${busy}:${results.length}:${!!road}:${!!journey}:${expanded}`);
  useEffect(() => {
    mounted.current = true;
    const instance = L.map(canvas.current!, { zoomControl: false, attributionControl: true }).setView([10.778, 106.702], 14);
    L.control.zoom({ position: 'topright' }).addTo(instance);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> / <a href="https://www.hotosm.org/" target="_blank" rel="noreferrer">HOT</a> / <a href="https://www.openstreetmap.fr/" target="_blank" rel="noreferrer">OSM France</a>', referrerPolicy: 'strict-origin-when-cross-origin' }).addTo(instance);
    map.current = instance; lines.current = L.layerGroup().addTo(instance);
    const resize = new ResizeObserver(() => instance.invalidateSize()); resize.observe(canvas.current!);
    return () => { mounted.current = false; generation.current++; resize.disconnect(); instance.remove(); map.current = null; worker.current?.terminate(); pending.current.forEach(item => { clearTimeout(item.timer); item.reject(new Error('Đã đóng bản đồ.')); }); pending.current.clear(); };
  }, []);
  useEffect(() => {
    const layer = lines.current, instance = map.current; if (!layer || !instance) return;
    layer.clearLayers(); const bounds: L.LatLngTuple[] = [];
    for (const [point, letter] of [[origin, 'A'], [destination, 'B']] as const) if (point) {
      const location = coordinates(point); bounds.push(location);
      L.marker(location, { icon: L.divIcon({ className: `map-pin ${letter === 'B' ? 'destination' : ''}`, html: letter, iconSize: [30, 30], iconAnchor: [15, 15] }) }).bindTooltip(tooltipText(point.name), { direction: 'top' }).addTo(layer);
    }
    if (road) { L.polyline(road.coordinates, { color: '#f8f3e8', weight: 9, opacity: .95 }).addTo(layer); L.polyline(road.coordinates, { color: '#284e40', weight: 5 }).addTo(layer); bounds.push(...road.coordinates); }
    if (journey) for (const leg of journey.legs) {
      L.polyline(leg.coordinates, { color: '#fffdf6', weight: leg.kind === 'walk' ? 5 : 9, opacity: .9 }).addTo(layer);
      L.polyline(leg.coordinates, { color: leg.kind === 'walk' ? '#7c795e' : leg.kind === 'metro' ? '#355e86' : '#8e3e34', weight: leg.kind === 'walk' ? 3 : 5, ...(leg.kind === 'walk' ? { dashArray: '4 7' } : {}) }).addTo(layer);
      bounds.push(...leg.coordinates);
      if (leg.line) for (const point of [leg.from, leg.to]) L.circleMarker(coordinates(point), { radius: 5, color: '#243b32', fillColor: '#fffdf6', fillOpacity: 1, weight: 2 }).bindTooltip(tooltipText(point.name)).addTo(layer);
    }
    if (bounds.length > 1) { const mobile = innerWidth <= 760; instance.fitBounds(L.latLngBounds(bounds), { paddingTopLeft: mobile ? [32, collapsed ? 150 : 310] : [400, 40], paddingBottomRight: mobile ? [32, road || journey ? 230 : 40] : [60, 70], maxZoom: 17, animate: !matchMedia('(prefers-reduced-motion: reduce)').matches }); }
    else if (bounds.length) instance.setView(bounds[0], 16);
  }, [origin, destination, road, journey, collapsed]);
  function invalidate() { generation.current++; setRoad(null); setJourney(null); setResults([]); setError(''); }
  async function search(field: 'origin' | 'destination') {
    const query = (field === 'origin' ? originText : destinationText).trim(); if (query.length < 2) { setError('Nhập tên địa điểm hoặc địa chỉ để tìm.'); return; }
    const coordinate = query.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordinate) {
      const place = { id: 'coordinate:' + query, name: query, lat: +coordinate[1], lon: +coordinate[2] };
      if (!inside(place)) { setError('Bản đồ thử nghiệm hiện hỗ trợ khu vực TP.HCM.'); return; }
      choose(place, field); return;
    }
    setBusy(true); setError(''); setProgress('Đang tìm địa điểm…'); const current = generation.current;
    try { const result = await rpc<{ places: Place[] }>('maps.search', { query }); if (!mounted.current || current !== generation.current) return; setSearchingFor(field); setResults(result.places); if (!result.places.length) setError('Chưa tìm thấy. Thêm tên đường, quận hoặc nhập tọa độ.'); }
    catch (error) { if (mounted.current) setError((error as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  function choose(place: Place, field = searchingFor) {
    invalidate(); if (field === 'origin') { setOrigin(place); setOriginText(place.name); } else { setDestination(place); setDestinationText(place.name); }
  }
  function locate() {
    if (!navigator.geolocation) { setError('Thiết bị chưa hỗ trợ vị trí. Hãy nhập điểm đi.'); return; }
    setBusy(true); setProgress('Đang lấy vị trí…'); setError('');
    navigator.geolocation.getCurrentPosition(position => {
      if (!mounted.current) return;
      const point = { id: 'current', name: 'Vị trí của tôi', lat: position.coords.latitude, lon: position.coords.longitude };
      if (inside(point)) choose(point, 'origin'); else setError('Vị trí hiện tại ngoài khu vực TP.HCM. Bạn có thể nhập điểm đi.');
      setBusy(false);
    }, () => { if (mounted.current) { setError('Chưa lấy được vị trí. Cấp quyền hoặc nhập điểm đi.'); setBusy(false); } }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  }
  function transitPlan(from: Place, to: Place, blocked: string[]) {
    if (!worker.current) {
      worker.current = new Worker(new URL('./transit.worker.ts', import.meta.url), { type: 'module' });
      worker.current.onmessage = ({ data }) => { const request = pending.current.get(data.id); if (!request) return; clearTimeout(request.timer); pending.current.delete(data.id); data.error ? request.reject(new Error(data.error)) : request.resolve(data.journey); };
      worker.current.onerror = () => { pending.current.forEach(item => { clearTimeout(item.timer); item.reject(new Error('Không mở được bộ tìm tuyến. Hãy tải lại trang.')); }); pending.current.clear(); };
    }
    const id = ++sequence.current;
    return new Promise<Journey | null>((resolve, reject) => { const timer = setTimeout(() => { pending.current.delete(id); reject(new Error('Tìm tuyến quá lâu. Vui lòng thử lại.')); }, 20000); pending.current.set(id, { resolve, reject, timer }); worker.current!.postMessage({ id, origin: from, destination: to, blocked }); });
  }
  async function plan(nextMode = mode) {
    if (!origin) { await search('origin'); return; } if (!destination) { await search('destination'); return; }
    if (distance(origin, destination) < 20) { setError('Hai điểm quá gần nhau. Hãy chọn lại nơi đến.'); return; }
    setBusy(true); setError(''); setRoad(null); setJourney(null); setExpanded(false); const current = ++generation.current;
    try {
      if (nextMode !== 'transit') {
        setProgress('Đang tìm đường ngắn nhất…'); const data = await rpc<{ route: RoadRoute }>('maps.route', { origin, destination, mode: nextMode });
        if (current === generation.current && mounted.current) setRoad(data.route);
      } else {
        const blocked: string[] = []; let accepted = false;
        for (let attempt = 0; attempt < 4; attempt++) {
          setProgress('Đang tìm tuyến và trạm chuyển…'); const result = await transitPlan(origin, destination, blocked);
          if (!result) throw new Error('Chưa tìm thấy tuyến phù hợp trong dữ liệu hiện có: tối đa 2 lần chuyển, trạm cách mỗi đầu không quá 1 km.');
          const walking = result.legs.filter(leg => leg.kind === 'walk'); let invalid = false;
          for (let i = 0; i < walking.length; i++) {
            setProgress(`Đang kiểm tra đường đi bộ ${i + 1}/${walking.length}…`);
            const leg = walking[i], data = await rpc<{ route: RoadRoute }>('maps.route', { origin: leg.from, destination: leg.to, mode: 'walk' });
            const maxWalk = leg.from.id === origin.id || leg.to.id === destination.id ? 1400 : 650;
            if (data.route.meters > maxWalk) { blocked.push(walkingKey(leg.from, leg.to)); invalid = true; break; }
            leg.coordinates = data.route.coordinates; leg.meters = data.route.meters;
          }
          if (invalid) continue;
          result.legs = result.legs.reduce<Journey['legs']>((merged, leg) => {
            const last = merged.at(-1);
            if (last?.kind === 'walk' && leg.kind === 'walk') { last.to = leg.to; last.meters += leg.meters; last.coordinates.push(...leg.coordinates); }
            else merged.push(leg);
            return merged;
          }, []);
          result.meters = result.legs.reduce((sum, leg) => sum + leg.meters, 0);
          if (current === generation.current && mounted.current) setJourney(result);
          accepted = true; break;
        }
        if (!accepted) throw new Error('Chưa xác minh được lối đi bộ tới trạm. Hãy thử điểm đi/đến gần trạm hơn.');
      }
      if (mounted.current && current === generation.current) setCollapsed(true);
    } catch (error) { if (mounted.current && current === generation.current) setError((error as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  const hasRoute = !!road || !!journey;
  return <section className="maps-panel" aria-label="Bản đồ và chỉ đường">
    <div className="map-canvas" ref={canvas} role="region" aria-label="Bản đồ TP.HCM"/>
    <section className="map-search-sheet" aria-label="Tìm đường"><h1>Đi đâu hôm nay?</h1>
      {collapsed && hasRoute ? <div className="collapsed-route"><p><strong>{origin?.name}</strong><br/>{destination?.name}</p><button onClick={() => setCollapsed(false)}>Sửa</button></div> : <>
        <div className="route-fields">{(['origin', 'destination'] as const).map(field => <div className="place-input-row" key={field}><i className={`place-dot ${field}`}/><label className="sr-only" htmlFor={'map-' + field}>{field === 'origin' ? 'Điểm đi' : 'Nơi đến'}</label><input id={'map-' + field} value={field === 'origin' ? originText : destinationText} placeholder={field === 'origin' ? 'Bạn đang ở đâu?' : 'Nhập nơi đến'} disabled={busy} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void search(field); } }} onChange={event => { invalidate(); if (field === 'origin') { setOrigin(null); setOriginText(event.target.value); } else { setDestination(null); setDestinationText(event.target.value); } }}/><button className="icon-button" aria-label={field === 'origin' ? 'Tìm điểm đi' : 'Tìm nơi đến'} disabled={busy} onClick={() => void search(field)}><Icon name="search" size={18}/></button></div>)}</div>
        <div className="place-search-actions"><button disabled={busy} onClick={locate}><Icon name="locate" size={16}/>Vị trí của tôi</button><button disabled={busy} onClick={() => { invalidate(); setOrigin(destination); setDestination(origin); setOriginText(destinationText); setDestinationText(originText); }}><Icon name="swap" size={16}/>Đổi chiều</button></div>
      </>}
      {results.length > 0 && <ul className="place-results" aria-label={searchingFor === 'origin' ? 'Kết quả điểm đi' : 'Kết quả nơi đến'}>{results.map(place => <li key={place.id}><button onClick={() => choose(place)}><span>{place.name}</span><small>{place.address}</small></button></li>)}</ul>}
      <div className="transport-tabs" aria-label="Phương tiện">{modes.map(item => <button key={item.id} disabled={busy} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setRoad(null); setJourney(null); setError(''); if (origin && destination) void plan(item.id); }}><Icon name={item.icon}/>{item.text}</button>)}</div>
      {(!collapsed || !hasRoute || busy) && <button className="primary wide map-submit" disabled={busy} onClick={() => void plan()}>{busy ? <><i className="spinner"/>{progress}</> : 'Tìm đường'}</button>}
      {error && <p className="map-error" role="alert">{error}</p>}
      {!hasRoute && !busy && <p className="map-hint">TP.HCM. Nhấn kính lúp để chọn đúng địa điểm. Địa chỉ gửi tới dịch vụ bản đồ; camera không gửi kèm.</p>}
    </section>
    {hasRoute && <section className={`route-sheet ${expanded ? 'is-expanded' : ''}`} aria-label="Hành trình"><div className="route-summary"><strong>{metersText(road ? road.meters : journey!.meters)}</strong><span>{road ? `Khoảng ${Math.max(1, Math.round(road.seconds / 60))} phút` : `${journey!.boardings} tuyến / ${Math.max(0, journey!.boardings - 1)} lần đổi`}</span></div>
      <p className="route-description">{road ? 'Tối ưu quãng đường theo mạng đường hiện có.' : 'Lên đúng chiều tuyến ghi bên dưới.'}</p>
      {road && <details onToggle={event => setExpanded(event.currentTarget.open)}><summary>Các bước di chuyển</summary><ol className="road-instructions">{road.instructions.map((instruction, i) => <li key={i}>{instruction.text}{instruction.meters > 0 && <small> ({metersText(instruction.meters)})</small>}</li>)}</ol></details>}
      {journey && <><div className="route-line-chips">{journey.legs.filter(leg => leg.line).map((leg, i) => <span className={`line-code ${leg.kind}`} key={i}>{leg.kind === 'metro' ? 'Metro ' : 'Bus '}{leg.line!.code}</span>)}</div><button className="journey-expand" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Thu gọn hành trình' : 'Trạm lên, xuống & chuyển tuyến'}</button>{expanded && <ol className="transit-steps">{journey.legs.map((leg, index) => <li key={index} className={leg.kind === 'walk' ? 'walk-leg' : ''}>{leg.kind === 'walk' ? <><h3>Đi bộ {metersText(leg.meters)}</h3><p>Đến {leg.to.name}</p></> : <><span className={`line-code ${leg.kind}`}><Icon name="transit" size={14}/>{leg.kind === 'metro' ? 'Metro ' : 'Xe buýt '}{leg.line!.code}</span><h3>Lên tại {leg.from.name}</h3><small>Hướng {leg.line!.headsign}</small><p>Xuống tại <strong>{leg.to.name}</strong></p><small>{leg.stopCount} trạm theo dữ liệu nguồn</small></>}</li>)}</ol>}</>}
      <p className="route-footnote">{road ? 'Valhalla / OpenStreetMap. Thời gian ước tính, chưa có giao thông trực tiếp.' : `Nguồn tuyến: EBMS TP.HCM & OpenStreetMap. Dữ liệu ${new Date(journey!.updatedAt).toLocaleDateString('vi-VN')}. Sơ đồ tuyến, chưa tính giờ chờ hay chuyến cuối; kiểm tra biển trạm và chiều xe.`}</p>
    </section>}
  </section>;
}
