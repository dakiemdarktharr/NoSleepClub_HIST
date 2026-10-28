import { coordinates, distance } from './geo';
import type { Journey, JourneyLeg, Place, TransitLine, TransitNetwork } from './types';
type State = { node: number; boards: number; walked: number; walking: boolean; ridden: boolean; cost: number; key: string };
type Edge = { from: Place; to: Place; kind: 'walk' | 'ride' | 'board' | 'alight'; meters: number; line?: TransitLine; boardIndex?: number; alightIndex?: number };
class MinHeap {
  private items: State[] = [];
  push(value: State) { let index = this.items.push(value) - 1; while (index > 0) { const parent = (index - 1) >> 1; if (this.items[parent].cost <= value.cost) break; this.items[index] = this.items[parent]; index = parent; } this.items[index] = value; }
  pop() { const result = this.items[0], last = this.items.pop(); if (!this.items.length || !last) return result; let index = 0; while (index * 2 + 1 < this.items.length) { let child = index * 2 + 1; if (child + 1 < this.items.length && this.items[child + 1].cost < this.items[child].cost) child++; if (this.items[child].cost >= last.cost) break; this.items[index] = this.items[child]; index = child; } this.items[index] = last; return result; }
}
export const walkingKey = (from: Place, to: Place) => from.id + '>' + to.id;
export class TransitPlanner {
  private stops: Map<string, number>;
  private rides: { line: TransitLine; index: number }[] = [];
  private atStop: number[][];
  private grid = new Map<string, number[]>();
  constructor(private network: TransitNetwork) {
    this.stops = new Map(network.stops.map((stop, i) => [stop.id, i]));
    this.atStop = network.stops.map(() => []);
    for (const line of network.lines) for (let index = 0; index < line.stops.length; index++) {
      const stop = this.stops.get(line.stops[index]); if (stop === undefined) continue;
      this.atStop[stop].push(network.stops.length + this.rides.length); this.rides.push({ line, index });
    }
    network.stops.forEach((point, i) => { const key = this.cell(point); this.grid.set(key, [...(this.grid.get(key) || []), i]); });
  }
  private cell(point: Place) { return `${Math.floor(point.lon * 109000 / 250)},${Math.floor(point.lat * 111000 / 250)}`; }
  private nearby(point: Place) {
    const [x, y] = this.cell(point).split(',').map(Number), result: number[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) result.push(...(this.grid.get(`${x + dx},${y + dy}`) || []));
    return result.filter(index => distance(point, this.network.stops[index]) <= 240);
  }
  find(origin: Place, destination: Place, blocked: string[] = []): Journey | null {
    const forbidden = new Set(blocked), heap = new MinHeap(), best = new Map<string, number>(), previous = new Map<string, { key: string; edge: Edge }>();
    const count = this.network.stops.length;
    const nearest = (point: Place) => this.network.stops.map((stop, node) => ({ node, meters: distance(point, stop) })).filter(item => item.meters <= 1000).sort((a, b) => a.meters - b.meters).slice(0, 12);
    const ends = new Map(nearest(destination).map(item => [item.node, item.meters]));
    if (!ends.size) return null;
    const push = (state: Omit<State, 'key'>, parent: string, edge: Edge) => {
      if (state.walked > 2400 || forbidden.has(edge.kind === 'walk' ? walkingKey(edge.from, edge.to) : '')) return;
      const key = `${state.node}:${state.boards}:${+state.walking}:${+state.ridden}`;
      if (state.cost >= (best.get(key) ?? Infinity)) return;
      best.set(key, state.cost); previous.set(key, { key: parent, edge }); heap.push({ ...state, key });
    };
    for (const entry of nearest(origin)) { const to = this.network.stops[entry.node]; push({ node: entry.node, boards: 0, walked: entry.meters, walking: true, ridden: false, cost: entry.meters * 4 }, '', { from: origin, to, kind: 'walk', meters: entry.meters }); }
    let final: { state: State; meters: number; cost: number } | undefined;
    for (let current = heap.pop(); current; current = heap.pop()) {
      if (current.cost !== best.get(current.key)) continue;
      if (final && current.cost >= final.cost) break;
      if (current.node < count) {
        const stop = this.network.stops[current.node], remaining = ends.get(current.node);
        if (current.boards && remaining !== undefined && current.walked + remaining <= 2400 && !forbidden.has(walkingKey(stop, destination))) {
          const cost = current.cost + remaining * 4; if (!final || cost < final.cost) final = { state: current, meters: remaining, cost };
        }
        if (current.boards < 3) for (const node of this.atStop[current.node]) push({ ...current, node, boards: current.boards + 1, walking: false, ridden: false, cost: current.cost + 1200 }, current.key, { from: stop, to: stop, kind: 'board', meters: 0 });
        if (!current.walking && current.boards) for (const node of this.nearby(stop)) {
          if (node === current.node) continue;
          const to = this.network.stops[node], meters = distance(stop, to);
          push({ ...current, node, walking: true, walked: current.walked + meters, cost: current.cost + meters * 4 }, current.key, { from: stop, to, kind: 'walk', meters });
        }
      } else {
        const ride = this.rides[current.node - count], from = this.network.stops[this.stops.get(ride.line.stops[ride.index])!];
        if (current.ridden) push({ ...current, node: this.stops.get(from.id)!, walking: false, ridden: false }, current.key, { from, to: from, kind: 'alight', meters: 0 });
        const next = this.rides[current.node - count + 1];
        if (next?.line === ride.line && next.index === ride.index + 1) {
          const to = this.network.stops[this.stops.get(ride.line.stops[next.index])!], meters = distance(from, to);
          push({ ...current, node: current.node + 1, ridden: true, cost: current.cost + meters }, current.key, { from, to, kind: 'ride', meters, line: ride.line, boardIndex: ride.index, alightIndex: next.index });
        }
      }
    }
    if (!final) return null;
    const edges: Edge[] = [{ from: this.network.stops[final.state.node], to: destination, kind: 'walk', meters: final.meters }];
    let key = final.state.key;
    while (key) { const entry = previous.get(key); if (!entry) return null; edges.push(entry.edge); key = entry.key; }
    edges.reverse(); const legs: JourneyLeg[] = [];
    for (const edge of edges) {
      if (edge.kind === 'board' || edge.kind === 'alight') continue;
      const last = legs.at(-1);
      if (edge.kind === 'ride' && last?.line?.id === edge.line!.id && last.to.id === edge.from.id) { last.to = edge.to; last.alightIndex = edge.alightIndex; last.meters += edge.meters; last.stopCount!++; }
      else legs.push({ kind: edge.kind === 'walk' ? 'walk' : edge.line!.kind, from: edge.from, to: edge.to, meters: edge.meters, coordinates: [coordinates(edge.from), coordinates(edge.to)], ...(edge.line ? { line: edge.line, stopCount: 1, boardIndex: edge.boardIndex, alightIndex: edge.alightIndex } : {}) });
    }
    for (const leg of legs.filter(item => item.line)) {
      leg.coordinates = shapeBetween(leg.line!, leg.from, leg.to, leg.boardIndex!, leg.alightIndex!, this.network.stops, this.stops);
      leg.meters = leg.coordinates.slice(1).reduce((sum, point, i) => sum + distance({ lat: leg.coordinates[i][0], lon: leg.coordinates[i][1] }, { lat: point[0], lon: point[1] }), 0);
    }
    return { legs: legs.filter(item => item.meters > 2), meters: legs.reduce((sum, item) => sum + item.meters, 0), boardings: legs.filter(item => item.line).length, updatedAt: this.network.updatedAt };
  }
}
function shapeBetween(line: TransitLine, from: Place, to: Place, board: number, alight: number, stops: Place[], lookup: Map<string, number>): [number, number][] {
  if (line.shape.length < 2) return [coordinates(from), coordinates(to)];
  const closest = (point: Place, start: number) => {
    let winner = start, best = Infinity;
    for (let i = start; i < line.shape.length; i++) { const gap = distance(point, { lat: line.shape[i][0], lon: line.shape[i][1] }); if (gap < best) { best = gap; winner = i; } }
    return winner;
  };
  const indices: number[] = [];
  for (let i = 0; i <= alight; i++) indices.push(closest(stops[lookup.get(line.stops[i])!], indices.at(-1) || 0));
  const start = indices[board], end = indices[alight];
  return [coordinates(from), ...line.shape.slice(start, end + 1), coordinates(to)];
}
