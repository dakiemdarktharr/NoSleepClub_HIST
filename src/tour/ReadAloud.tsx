import { useEffect, useRef, useState } from 'react';
import type { GuideLanguage } from './content';
import { useLocale } from '../i18n';
import { tourText } from './copy';
export default function ReadAloud({ text, language, active }: { text: string; language: GuideLanguage; active: boolean }) {
  const { locale } = useLocale(), [playing, setPlaying] = useState(false), [unavailable, setUnavailable] = useState(false);
  const sequence = useRef(0), utterance = useRef<SpeechSynthesisUtterance | null>(null);
  function stop() { sequence.current++; if ('speechSynthesis' in window) speechSynthesis.cancel(); utterance.current = null; setPlaying(false); }
  useEffect(() => {
    stop(); setUnavailable(false);
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { sequence.current++; if ('speechSynthesis' in window) speechSynthesis.cancel(); document.removeEventListener('visibilitychange', hidden); };
  }, [text, language, active]);
  function play() {
    if (playing) { stop(); return; }
    if (!active || !('speechSynthesis' in window)) { setUnavailable(true); return; }
    const voices = speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().split(/[-_]/)[0] === language);
    const voice = voices.find(voice => voice.localService) || voices[0];
    if (!voice) { setUnavailable(true); return; }
    stop(); setUnavailable(false); setPlaying(true); const current = sequence.current;
    const sentences = text.match(/[^.!?。！？]+[.!?。！？]*/g) || [text];
    // Short queued utterances avoid long-utterance stalls on mobile engines.
    const chunks = sentences.flatMap(sentence => sentence.match(/.{1,220}(?:\s|$)|.{1,220}/g) || []);
    const next = (index: number) => {
      if (current !== sequence.current) return;
      if (index >= chunks.length) { setPlaying(false); utterance.current = null; return; }
      const item = new SpeechSynthesisUtterance(chunks[index]); utterance.current = item;
      item.voice = voice; item.lang = language === 'vi' ? 'vi-VN' : 'en-US'; item.rate = .94;
      item.onend = () => next(index + 1);
      item.onerror = () => { if (current === sequence.current) { setPlaying(false); setUnavailable(true); } };
      try { speechSynthesis.speak(item); } catch { setPlaying(false); setUnavailable(true); }
    };
    next(0);
  }
  return <div className="tour-audio"><button className="secondary" onClick={play} aria-pressed={playing}><span aria-hidden="true">{playing ? '■' : '▶'}</span>{tourText(locale, playing ? 'stopAudio' : 'listen')}</button><small>{tourText(locale, 'audioNote')}</small>{unavailable && <p role="status">{tourText(locale, 'noVoice')}</p>}</div>;
}
