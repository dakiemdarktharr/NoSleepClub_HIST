import { coordinates, distance } from './geo';
import type { Journey, JourneyLeg, Place, TransitLine, TransitNetwork, TransitSearchOptions, WalkingCost } from './types';

// Fallback assumptions, not live vehicle predictions. Published line times/headways override them.
export const TRANSIT_ASSUMPTIONS = { walkMetersPerSecond: 1.35, busMetersPerSecond: 5, metroMetersPerSecond: 11.11, busWaitSeconds: 450, metroWaitSeconds: 300, maxWalkMeters: 2400 } as const;
export const walkingKey = (from: Place, to: Place) => from.id + '>' + to.id;
export function boardingTime(line: TransitLine) {
  const headway = line.headwayMinutes;
  return {
    waitSeconds: headway ? (headway[0] + headway[1]) * 15 : line.kind === 'metro' ? TRANSIT_ASSUMPTIONS.metroWaitSeconds : TRANSIT_ASSUMPTIONS.busWaitSeconds,
    accessSeconds: line.kind === 'metro' ? 180 : 30,
  };
}
type Edge = { from: Place; to: Place; kind: 'walk' | 'ride' | 'board' | 'alight'; meters: number; seconds: number; line?: TransitLine; index?: number };
type State = { node: number; boards: number; walked: number; walking: boolean; ridden: boolean; cost: number; active: boolean; parent?: State; edge: Edge };
type Ride = { line: TransitLine; index: number; stop: number; meters: number; seconds: number; geometry: [number, number][]; published: boolean };
class MinHeap {
  private items: State[] = [];
  push(value: State) { let index = this.items.push(value) - 1; while (index > 0) { const parent = (index - 1) >> 1; if (this.items[parent].cost <= value.cost) break; this.items[index] = this.items[parent]; index = parent; } this.items[index] = value; }
  pop() { const result = this.items[0], last = this.items.pop(); if (!this.items.length || !last) return result; let index = 0; while (index * 2 + 1 < this.items.length) { let child = index * 2 + 1; if (child + 1 < this.items.length && this.items[child + 1].cost < this.items[child].cost) child++; if (this.items[child].cost >= last.cost) break; this.items[index] = this.items[child]; index = child; } this.items[index] = last; return result; }
}

