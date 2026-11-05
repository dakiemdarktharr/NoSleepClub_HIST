import { TOUR_ID, TOUR_SITES, siteById, type GuideLanguage } from './content';
export const TOUR_STORAGE = 'nep-pho-tour-v1';
export type TourState = { tourId: typeof TOUR_ID; phase: 'overview' | 'active' | 'paused' | 'complete'; current: string; completed: string[]; language: GuideLanguage };
export const initialTour = (language: GuideLanguage = 'en'): TourState => ({ tourId: TOUR_ID, phase: 'overview', current: TOUR_SITES[0].id, completed: [], language });
export type TourAction = { type: 'start' | 'pause' | 'finish' | 'restart' | 'completeStop' } | { type: 'open'; siteId: string } | { type: 'language'; language: GuideLanguage };
export function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case 'language': return { ...state, language: action.language };
    case 'restart': return initialTour(state.language);
    case 'start': return { ...state, phase: 'active' };
    case 'pause': return state.phase === 'active' ? { ...state, phase: 'paused' } : state;
    case 'finish': return { ...state, phase: 'complete' };
    case 'open': return siteById(action.siteId) ? { ...state, current: action.siteId, phase: 'active' } : state;
    case 'completeStop': {
      if (state.phase !== 'active') return state;
      const completed = [...new Set([...state.completed, state.current])];
      const next = TOUR_SITES.find(site => !completed.includes(site.id));
      return { ...state, completed, current: next?.id || state.current, phase: next ? 'active' : 'complete' };
    }
  }
}
export function parseTour(raw: string | null, language: GuideLanguage = 'en'): TourState {
  try {
    const data = JSON.parse(raw || 'null');
    if (!data || data.tourId !== TOUR_ID || !['overview', 'active', 'paused', 'complete'].includes(data.phase) || !siteById(data.current) || !Array.isArray(data.completed) || !data.completed.every((id: unknown) => typeof id === 'string' && siteById(id)) || !['en','vi'].includes(data.language)) return initialTour(language);
    return { tourId: TOUR_ID, phase: data.phase, current: data.current, completed: [...new Set(data.completed as string[])], language: data.language };
  } catch { return initialTour(language); }
}
