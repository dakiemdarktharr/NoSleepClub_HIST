type Summary = { RouteVarId?: number; IsCurrent?: boolean; RunningTime?: string; Headway?: string; OperationTime?: string; ApplyDates?: string };
function range(value: unknown): [number, number] | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return;
  const numbers = String(value).replace(/,/g, '.').match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!numbers?.length || numbers.some(n => n <= 0 || n > 600)) return;
  return [Math.min(...numbers), Math.max(...numbers)];
}
export function serviceTiming(rows: Summary[], variant: { RouteVarId: number; RunningTime?: number }, routeId: number) {
  const current = rows.filter(row => row.RouteVarId === variant.RouteVarId && row.IsCurrent === true);
  const headways = current.map(row => range(row.Headway)).filter((row): row is [number, number] => !!row);
  const times = current.map(row => range(row.RunningTime)).filter((row): row is [number, number] => !!row);
  const runningMinutes = Number.isFinite(variant.RunningTime) && variant.RunningTime! > 0 ? variant.RunningTime : times.length ? times.reduce((sum, r) => sum + (r[0] + r[1]) / 2, 0) / times.length : undefined;
  return {
    ...(runningMinutes ? { runningMinutes } : {}),
    ...(headways.length ? { headwayMinutes: [Math.min(...headways.map(r => r[0])), Math.max(...headways.map(r => r[1]))] as [number, number] } : {}),
    ...(current.length ? { serviceHours: [...new Set(current.map(row => row.OperationTime).filter(Boolean))].join(' / '), serviceDays: [...new Set(current.map(row => row.ApplyDates).filter(Boolean))].join(' / ') } : {}),
    timingSource: `https://apicms.ebms.vn/businfo/gettimetablebyroute/${routeId}`,
  };
}
// School-only, sightseeing and waterbus services do not belong in the regular bus/metro graph.
export const isCommuterLine = (code: string) => !/^(HS-|DL\d|SWB)/i.test(code);
