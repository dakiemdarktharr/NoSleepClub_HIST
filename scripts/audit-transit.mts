import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { TransitPlanner } from '../src/maps/transit';
import { LANDMARKS, landmarkPlace } from '../src/maps/landmarks';
import type { Place, TransitNetwork } from '../src/maps/types';

// Reproducible graph audit; street verification and current service operation are separate checks.
const network = JSON.parse(await fs.readFile(new URL('../public/data/hcm-transit.json', import.meta.url), 'utf8')) as TransitNetwork;
const start = performance.now(), planner = new TransitPlanner(network);
const initializationMs = Math.round(performance.now() - start);
const stops = new Map(network.stops.map(stop => [stop.id, stop]));
const metro = network.lines.find(line => line.kind === 'metro' && line.headsign.includes('Suối Tiên'))!;
const stations = metro.stops.map(id => stops.get(id)!);
const pairs: [Place, Place][] = LANDMARKS.flatMap(from => LANDMARKS.filter(to => to !== from).map(to => [landmarkPlace(from, 'vi'), landmarkPlace(to, 'vi')] as [Place, Place]));
pairs.push(...stations.slice(1).flatMap(stop => [[stations[0], stop], [stop, stations[0]]] as [Place, Place][]));
pairs.push(...network.stops.filter(stop => /Tân Sơn Nhất|Chợ Lớn|Bến xe Miền Tây/.test(stop.name)).slice(0, 5).map(stop => [stop, stations.at(-1)!] as [Place, Place]));
const cases = pairs.map(([from, to]) => {
  const start = performance.now(), result = planner.find(from, to);
  assert(result, `No graph path: ${from.name} -> ${to.name}`);
  assert(result.boardings >= 1 && result.boardings <= 3);
  assert(result.seconds > 0 && Number.isFinite(result.seconds));
  assert(result.legs.filter(leg => leg.kind === 'walk').reduce((sum, leg) => sum + leg.meters, 0) <= 2400);
  const rides = result.legs.filter(leg => leg.line);
  assert.equal(result.boardings, rides.length);
  for (const leg of rides) {
    assert(leg.boardIndex! < leg.alightIndex! && leg.stopCount! > 0);
    assert.equal(leg.line!.stops[leg.boardIndex!], leg.from.id);
    assert.equal(leg.line!.stops[leg.alightIndex!], leg.to.id);
    assert.equal(leg.stopCount, leg.alightIndex! - leg.boardIndex!);
    assert(leg.line!.code && leg.line!.headsign && leg.from.name && leg.to.name);
  }
  return { from: from.name, to: to.name, milliseconds: Math.round(performance.now() - start), estimatedMinutes: Math.round(result.seconds / 60), rides: rides.map(leg => ({ code: leg.line!.code, kind: leg.kind, from: leg.from.name, to: leg.to.name, direction: leg.line!.headsign, stops: leg.stopCount })) };
});
const summary = { cases: cases.length, found: cases.length, initializationMs, maximumSearchMs: Math.max(...cases.map(c => c.milliseconds)), direct: cases.filter(c => c.rides.length === 1).length, oneTransfer: cases.filter(c => c.rides.length === 2).length, twoTransfers: cases.filter(c => c.rides.length === 3).length, metro: cases.filter(c => c.rides.some(r => r.kind === 'metro')).length, mixed: cases.filter(c => c.rides.some(r => r.kind === 'metro') && c.rides.some(r => r.kind === 'bus')).length, stops: network.stops.length, directions: network.lines.length, runningTimes: network.lines.filter(l => l.runningMinutes).length, headways: network.lines.filter(l => l.headwayMinutes).length };
if (process.argv.includes('--write')) { await fs.mkdir('.tmp', { recursive: true }); await fs.writeFile('.tmp/transit-audit.json', JSON.stringify({ summary, cases }, null, 2)); }
console.log(JSON.stringify(summary, null, 2));
