// One-off refresh of public HCMC bus route/stop data. Resume-safe; at most 1 request/s.
import fs from 'node:fs/promises';
import { serviceTiming, isCommuterLine } from '../src/maps/service.ts';
const base = 'https://apicms.ebms.vn';
const folder = new URL('../.tmp/transit/', import.meta.url);
await fs.mkdir(folder, { recursive: true });
await fs.mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
let last = 0;
let oldestSource = Date.now();
async function get(path) {
  const file = new URL(path.replace(/[^a-zA-Z0-9-]/g, '_') + '.json', folder);
  try { const saved = await fs.stat(file); if (Date.now() - saved.mtimeMs < 86400000) { const data = JSON.parse(await fs.readFile(file, 'utf8')); oldestSource = Math.min(oldestSource, saved.mtimeMs); return data; } } catch {}
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 1100 - (Date.now() - last))));
  last = Date.now();
  const response = await fetch(base + path, { headers: { 'User-Agent': 'NoSleepClub-HIST/0.2 (+https://github.com/dakiemdarktharr/NoSleepClub_HIST)' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const data = await response.json(); await fs.writeFile(file, JSON.stringify(data)); return data;
}
if (process.argv.includes('--service-only')) {
  const file = new URL('../public/data/hcm-transit.json', import.meta.url), data = JSON.parse(await fs.readFile(file, 'utf8'));
  data.lines = data.lines.filter(line => isCommuterLine(line.code));
  for (const routeId of new Set(data.lines.map(line => +line.id.match(/^b(\d+)-/)[1]))) {
    const variants = JSON.parse(await fs.readFile(new URL(`_businfo_getvarsbyroute_${routeId}.json`, folder), 'utf8'));
    const rows = await get('/businfo/gettimetablebyroute/' + routeId);
    for (const line of data.lines.filter(line => line.id.startsWith(`b${routeId}-`))) {
      const variant = variants.find(v => line.id === `b${routeId}-${v.RouteVarId}`);
      Object.assign(line, serviceTiming(rows, variant, routeId));
    }
  }
  const used = new Set(data.lines.flatMap(line => line.stops)); data.stops = data.stops.filter(stop => used.has(stop.id));
  data.sources = [...data.sources.filter(source => !source.url.includes('gettimetablebyroute')), { name: 'EBMS published running times and headway summaries', url: base + '/businfo/gettimetablebyroute/1' }];
  await fs.writeFile(file, JSON.stringify(data));
  console.log(JSON.stringify({ directions: data.lines.length, timed: data.lines.filter(line => line.runningMinutes).length, headways: data.lines.filter(line => line.headwayMinutes).length }));
  process.exit(0);
}
const routes = (await get('/businfo/getallroute')).filter(route => isCommuterLine(route.RouteNo));
const stops = new Map(), lines = [], failures = [];
for (let i = 0; i < routes.length; i++) {
  const route = routes[i];
  try {
    const variants = await get('/businfo/getvarsbyroute/' + route.RouteId);
    const summaries = await get('/businfo/gettimetablebyroute/' + route.RouteId);
    for (const variant of variants) {
      const points = await get(`/businfo/getstopsbyvar/${route.RouteId}/${variant.RouteVarId}`);
      const usable = points.filter(point => Number.isFinite(point.Lat) && Number.isFinite(point.Lng) && point.Status === 'Đang khai thác');
      if (usable.length < 2) continue;
      const kind = /^MRT/i.test(route.RouteNo) ? 'metro' : 'bus';
      usable.forEach(point => stops.set('b' + point.StopId, { id: 'b' + point.StopId, name: point.Name, lat: point.Lat, lon: point.Lng, address: [point.AddressNo, point.Street].filter(Boolean).join(' '), kind: kind === 'metro' || stops.get('b' + point.StopId)?.kind === 'metro' ? 'metro' : 'bus' }));
      const path = await get(`/businfo/getpathsbyvar/${route.RouteId}/${variant.RouteVarId}`);
      const shape = (path.lat || []).map((lat, index) => [Number(lat.toFixed(6)), Number(path.lng[index].toFixed(6))]).filter((p, index, all) => !index || p[0] !== all[index - 1][0] || p[1] !== all[index - 1][1]);
      lines.push({ id: `b${route.RouteId}-${variant.RouteVarId}`, code: kind === 'metro' ? route.RouteNo.replace(/^MRT/i, '') : route.RouteNo, name: route.RouteName, headsign: variant.EndStop, kind, stops: usable.map(point => 'b' + point.StopId), shape, ...serviceTiming(summaries, variant, route.RouteId) });
    }
  } catch (error) { failures.push({ route: route.RouteNo, error: error.message }); }
  if ((i + 1) % 10 === 0 || i === routes.length - 1) console.log(JSON.stringify({ completed: i + 1, total: routes.length, directions: lines.length, stops: stops.size, failures: failures.length }));
}
const data = { updatedAt: new Date(oldestSource).toISOString(), sources: [{ name: 'Trung tâm Quản lý Giao thông công cộng TP.HCM / EBMS', url: base + '/businfo/getallroute' }, { name: 'EBMS published running times and headway summaries', url: base + '/businfo/gettimetablebyroute/1' }], stops: [...stops.values()], lines, failures };
await fs.writeFile(new URL('../public/data/hcm-transit.json', import.meta.url), JSON.stringify(data));
console.log(JSON.stringify({ complete: true, directions: lines.length, stops: stops.size, failures }));
