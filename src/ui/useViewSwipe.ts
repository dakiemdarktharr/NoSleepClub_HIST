import { useEffect, type RefObject } from 'react';
export type ViewTab = 'camera' | 'maps';
export function swipeDestination(dx: number, dy: number, milliseconds: number): ViewTab | null {
  return Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && milliseconds <= 1000 ? dx < 0 ? 'maps' : 'camera' : null;
}
export function useViewSwipe(root: RefObject<HTMLElement | null>, enabled: boolean, change: (tab: ViewTab) => void) {
  useEffect(() => {
    const element = root.current; if (!enabled || !element) return;
    let start: { id: number; x: number; y: number; at: number } | null = null;
    const begin = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.touches.length !== 1 || !target || target.closest('button,input,textarea,select,a,summary,[role=dialog]') || (!target.closest('[data-swipe-zone]') && !target.closest('.camera-panel'))) { start = null; return; }
      const touch = event.touches[0]; start = { id: touch.identifier, x: touch.clientX, y: touch.clientY, at: performance.now() };
    };
    const move = (event: TouchEvent) => {
      if (!start) return;
      if (event.touches.length !== 1) { start = null; return; }
      const touch = event.touches[0], dx = touch.clientX - start.x, dy = touch.clientY - start.y;
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { start = null; return; }
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.6 && event.cancelable) event.preventDefault();
    };
    const end = (event: TouchEvent) => {
      const origin = start; start = null; if (!origin) return;
      const touch = Array.from(event.changedTouches).find(t => t.identifier === origin.id); if (!touch) return;
      const next = swipeDestination(touch.clientX - origin.x, touch.clientY - origin.y, performance.now() - origin.at);
      if (next) { if (event.cancelable) event.preventDefault(); change(next); }
    };
    const cancel = () => { start = null; };
    element.addEventListener('touchstart', begin, { passive: true }); element.addEventListener('touchmove', move, { passive: false }); element.addEventListener('touchend', end, { passive: false }); element.addEventListener('touchcancel', cancel);
    return () => { element.removeEventListener('touchstart', begin); element.removeEventListener('touchmove', move); element.removeEventListener('touchend', end); element.removeEventListener('touchcancel', cancel); };
  }, [root, enabled, change]);
}
