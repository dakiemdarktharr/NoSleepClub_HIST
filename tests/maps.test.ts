import { describe, expect, it } from 'vitest';
import { TransitPlanner, walkingKey } from '../src/maps/transit';
import { decodePolyline, distance } from '../src/maps/geo';
import type { TransitNetwork, TransitStop, TransitLine } from '../src/maps/types';
const stop = (id: string, lon: number): TransitStop => ({ id, name: id, lat: 10.8, lon, kind: 'bus' });
const a = stop('A', 106.65), b = stop('B1', 106.68), transfer = stop('B2', 106.6803), c = stop('C', 106.71);
const line = (id: string, stops: TransitStop[]): TransitLine => ({ id, code: id, name: id, headsign: stops.at(-1)!.name, kind: 'bus', stops: stops.map(item => item.id), shape: stops.map(item => [item.lat, item.lon]) });
const network = (direct = false): TransitNetwork => ({ updatedAt: '2026-10-28T00:00:00Z', sources: [], stops: [a, b, transfer, c], lines: [line('01', [a, b]), line('02', [transfer, c]), ...(direct ? [line('03', [a, c])] : [])] });
describe('directed transit journey planning', () => {
  it('names the bus to board, exact alighting stop and bus after a transfer', () => {
    const result = new TransitPlanner(network()).find(a, c)!;
    expect(result.boardings).toBe(2);
    expect(result.legs.filter(item => item.line).map(item => [item.line!.code, item.from.id, item.to.id])).toEqual([['01', 'A', 'B1'], ['02', 'B2', 'C']]);
    expect(result.legs.some(item => item.kind === 'walk' && item.from.id === 'B1' && item.to.id === 'B2')).toBe(true);
  });
  it('does not invent the return direction of a one-way line', () => { expect(new TransitPlanner(network()).find(c, a)).toBeNull(); });
  it('prefers a direct line when distance is similar', () => { expect(new TransitPlanner(network(true)).find(a, c)!.boardings).toBe(1); });
  it('rejects transfers when road verification found no reasonable walking connection', () => { expect(new TransitPlanner(network()).find(a, c, [walkingKey(b, transfer)])).toBeNull(); });
  it('rejects places outside the available network rather than drawing a made-up route', () => { expect(new TransitPlanner(network()).find({ ...a, lat: 11.2 }, c)).toBeNull(); });
});
describe('road geometry', () => {
  it('decodes the published Google polyline reference correctly and refuses truncated input', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5)).toEqual([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
    expect(() => decodePolyline('_p~i')).toThrow();
    expect(distance(a, a)).toBe(0);
  });
});
