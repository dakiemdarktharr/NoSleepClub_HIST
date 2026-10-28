// One-off refresh of public HCMC bus route/stop data. Resume-safe; at most 1 request/s.
import fs from 'node:fs/promises';
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
const routes = await get('/businfo/getallroute');
const stops = new Map(), lines = [], failures = [];
for (let i = 0; i < routes.length; i++) {
  const route = routes[i];
  try {
    const variants = await get('/businfo/getvarsbyroute/' + route.RouteId);
    for (const variant of variants) {
      const points = await get(`/businfo/getstopsbyvar/${route.RouteId}/${variant.RouteVarId}`);
      const usable = points.filter(point => Number.isFinite(point.Lat) && Number.isFinite(point.Lng) && point.Status === 'Đang khai thác');
      if (usable.length < 2) continue;
      const kind = /^MRT/i.test(route.RouteNo) ? 'metro' : 'bus';
      usable.forEach(point => stops.set('b' + point.StopId, { id: 'b' + point.StopId, name: point.Name, lat: point.Lat, lon: point.Lng, address: [point.AddressNo, point.Street].filter(Boolean).join(' '), kind: kind === 'metro' || stops.get('b' + point.StopId)?.kind === 'metro' ? 'metro' : 'bus' }));
      const path = await get(`/businfo/getpathsbyvar/${route.RouteId}/${variant.RouteVarId}`);
      const shape = (path.lat || []).map((lat, index) => [Number(lat.toFixed(6)), Number(path.lng[index].toFixed(6))]).filter((p, index, all) => !index || p[0] !== all[index - 1][0] || p[1] !== all[index - 1][1]);
      lines.push({ id: `b${route.RouteId}-${variant.RouteVarId}`, code: kind === 'metro' ? route.RouteNo.replace(/^MRT/i, '') : route.RouteNo, name: route.RouteName, headsign: variant.EndStop, kind, stops: usable.map(point => 'b' + point.StopId), shape });
    }
  } catch (error) { failures.push({ route: route.RouteNo, error: error.message }); }
  if ((i + 1) % 10 === 0 || i === routes.length - 1) console.log(JSON.stringify({ completed: i + 1, total: routes.length, directions: lines.length, stops: stops.size, failures: failures.length }));
}
const data = { updatedAt: new Date(oldestSource).toISOString(), sources: [{ name: 'Trung tâm Quản lý Giao thông công cộng TP.HCM / EBMS', url: base + '/businfo/getallroute' }], stops: [...stops.values()], lines, failures };
await fs.writeFile(new URL('../public/data/hcm-transit.json', import.meta.url), JSON.stringify(data));
console.log(JSON.stringify({ complete: true, directions: lines.length, stops: stops.size, failures }));
