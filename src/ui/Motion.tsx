import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { animate, hover, press, stagger } from 'motion';
import { CloudDragon } from './Ornament';
import { useLocale } from '../i18n';
export function useButtonMotion(dependency: unknown) {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const targets = [...document.querySelectorAll<HTMLButtonElement>('button')];
    const clearHover = hover(targets, element => {
      if ((element as HTMLButtonElement).disabled) return;
      animate(element, { scale: 1.012 }, { duration: .28, ease: 'easeInOut' });
      return () => { animate(element, { scale: 1 }, { duration: .32, ease: 'easeInOut' }); };
    });
    const clearPress = press(targets, element => {
      if ((element as HTMLButtonElement).disabled) return;
      animate(element, { scale: .985 }, { duration: .22, ease: 'easeOut' });
      return () => { animate(element, { scale: 1 }, { duration: .32, ease: 'easeOut' }); };
    });
    return () => { clearHover(); clearPress(); };
  }, [dependency]);
}
export function ChangingTitle() {
  const { t, locale } = useLocale();
  const words = [t('city'), t('cholon'), t('benThanh')];
  const [text, setText] = useState(words[0]);
  const ref = useRef<HTMLSpanElement>(null);
  const [sizes, setSizes] = useState<[number, number]>([48, 48]);
  useEffect(() => {
    setText(words[0]);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const glyphs = words.map(word => Array.from(word)); let word = 0, letters = glyphs[0].length, deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (deleting) { letters--; setText(glyphs[word].slice(0, letters).join('')); if (!letters) { deleting = false; word = (word + 1) % words.length; } }
      else { letters++; setText(glyphs[word].slice(0, letters).join('')); if (letters === glyphs[word].length) { deleting = true; timer = setTimeout(tick, 5000); return; } }
      timer = setTimeout(tick, deleting ? 100 : 165);
    };
    timer = setTimeout(tick, 5200); return () => clearTimeout(timer);
  }, [locale]);
  useEffect(() => {
    const element = ref.current; if (!element) return;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      const style = getComputedStyle(element), context = document.createElement('canvas').getContext('2d')!;
      context.font = `700 100px ${style.fontFamily}`;
      const available = element.clientWidth * .96;
      const fit = (items: string[]) => Math.min(innerWidth <= 760 ? 90 : 136, available / Math.max(...items.map(item => context.measureText(item.toLocaleUpperCase()).width)) * 100);
      setSizes([fit([t('titleLead')]), fit(words)]);
    };
    const observer = new ResizeObserver(measure); observer.observe(element); measure();
    void document.fonts.ready.then(measure); document.fonts.addEventListener('loadingdone', measure);
    return () => { alive = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone', measure); };
  }, [locale]);
  return <><span className="sr-only">{t('titleLead')} {t('city')}</span><span ref={ref} className="title-lines" aria-hidden="true"><span className="title-first-line" style={{fontSize: sizes[0]}}>{t('titleLead')}</span><span className="typewriter-word" style={{fontSize: sizes[1]}}>{text}<span className="typewriter-caret"/></span></span></>;
}
export function useCurtain() {
  const iris = useRef<HTMLDivElement>(null), wipes = useRef<HTMLDivElement>(null);
  const [transitioning, setTransitioning] = useState(false);
  const locked = useRef(false);
  async function transition(kind: 'iris' | 'wipe', covered: () => Promise<void> | void, event?: MouseEvent) {
    if (locked.current) return;
    locked.current = true; setTransitioning(true);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      if (reduce) { await covered(); return; }
      if (kind === 'iris' && iris.current) {
        const x = event?.detail ? event.clientX : innerWidth / 2, y = event?.detail ? event.clientY : innerHeight / 2;
        const radius = Math.hypot(innerWidth, innerHeight);
        iris.current.style.visibility = 'visible'; iris.current.style.opacity = '1';
        await animate(iris.current, { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: .72, ease: [.45, 0, .55, 1] });
        await covered();
        await animate(iris.current, { opacity: [1, 0] }, { duration: .48, ease: 'easeInOut' });
        iris.current.style.visibility = 'hidden';
      } else if (wipes.current) {
        const panels = [...wipes.current.children]; wipes.current.style.visibility = 'visible';
        await animate(panels, { scaleY: [0, 1] }, { duration: .48, delay: stagger(.065), ease: [.45, 0, .55, 1] });
        await covered();
        await animate(panels, { scaleY: [1, 0] }, { duration: .48, delay: stagger(.055), ease: [.45, 0, .55, 1] });
        wipes.current.style.visibility = 'hidden';
      }
    } finally { locked.current = false; setTransitioning(false); }
  }
  const curtains: ReactNode = <div aria-hidden="true"><div className="iris-curtain" ref={iris}><CloudDragon/><span>HIST</span></div><div className="wipe-curtain" ref={wipes}>{Array.from({ length: 5 }, (_, i) => <i key={i}/>)}</div></div>;
  return { transition, transitioning, curtains };
}
