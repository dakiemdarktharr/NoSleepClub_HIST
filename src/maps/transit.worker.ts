import { TransitPlanner } from './transit';
import type { Place, TransitNetwork, TransitSearchOptions } from './types';
let planner: Promise<TransitPlanner> | undefined;
self.onmessage = async ({ data }: MessageEvent<{ id: number; origin: Place; destination: Place; options?: TransitSearchOptions }>) => {
  try {
    planner ??= fetch('/data/hcm-transit.json').then(async response => { if (!response.ok) throw new Error('Chưa tải được dữ liệu tuyến.'); return new TransitPlanner(await response.json() as TransitNetwork); }).catch(error => { planner = undefined; throw error; });
    const ready = await planner;
    self.postMessage({ id: data.id, journey: ready.find(data.origin, data.destination, data.options) });
  } catch { self.postMessage({ id: data.id, error: 'Chưa tải được dữ liệu tuyến. Vui lòng thử lại.' }); }
};
