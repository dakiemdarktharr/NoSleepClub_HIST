import type { Journey, JourneyLeg } from './types';

// Shared by map geometry, legend, stops and instructions; colour never carries meaning alone.
export const ROUTE_COLORS = ['#913f35', '#245c79', '#53652c'] as const;
export type RideStyle = { color: string; number: number };
export type Transfer = { number: number; from: JourneyLeg; to: JourneyLeg; fromStyle: RideStyle; toStyle: RideStyle; walkMeters: number; sameStop: boolean };
export function journeyPresentation(journey: Journey) {
  const colors = new Map<string, string>(), styles = new Map<JourneyLeg, RideStyle>(), rides: JourneyLeg[] = [], transfers: Transfer[] = [];
  let previousIndex = -1;
  journey.legs.forEach((leg, index) => {
    if (!leg.line) return;
    const key = `${leg.kind}:${leg.line.code}`;
    if (!colors.has(key)) colors.set(key, ROUTE_COLORS[colors.size % ROUTE_COLORS.length]);
    const style = { color: colors.get(key)!, number: rides.length + 1 }; styles.set(leg, style);
    const previous = rides.at(-1);
    if (previous) transfers.push({ number: transfers.length + 1, from: previous, to: leg, fromStyle: styles.get(previous)!, toStyle: style, sameStop: previous.to.id === leg.from.id,
      walkMeters: journey.legs.slice(previousIndex + 1, index).filter(item => item.kind === 'walk').reduce((sum, item) => sum + item.meters, 0) });
    rides.push(leg); previousIndex = index;
  });
  return { styles, rides, transfers };
}
