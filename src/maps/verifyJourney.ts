import { distance } from './geo';
import { TRANSIT_ASSUMPTIONS, walkingKey } from './transit';
import type { Journey, JourneyLeg, Place, RoadRoute, TransitSearchOptions } from './types';

type Search = (options: TransitSearchOptions) => Promise<Journey | null>;
type WalkRoute = (from: Place, to: Place) => Promise<RoadRoute>;
const totalSeconds = (legs: JourneyLeg[]) => legs.reduce((sum, leg) => sum + leg.seconds + (leg.waitSeconds || 0) + (leg.accessSeconds || 0), 0);

/** Lazy lower-bound search: verify walking costs, then search again, including competing paths.
 * A settled result minimizes the time model within the graph constraints, not real-world arrival time.
 * A bounded search returns its best fully verified candidate with a weaker, explicit label.
 */
export async function verifyJourney(search: Search, routeWalk: WalkRoute, origin: Place, destination: Place, progress: (index: number, count: number) => void = () => {}, maxChecks = 24): Promise<Journey> {
  const blocked: string[] = [], walking: NonNullable<TransitSearchOptions['walking']> = {}, roads = new Map<string, RoadRoute>();
  let best: Journey | undefined, checks = 0;
  for (let iteration = 0; iteration < 32; iteration++) {
    const candidate = await search({ blocked, walking });
    if (!candidate) { if (best) return { ...best, optimality: 'model' }; throw new Error('Chưa tìm thấy tuyến phù hợp trong dữ liệu hiện có: tối đa 2 lần chuyển, trạm cách mỗi đầu không quá 1 km.'); }
    if (best && candidate.seconds >= best.seconds - .01) return { ...best, optimality: 'model' };
    const legs = candidate.legs.filter(leg => leg.kind === 'walk'); let invalid = false;
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i], key = walkingKey(leg.from, leg.to);
      if (!roads.has(key)) {
        if (checks >= maxChecks) { if (best) return { ...best, optimality: 'checked' }; throw new Error('Chưa xác minh được lối đi bộ tới trạm. Hãy thử điểm đi/đến gần trạm hơn.'); }
        progress(i + 1, legs.length); checks++;
        let road: RoadRoute;
        try { road = await routeWalk(leg.from, leg.to); }
        catch (error) { if (best) return { ...best, optimality: 'checked' }; throw error; }
        // Preserve the admissible lower bound even when the provider snaps endpoints onto a road.
        const meters = Math.max(road.meters, distance(leg.from, leg.to));
        const seconds = Math.max(road.seconds, meters / TRANSIT_ASSUMPTIONS.walkMetersPerSecond);
        const max = leg.from.id === origin.id || leg.to.id === destination.id ? 1400 : 650;
        if (meters > max) { blocked.push(key); invalid = true; break; }
        roads.set(key, { ...road, meters, seconds }); walking[key] = { meters, seconds };
      }
      const road = roads.get(key)!;
      Object.assign(leg, { coordinates: road.coordinates, meters: road.meters, seconds: road.seconds, instructions: road.instructions });
    }
    if (invalid) continue;
    if (legs.reduce((sum, leg) => sum + leg.meters, 0) > TRANSIT_ASSUMPTIONS.maxWalkMeters) continue;
    candidate.meters = candidate.legs.reduce((sum, leg) => sum + leg.meters, 0);
    candidate.seconds = totalSeconds(candidate.legs);
    if (!best || candidate.seconds < best.seconds) best = candidate;
    // Do not accept the first feasible route: road detours can make a competing line faster.
  }
  if (best) return { ...best, optimality: 'checked' };
  throw new Error('Chưa xác minh được lối đi bộ tới trạm. Hãy thử điểm đi/đến gần trạm hơn.');
}