export class TransitPlanner {
  private rides: Ride[] = [];
  private atStop: number[][];
  private grid = new Map<string, number[]>();
  constructor(private network: TransitNetwork) {
    const lookup = new Map(network.stops.map((stop, i) => [stop.id, i]));
    this.atStop = network.stops.map(() => []);
    for (const line of network.lines) {
      if (line.stops.some(id => !lookup.has(id))) continue;
      const geometry = lineGeometry(line, network.stops, lookup);
      const total = Math.max(1, geometry.reduce((sum, segment) => sum + segment.meters, 0));
      const published = Number.isFinite(line.runningMinutes) && line.runningMinutes! > 0;
      for (let index = 0; index < line.stops.length; index++) {
        const stop = lookup.get(line.stops[index])!, segment = geometry[index];
        this.atStop[stop].push(network.stops.length + this.rides.length);
        const meters = segment?.meters || 0;
        const seconds = published ? meters / total * line.runningMinutes! * 60 : meters / (line.kind === 'metro' ? TRANSIT_ASSUMPTIONS.metroMetersPerSecond : TRANSIT_ASSUMPTIONS.busMetersPerSecond);
        this.rides.push({ line, index, stop, meters, seconds, geometry: segment?.points || [], published });
      }
    }
    network.stops.forEach((point, i) => { const key = this.cell(point); this.grid.set(key, [...(this.grid.get(key) || []), i]); });
  }
  private cell(point: Place) { return `${Math.floor(point.lon * 109000 / 250)},${Math.floor(point.lat * 111000 / 250)}`; }
  private nearby(point: Place) {
    const [x, y] = this.cell(point).split(',').map(Number), result: number[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) result.push(...(this.grid.get(`${x + dx},${y + dy}`) || []));
    return result.filter(index => distance(point, this.network.stops[index]) <= 240);
  }
  find(origin: Place, destination: Place, options: TransitSearchOptions | string[] = {}): Journey | null {
    const { blocked = [], walking = {} } = Array.isArray(options) ? { blocked: options } : options;
    const forbidden = new Set(blocked), heap = new MinHeap(), labels = new Map<string, State[]>();
    const count = this.network.stops.length;
    // Include every nearby stop; a nearest-N cap can exclude a faster express/metro connection.
    const nearest = (point: Place) => this.network.stops.map((stop, node) => ({ node, meters: distance(point, stop) })).filter(item => item.meters <= 1000);
    const ends = new Set(nearest(destination).map(item => item.node));
    if (!ends.size) return null;
    const walk = (from: Place, to: Place): WalkingCost | null => {
      if (forbidden.has(walkingKey(from, to))) return null;
      if (walking[walkingKey(from, to)]) return walking[walkingKey(from, to)];
      const meters = distance(from, to);
      // Treat sub-two-metre endpoint differences as the same location, consistently in cost and output.
      return meters <= 2 ? { meters: 0, seconds: 0 } : { meters, seconds: meters / TRANSIT_ASSUMPTIONS.walkMetersPerSecond };
    };
    const push = (state: Omit<State, 'active'>) => {
      if (state.walked > TRANSIT_ASSUMPTIONS.maxWalkMeters) return;
      const key = `${state.node}:${state.boards}:${+state.walking}:${+state.ridden}`;
      const existing = labels.get(key) || [];
      // Keep time/walking Pareto labels: a cheap walk-heavy arrival must not erase a feasible one.
      if (existing.some(item => item.active && item.cost <= state.cost && item.walked <= state.walked)) return;
      const next: State = { ...state, active: true };
      for (const item of existing) if (item.cost >= state.cost && item.walked >= state.walked) item.active = false;
      labels.set(key, [...existing.filter(item => item.active), next]); heap.push(next);
    };
    for (const entry of nearest(origin)) {
      const to = this.network.stops[entry.node], route = walk(origin, to); if (!route || route.meters > 1400) continue;
      push({ node: entry.node, boards: 0, walked: route.meters, walking: true, ridden: false, cost: route.seconds, edge: { from: origin, to, kind: 'walk', ...route } });
    }
    let final: { state: State; edge: Edge; cost: number } | undefined;
    for (let current = heap.pop(); current; current = heap.pop()) {
      if (!current.active) continue;
      if (final && current.cost >= final.cost) break;
      if (current.node < count) {
        const stop = this.network.stops[current.node];
        if (current.boards && ends.has(current.node)) {
          const route = walk(stop, destination);
          if (route && route.meters <= 1400 && current.walked + route.meters <= TRANSIT_ASSUMPTIONS.maxWalkMeters) {
            const cost = current.cost + route.seconds;
            if (!final || cost < final.cost) final = { state: current, edge: { from: stop, to: destination, kind: 'walk', ...route }, cost };
          }
        }
        if (current.boards < 3) for (const node of this.atStop[current.node]) {
          const line = this.rides[node - count].line, timing = boardingTime(line), seconds = timing.waitSeconds + timing.accessSeconds;
          push({ ...current, node, boards: current.boards + 1, walking: false, ridden: false, cost: current.cost + seconds, parent: current, edge: { from: stop, to: stop, kind: 'board', meters: 0, seconds, line } });
        }
        if (!current.walking && current.boards) for (const node of this.nearby(stop)) {
          if (node === current.node) continue;
          const to = this.network.stops[node], route = walk(stop, to); if (!route || route.meters > 650) continue;
          push({ ...current, node, walking: true, walked: current.walked + route.meters, cost: current.cost + route.seconds, parent: current, edge: { from: stop, to, kind: 'walk', ...route } });
        }
      } else {
        const ride = this.rides[current.node - count], from = this.network.stops[ride.stop];
        if (current.ridden) push({ ...current, node: ride.stop, walking: false, ridden: false, parent: current, edge: { from, to: from, kind: 'alight', meters: 0, seconds: 0 } });
        const next = this.rides[current.node - count + 1];
        if (next?.line === ride.line && next.index === ride.index + 1) {
          const to = this.network.stops[next.stop];
          push({ ...current, node: current.node + 1, ridden: true, cost: current.cost + ride.seconds, parent: current, edge: { from, to, kind: 'ride', meters: ride.meters, seconds: ride.seconds, line: ride.line, index: current.node - count } });
        }
      }
    }
    if (!final) return null;
    const edges: Edge[] = [final.edge];
    for (let current: State | undefined = final.state; current; current = current.parent) edges.push(current.edge);
    edges.reverse(); const legs: JourneyLeg[] = []; let timing: ReturnType<typeof boardingTime> | undefined;
    for (const edge of edges) {
      if (edge.kind === 'board') { timing = boardingTime(edge.line!); continue; }
      if (edge.kind === 'alight') { timing = undefined; continue; }
      const last = legs.at(-1), ride = edge.index === undefined ? undefined : this.rides[edge.index];
      if (ride && last?.line?.id === ride.line.id && last.to.id === edge.from.id && !timing) {
        last.to = edge.to; last.alightIndex = ride.index + 1; last.meters += edge.meters; last.seconds += edge.seconds; last.stopCount!++; last.coordinates.push(...ride.geometry.slice(1));
      } else {
        legs.push({ kind: edge.kind === 'walk' ? 'walk' : edge.line!.kind, from: edge.from, to: edge.to, meters: edge.meters, seconds: edge.seconds, coordinates: ride ? [...ride.geometry] : [coordinates(edge.from), coordinates(edge.to)], ...(ride ? { line: ride.line, stopCount: 1, boardIndex: ride.index, alightIndex: ride.index + 1, ...timing, timingBasis: ride.published && ride.line.headwayMinutes ? 'published' : 'assumed' } : {}) });
      }
      if (ride) timing = undefined;
    }
    return { legs: legs.filter(item => item.kind !== 'walk' || item.meters > 2), meters: legs.reduce((sum, item) => sum + item.meters, 0), seconds: final.cost, boardings: final.state.boards, updatedAt: this.network.updatedAt };
  }
}

function lineGeometry(line: TransitLine, stops: Place[], lookup: Map<string, number>) {
  const indices: number[] = [];
  for (const id of line.stops) {
    const point = stops[lookup.get(id)!]; let winner = indices.at(-1) || 0, best = Infinity;
    for (let i = winner; i < line.shape.length; i++) {
      const gap = distance(point, { lat: line.shape[i][0], lon: line.shape[i][1] });
      if (gap < best) { best = gap; winner = i; }
    }
    indices.push(winner);
  }
  return line.stops.slice(0, -1).map((id, index) => {
    const from = stops[lookup.get(id)!], to = stops[lookup.get(line.stops[index + 1])!];
    const points = [coordinates(from), ...line.shape.slice(indices[index], indices[index + 1] + 1), coordinates(to)];
    const meters = points.slice(1).reduce((sum, point, i) => sum + distance({ lat: points[i][0], lon: points[i][1] }, { lat: point[0], lon: point[1] }), 0);
    return { points, meters };
  });
}
