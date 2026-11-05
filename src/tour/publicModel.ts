import { currentModel } from '../fewshot';
import type { TrainedClassifier } from '../shared';
import { TOUR_SITES, siteById } from './content';
export const PUBLIC_REFERENCE_IDS = TOUR_SITES.map(site => 'published:' + site.id + ':2019');
export const PUBLIC_MODEL_URL = '/guide/reference-model-v1.json';
let pending: Promise<TrainedClassifier> | undefined;
export function publicReferenceModel(): Promise<TrainedClassifier> {
  if (!pending) pending = (async () => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(PUBLIC_MODEL_URL, { signal: controller.signal });
      if (!response.ok) throw new Error('Không kết nối được máy chủ.');
      const model = await response.json() as TrainedClassifier;
      if (!currentModel(model, PUBLIC_REFERENCE_IDS) || model.classes.length !== TOUR_SITES.length || model.classes.some(item => !siteById(item.label.replace(/^tour:/, '')) || !item.label.startsWith('tour:')) || model.supports.length > 24) throw new Error('Không đọc được bộ mẫu.');
      return model;
    } finally { clearTimeout(timer); }
  })().catch(error => { pending = undefined; throw error; });
  return pending;
}
