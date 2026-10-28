import { useEffect, useRef, useState } from 'react';
import { rpc } from '../client';
import Icon from '../ui/Icon';
import { useButtonMotion } from '../ui/Motion';
import { distance } from './geo';
import MapCanvas, { type MapHandle } from './MapCanvas';
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
export default function MapsPanel() {
  const {t,m,locale}=useLocale();
  const [pickField,setPickField]=useState<Field|null>(null),[drag,setDrag]=useState<{x:number;y:number;field:Field}|null>(null);
  const [origin, setOrigin] = useState<Place | null>(null), [destination, setDestination] = useState<Place | null>(null);
  const [originText, setOriginText] = useState(''), [destinationText, setDestinationText] = useState('');
  const [mode, setMode] = useState<TravelMode>('walk'), [busy, setBusy] = useState(false), [progress, setProgress] = useState('');
  const [error, setError] = useState(''), [results, setResults] = useState<Place[]>([]), [searchingFor, setSearchingFor] = useState<'origin' | 'destination'>('origin');
  const [road, setRoad] = useState<RoadRoute | null>(null), [journey, setJourney] = useState<Journey | null>(null), [collapsed, setCollapsed] = useState(false), [expanded, setExpanded] = useState(false);
  const map = useRef<MapHandle | null>(null), pinSequence = useRef(0);
  const points = useRef({ origin, destination }); points.current = { origin, destination };
  const worker = useRef<Worker | null>(null), sequence = useRef(0), generation = useRef(0), mounted = useRef(true);
  const pending = useRef(new Map<number, { resolve: (journey: Journey | null) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>());
  useButtonMotion(`${mode}:${collapsed}:${busy}:${results.length}:${!!road}:${!!journey}:${expanded}`);
  function displayPlace(point:Place):Place {
    const preset=LANDMARKS.find(item=>item.id===point.id);
    const pinned = point.id.startsWith('pin:') ? Object.values(points.current).find(value => value?.id === point.id) : null;
    return preset ? landmarkPlace(preset, locale) : pinned || (point.id==='current'?{...point,name:t('myLocation')}:point);
  }
  useEffect(()=>{
    if(origin){const next=displayPlace(origin);if(next.name!==origin.name){setOrigin(next);if(originText===origin.name)setOriginText(next.name);}}
    if(destination){const next=displayPlace(destination);if(next.name!==destination.name){setDestination(next);if(destinationText===destination.name)setDestinationText(next.name);}}
  },[locale]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; worker.current?.terminate(); pending.current.forEach(item => { clearTimeout(item.timer); item.reject(new Error('Đã đóng bản đồ.')); }); pending.current.clear(); };
  }, []);
  function pinAt(lat: number, lon: number, field: Field) {
    const coordinate = lat.toFixed(6) + ', ' + lon.toFixed(6);
    const point: Place = { id: `pin:${field}:${++pinSequence.current}`, name: coordinate, address: coordinate, lat, lon, addressStatus: 'pending' };
    if (!inside(point)) { setError('Bản đồ thử nghiệm hiện hỗ trợ khu vực TP.HCM.'); return; }
    choose(point, field); setPickField(null); setCollapsed(false);
    void rpc<{ address: string | null }>('maps.reverse', { point: { lat, lon } }).then(result => finish(result.address)).catch(() => finish(null));
    function finish(address: string | null) {
      if (!mounted.current) return;
      for (const activeField of ['origin', 'destination'] as const) {
        if (points.current[activeField]?.id !== point.id) continue;
        const next: Place = { ...point, name: address || coordinate, address: address || coordinate, addressStatus: address ? 'resolved' : 'unavailable' };
        points.current[activeField] = next;
        if (activeField === 'origin') { setOrigin(next); setOriginText(next.name); } else { setDestination(next); setDestinationText(next.name); }
      }
    }
  }
  function dropPin(x: number, y: number, field: Field) {
    const point = map.current?.unprojectScreen(x, y); if (point) pinAt(point.lat, point.lon, field);
  }
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
    points.current[field] = place;
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
    <MapCanvas ref={map} origin={origin} destination={destination} road={road} journey={journey} collapsed={collapsed} pickField={pickField} onPin={pinAt}/>
    <p className="sr-only" id="map-pin-help">{t('pinHelp')}</p>
    {drag&&<div className={`drag-pin ${drag.field}`} style={{left:drag.x,top:drag.y}} aria-hidden="true">{drag.field==='origin'?'A':'B'}</div>}
    {pickField&&<div className="pin-prompt" role="status"><span>{t(pickField==='origin'?'pickOrigin':'pickDestination')}</span><button onClick={()=>setPickField(null)}>{t('cancel')}</button></div>}
    <section className="map-search-sheet" aria-label={t('directions')}><h1>{t('whereNext')}</h1>
      {collapsed && hasRoute ? <div className="collapsed-route"><p><strong>{origin?.name}</strong><br/>{destination?.name}</p><button onClick={() => setCollapsed(false)}>{t('edit')}</button></div> : <>
        <div className="route-fields">
          <div className="place-input-row"><PinButton {...pinProps('origin')}/><label className="sr-only" htmlFor="map-origin">{t('origin')}</label><input id="map-origin" autoComplete="off" value={originText} placeholder={t('originPlaceholder')} disabled={busy} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();void search('origin');}}} onChange={event=>{invalidate();setOrigin(null);setOriginText(event.target.value);}}/><button className="icon-button" aria-label={t('searchOrigin')} disabled={busy} onClick={()=>void search('origin')}><Icon name="search" size={18}/></button></div>
          <div className="place-input-row destination-row"><PinButton {...pinProps('destination')}/><DestinationInput value={destinationText} disabled={busy} onChange={value=>{invalidate();setDestination(null);setDestinationText(value);}} onSearch={()=>void search('destination')} onChoose={place=>choose(place,'destination')}/></div>
        </div>
        {[origin,destination].some(point=>point?.addressStatus)&&<p className="pin-address-status" role="status">{t([origin,destination].some(point=>point?.addressStatus==='pending')?'findingAddress':[origin,destination].some(point=>point?.addressStatus==='unavailable')?'addressUnavailable':'nearPinnedAddress')}</p>}
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
