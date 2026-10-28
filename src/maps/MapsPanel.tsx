import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { rpc } from '../client';
import Icon from '../ui/Icon';
import { useButtonMotion } from '../ui/Motion';
import { coordinates, distance } from './geo';
import { verifyJourney } from './verifyJourney';
import TransitSteps from './TransitSteps';
import type { Journey, Place, RoadRoute, TransitSearchOptions, TravelMode } from './types';
import { useLocale } from '../i18n';
import DestinationInput from './DestinationInput';
import PinButton, { type Field } from './PinButton';
import { maneuverText } from './maneuvers';
import { LANDMARKS, landmarkPlace } from './landmarks';
const modes = [{ id: 'walk', text: 'walk', icon: 'walk' }, { id: 'motorbike', text: 'motorbike', icon: 'bike' }, { id: 'transit', text: 'publicTransport', icon: 'transit' }] as const;
const metersText = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
const inside = (point: Place) => point.lat >= 10.25 && point.lat <= 11.4 && point.lon >= 106.15 && point.lon <= 107.4;
const tooltipText = (name: string) => { const span = document.createElement('span'); span.textContent = name; return span; };
export default function MapsPanel() {
  const {t,m,locale}=useLocale();
  const [pickField,setPickField]=useState<Field|null>(null),[drag,setDrag]=useState<{x:number;y:number;field:Field}|null>(null);
  const pickRef=useRef(pickField);pickRef.current=pickField;
  const pinRef=useRef((lat:number,lon:number,field:Field)=>{});pinRef.current=pinAt;
  const [origin, setOrigin] = useState<Place | null>(null), [destination, setDestination] = useState<Place | null>(null);
  const [originText, setOriginText] = useState(''), [destinationText, setDestinationText] = useState('');
  const [mode, setMode] = useState<TravelMode>('walk'), [busy, setBusy] = useState(false), [progress, setProgress] = useState('');
  const [error, setError] = useState(''), [results, setResults] = useState<Place[]>([]), [searchingFor, setSearchingFor] = useState<'origin' | 'destination'>('origin');
  const [road, setRoad] = useState<RoadRoute | null>(null), [journey, setJourney] = useState<Journey | null>(null), [collapsed, setCollapsed] = useState(false), [expanded, setExpanded] = useState(false);
  const canvas = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null), lines = useRef<L.LayerGroup | null>(null);
  const worker = useRef<Worker | null>(null), sequence = useRef(0), generation = useRef(0), mounted = useRef(true);
  const pending = useRef(new Map<number, { resolve: (journey: Journey | null) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>());
  useButtonMotion(`${mode}:${collapsed}:${busy}:${results.length}:${!!road}:${!!journey}:${expanded}`);
  function displayPlace(point:Place):Place {
    const preset=LANDMARKS.find(item=>item.id===point.id);
    return preset?landmarkPlace(preset,locale):point.id.startsWith('pin:')?{...point,name:t(point.id.startsWith('pin:origin:')?'pinnedOrigin':'pinnedDestination')}:point.id==='current'?{...point,name:t('myLocation')}:point;
  }
  useEffect(()=>{
    if(origin){const next=displayPlace(origin);if(next.name!==origin.name){setOrigin(next);if(originText===origin.name)setOriginText(next.name);}}
    if(destination){const next=displayPlace(destination);if(next.name!==destination.name){setDestination(next);if(destinationText===destination.name)setDestinationText(next.name);}}
  },[locale]);
  useEffect(() => {
    mounted.current = true;
    const instance = L.map(canvas.current!, { zoomControl: false, attributionControl: true }).setView([10.778, 106.702], 14);
    L.control.zoom({ position: 'topright' }).addTo(instance);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> / <a href="https://www.hotosm.org/" target="_blank" rel="noreferrer">HOT</a> / <a href="https://www.openstreetmap.fr/" target="_blank" rel="noreferrer">OSM France</a>', referrerPolicy: 'strict-origin-when-cross-origin' }).addTo(instance);
    map.current = instance; lines.current = L.layerGroup().addTo(instance);
    instance.on('click',event=>{if(pickRef.current)pinRef.current(event.latlng.lat,event.latlng.lng,pickRef.current);});
    const resize = new ResizeObserver(() => instance.invalidateSize()); resize.observe(canvas.current!);
    return () => { mounted.current = false; generation.current++; resize.disconnect(); instance.remove(); map.current = null; worker.current?.terminate(); pending.current.forEach(item => { clearTimeout(item.timer); item.reject(new Error('Đã đóng bản đồ.')); }); pending.current.clear(); };
  }, []);
  useEffect(() => {
    const layer = lines.current, instance = map.current; if (!layer || !instance) return;
    layer.clearLayers(); const bounds: L.LatLngTuple[] = [];
    for (const [point, letter] of [[origin, 'A'], [destination, 'B']] as const) if (point) {
      const location = coordinates(point); bounds.push(location);
      const marker=L.marker(location, { draggable:true, keyboard:true, title:t(letter==='B'?'destinationPin':'originPin'), alt:letter, icon: L.divIcon({ className: `map-pin ${letter === 'B' ? 'destination' : ''}`, html: letter, iconSize: [44, 44], iconAnchor: [22, 22] }) }).bindTooltip(tooltipText(point.name), { direction: 'top' }).addTo(layer);
      marker.on('dragend',()=>{const p=marker.getLatLng();pinRef.current(p.lat,p.lng,letter==='B'?'destination':'origin');});
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
  }, [origin, destination, road, journey, collapsed,locale]);
  function pinAt(lat:number,lon:number,field:Field){
    const point={id:`pin:${field}:${lat.toFixed(6)},${lon.toFixed(6)}`,name:t(field==='origin'?'pinnedOrigin':'pinnedDestination'),address:`${lat.toFixed(6)}, ${lon.toFixed(6)}`,lat,lon};
    if(!inside(point)){setError('Bản đồ thử nghiệm hiện hỗ trợ khu vực TP.HCM.');return;}
    choose(point,field);setPickField(null);setCollapsed(false);
  }
  function dropPin(x:number,y:number,field:Field){const bounds=canvas.current?.getBoundingClientRect(),instance=map.current;if(!bounds||!instance||x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)return;const p=instance.containerPointToLatLng([x-bounds.left,y-bounds.top]);pinAt(p.lat,p.lng,field);}
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
  function transitPlan(from: Place, to: Place, options: TransitSearchOptions) {
    if (!worker.current) {
      worker.current = new Worker(new URL('./transit.worker.ts', import.meta.url), { type: 'module' });
      worker.current.onmessage = ({ data }) => { const request = pending.current.get(data.id); if (!request) return; clearTimeout(request.timer); pending.current.delete(data.id); data.error ? request.reject(new Error(data.error)) : request.resolve(data.journey); };
      worker.current.onerror = () => { pending.current.forEach(item => { clearTimeout(item.timer); item.reject(new Error('Không mở được bộ tìm tuyến. Hãy tải lại trang.')); }); pending.current.clear(); };
    }
    const id = ++sequence.current;
    return new Promise<Journey | null>((resolve, reject) => { const timer = setTimeout(() => { pending.current.delete(id); reject(new Error('Tìm tuyến quá lâu. Vui lòng thử lại.')); }, 20000); pending.current.set(id, { resolve, reject, timer }); worker.current!.postMessage({ id, origin: from, destination: to, options }); });
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
        const active = () => { if (!mounted.current || current !== generation.current) throw new Error('Đã đóng bản đồ.'); };
        const result = await verifyJourney(async options => {
          active(); setProgress('Đang tìm tuyến và trạm chuyển…'); return transitPlan(origin, destination, options);
        }, async (from, to) => {
          active(); return (await rpc<{ route: RoadRoute }>('maps.route', { origin: from, destination: to, mode: 'walk' })).route;
        }, origin, destination, (i, count) => setProgress(`Đang kiểm tra đường đi bộ ${i}/${count}…`));
        if (current === generation.current && mounted.current) { setJourney(result); setExpanded(true); }
      }
      if (mounted.current && current === generation.current) setCollapsed(true);
    } catch (error) { if (mounted.current && current === generation.current) setError((error as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  const hasRoute = !!road || !!journey;
  const pinProps=(field:Field)=>({field,disabled:busy,active:pickField===field,onPick:()=>{setPickField(pickField===field?null:field);setResults([]);},onDrag:setDrag,onDrop:(x:number,y:number)=>dropPin(x,y,field)});
  return <section className={`maps-panel ${pickField?'is-picking':''} ${drag?'is-dragging':''}`} aria-label={t('mapRegion')}>
    <div className="map-canvas" ref={canvas} role="region" aria-label={t('cityMap')}/>
    <p className="sr-only" id="map-pin-help">{t('pinHelp')}</p>
    {drag&&<div className={`drag-pin ${drag.field}`} style={{left:drag.x,top:drag.y}} aria-hidden="true">{drag.field==='origin'?'A':'B'}</div>}
    {pickField&&<div className="pin-prompt" role="status"><span>{t(pickField==='origin'?'pickOrigin':'pickDestination')}</span><button onClick={()=>setPickField(null)}>{t('cancel')}</button></div>}
    <section className="map-search-sheet" aria-label={t('directions')}><h1>{t('whereNext')}</h1>
      {collapsed && hasRoute ? <div className="collapsed-route"><p><strong>{origin?.name}</strong><br/>{destination?.name}</p><button onClick={() => setCollapsed(false)}>{t('edit')}</button></div> : <>
        <div className="route-fields">
          <div className="place-input-row"><PinButton {...pinProps('origin')}/><label className="sr-only" htmlFor="map-origin">{t('origin')}</label><input id="map-origin" autoComplete="off" value={originText} placeholder={t('originPlaceholder')} disabled={busy} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();void search('origin');}}} onChange={event=>{invalidate();setOrigin(null);setOriginText(event.target.value);}}/><button className="icon-button" aria-label={t('searchOrigin')} disabled={busy} onClick={()=>void search('origin')}><Icon name="search" size={18}/></button></div>
          <div className="place-input-row destination-row"><PinButton {...pinProps('destination')}/><DestinationInput value={destinationText} disabled={busy} onChange={value=>{invalidate();setDestination(null);setDestinationText(value);}} onSearch={()=>void search('destination')} onChoose={place=>choose(place,'destination')}/></div>
        </div>
        <div className="place-search-actions"><button disabled={busy} onClick={locate}><Icon name="locate" size={16}/>{t('myLocation')}</button><button disabled={busy} onClick={() => { invalidate(); setOrigin(destination); setDestination(origin); setOriginText(destinationText); setDestinationText(originText); }}><Icon name="swap" size={16}/>{t('swap')}</button></div>
      </>}
      {results.length>0&&<ul className="place-results" aria-label={t(searchingFor==='origin'?'originResults':'destinationResults')}>{results.map(place=><li key={place.id}><button onClick={()=>choose(place)}><span>{place.name}</span><small>{place.address}</small></button></li>)}</ul>}
      <div className="transport-tabs" aria-label={t('transport')}>{modes.map(item=><button key={item.id} disabled={busy} aria-pressed={mode===item.id} onClick={()=>{setMode(item.id);setRoad(null);setJourney(null);setError('');if(origin&&destination)void plan(item.id);}}><Icon name={item.icon}/>{t(item.text)}</button>)}</div>
      {(!collapsed||!hasRoute||busy)&&<button className="primary wide map-submit" disabled={busy} onClick={()=>void plan()}>{busy?<><i className="spinner"/>{m(progress)}</>:t('findRoute')}</button>}
      {error&&<p className="map-error" role="alert">{m(error)}</p>}
      {!hasRoute&&!busy&&<p className="map-hint">{t('mapHint')}</p>}
    </section>
    {hasRoute&&<section className={`route-sheet ${expanded?'is-expanded':''}`} aria-label={t('journey')}><div className="route-summary"><strong>{road?metersText(road.meters):t('estimatedMinutes',{n:Math.max(1,Math.round(journey!.seconds/60))})}</strong><span>{road?t('minutes',{n:Math.max(1,Math.round(road.seconds/60))}):<>{metersText(journey!.meters)}<br/>{t('transfers',{lines:journey!.boardings,changes:Math.max(0,journey!.boardings-1)})}</>}</span></div>
      <p className="route-description">{t(road?'roadSummary':journey!.optimality==='model'?'fastestEstimate':'bestChecked')}{journey&&<><br/>{t('timeEstimateNotice')}</>}</p>
      {road&&<details onToggle={event=>setExpanded(event.currentTarget.open)}><summary>{t('routeSteps')}</summary><ol className="road-instructions">{road.instructions.map((instruction,i)=><li key={i}>{maneuverText(instruction,locale)}{instruction.meters>0&&<small> ({metersText(instruction.meters)})</small>}</li>)}</ol></details>}
      {journey&&<><div className="route-line-chips">{journey.legs.filter(leg=>leg.line).map((leg,i)=><span className={`line-code ${leg.kind}`} key={i}>{t(leg.kind==='metro'?'metroLine':'busLine',{code:leg.line!.code})}</span>)}</div><button className="journey-expand" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{t(expanded?'collapseJourney':'expandJourney')}</button>{expanded&&<TransitSteps journey={journey} displayPlace={displayPlace}/>}</>}
      <p className="route-footnote">{road?t('roadFootnote'):t('transitFootnote',{date:new Intl.DateTimeFormat(locale,{dateStyle:'medium'}).format(new Date(journey!.updatedAt))})}</p>
    </section>}
  </section>;
}
