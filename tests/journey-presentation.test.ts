import { describe, expect, it } from 'vitest';
import { journeyPresentation } from '../src/maps/journeyPresentation';
import { swipeDestination } from '../src/ui/useViewSwipe';
import type { Journey, JourneyLeg, Place } from '../src/maps/types';
const stop = (id: string): Place => ({ id, name: id, lat: 10.78, lon: 106.7 });
const ride = (code: string, from: string, to: string, kind: 'bus' | 'metro' = 'bus'): JourneyLeg => ({ kind, from: stop(from), to: stop(to), meters: 1000, seconds: 300, coordinates: [], line: { id: code + ':out', code, name: code, headsign: 'Terminus ' + code, kind, stops: [from, to], shape: [] } });
const walk = (from: string, to: string, meters: number): JourneyLeg => ({ kind: 'walk', from: stop(from), to: stop(to), meters, seconds: meters, coordinates: [] });
const journey = (legs: JourneyLeg[]): Journey => ({ legs, meters: 0, seconds: 0, boardings: legs.filter(l => l.line).length, updatedAt: '2026-11-01' });
describe('readable transfer presentation', () => {
  it('gives each service a different track/chip colour and retains both stop names', () => {
    const first = ride('56', 'Origin', 'Alight here'), next = ride('08', 'Board across road', 'Destination');
    const result = journeyPresentation(journey([first, walk('Alight here', 'Board across road', 240), next]));
    expect(result.styles.get(first)?.color).not.toBe(result.styles.get(next)?.color);
    expect(result.transfers[0]).toMatchObject({ number: 1, walkMeters: 240, sameStop: false, fromStyle: { number: 1 }, toStyle: { number: 2 } });
    expect(result.transfers[0].from.to.name).toBe('Alight here'); expect(result.transfers[0].to.from.name).toBe('Board across road');
  });
  it('distinguishes a same-stop change from a walking transfer', () => {
    const result = journeyPresentation(journey([ride('01', 'A', 'B'), ride('02', 'B', 'C')]));
    expect(result.transfers[0]).toMatchObject({ sameStop: true, walkMeters: 0 });
  });
  it('preserves one service colour on return while numbering all three legs', () => {
    const a = ride('01', 'A', 'B'), b = ride('1', 'B', 'C', 'metro'), c = ride('01', 'C', 'D');
    const result = journeyPresentation(journey([a, b, c]));
    expect(result.styles.get(a)?.color).toBe(result.styles.get(c)?.color);
    expect(result.styles.get(b)?.color).not.toBe(result.styles.get(a)?.color);
    expect(result.rides.map(l => result.styles.get(l)?.number)).toEqual([1, 2, 3]); expect(result.transfers).toHaveLength(2);
  });
  it('does not invent a transfer for direct service or alter the original journey', () => {
    const original = journey([walk('A', 'B', 100), ride('01', 'B', 'C')]), before = JSON.stringify(original);
    expect(journeyPresentation(original).transfers).toEqual([]); expect(JSON.stringify(original)).toBe(before);
  });
});
describe('view swipe intent', () => {
  it('requires a deliberate horizontal swipe and cancels short, vertical or slow drags', () => {
    expect(swipeDestination(-100, 10, 250)).toBe('maps'); expect(swipeDestination(100, -10, 250)).toBe('camera');
    expect(swipeDestination(30, 0, 200)).toBeNull(); expect(swipeDestination(80, 100, 200)).toBeNull(); expect(swipeDestination(100, 0, 1500)).toBeNull();
  });
});
