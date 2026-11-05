import { useEffect, useReducer, useRef, useState } from 'react';
import { parseTour, TOUR_STORAGE, tourReducer } from './state';
import type { GuideLanguage } from './content';
export function useTour(language: GuideLanguage) {
  const [persisted, setPersisted] = useState(true);
  const fresh = useRef(false);
  const [state, dispatch] = useReducer(tourReducer, language, value => {
    try { const raw = localStorage.getItem(TOUR_STORAGE); fresh.current = !raw; return parseTour(raw, value); } catch { fresh.current = true; return parseTour(null, value); }
  });
  useEffect(() => {
    try { localStorage.setItem(TOUR_STORAGE, JSON.stringify(state)); setPersisted(true); }
    catch { setPersisted(false); }
  }, [state]);
  return { state, dispatch, persisted, fresh: fresh.current };
}
