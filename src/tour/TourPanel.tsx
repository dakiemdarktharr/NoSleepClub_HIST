import { useEffect, useRef, useState, type Dispatch } from 'react';
import { useLocale } from '../i18n';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import { REVIEWED_AT, TOUR_SITES, siteById, type GuideLanguage, type TourSite } from './content';
import { tourText } from './copy';
import type { TourAction, TourState } from './state';
import ReadAloud from './ReadAloud';
export default function TourPanel({ state, dispatch, persisted, active, onMap, onCamera, onShare }: { state: TourState; dispatch: Dispatch<TourAction>; persisted: boolean; active: boolean; onMap: (site: TourSite) => void; onCamera: () => void; onShare: () => void }) {
  const { locale } = useLocale(), text = (key: Parameters<typeof tourText>[1]) => tourText(locale, key);
  const [restart, setRestart] = useState(false), scroller = useRef<HTMLDivElement>(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); addEventListener('online', update); addEventListener('offline', update); return () => { removeEventListener('online', update); removeEventListener('offline', update); }; }, []);
  const site = siteById(state.current)!, copy = site[state.language], index = TOUR_SITES.indexOf(site);
  const overview = state.phase === 'overview' || state.phase === 'paused', complete = state.phase === 'complete';
  useEffect(() => { scroller.current?.scrollTo({ top: 0, behavior: 'instant' }); }, [state.current, state.phase]);
  return <div className="tour-panel" ref={scroller}>
    <div className="tour-paper">
      {!online && <p className="tour-offline" role="status">{text('offline')}</p>}
      <div className="tour-edition"><span>{text('publicSet')}</span><span>{text('duration')}</span></div>
      <div className="tour-language"><label htmlFor="guide-language">{text('guideLanguage')}</label><select id="guide-language" value={state.language} onChange={event => dispatch({ type: 'language', language: event.target.value as GuideLanguage })}><option value="en">English</option><option value="vi">Tiếng Việt</option></select></div>
      {!['en','vi'].includes(locale) && <p className="tour-note">{text('contentNote')}</p>}
      {overview ? <>
        <h1>{text('title')}</h1><p className="tour-intro">{text('intro')}</p><p className="tour-scope">{text('walking')}</p>
        <img className="tour-cover" src={TOUR_SITES[0].image} width="960" height="640" alt={TOUR_SITES[0][state.language].name}/>
        <p className="tour-scope">{text('scope')}</p>
        <button className="primary tour-main-action" onClick={() => dispatch({ type: 'start' })}>{text(state.phase === 'paused' ? 'resume' : 'start')}<Icon name="chevron"/></button>
      </> : complete ? <>
        <p className="tour-kicker">{state.completed.length} / {TOUR_SITES.length} · {text('completed')}</p><h1>{text('summary')}</h1><p className="tour-intro">{text('summaryNote')}</p>
        <button className="primary tour-main-action" onClick={() => setRestart(true)}>{text('restart')}<Icon name="chevron"/></button>
      </> : <article className="tour-story" data-guide-language={state.language}>
        <p className="tour-kicker">{text('stop')} {index + 1} / {TOUR_SITES.length}</p><h1 lang={state.language}>{copy.name}</h1><p className="tour-subtitle" lang={state.language}>{copy.subtitle}</p>
        <figure><img className="tour-cover" src={site.image} alt={copy.name} width="960" height="640"/><figcaption>{text('credit')} · {site.photo.year} · {site.photo.author} · <a href={site.photo.url} target="_blank" rel="noreferrer">{site.photo.license}</a></figcaption></figure>
        <aside className="tour-look"><h2>{text('look')}</h2><p lang={state.language}>{copy.look}</p></aside>
        <ReadAloud text={copy.paragraphs.join(' ')} language={state.language} active={active}/>
        <div className="tour-prose" lang={state.language}>{copy.paragraphs.map((paragraph, i) => <p key={i}>{paragraph} <a className="fact-citation" href={site.sources[Math.min(i, site.sources.length - 1)].url} target="_blank" rel="noreferrer" aria-label={`${text('sources')} ${i + 1}`}>[{i + 1}]</a></p>)}</div>
        <details className="tour-sources"><summary>{text('sources')}</summary><p>{copy.access}</p><ul>{site.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul><p>{text('reviewed')}: <time dateTime={REVIEWED_AT}>{REVIEWED_AT}</time></p><p>{site.photo.author}, {site.photo.year} · <a href={site.photo.url} target="_blank" rel="noreferrer">Wikimedia Commons</a> · <a href={site.photo.licenseUrl} target="_blank" rel="noreferrer">{site.photo.license}</a>. {state.language === 'vi' ? 'Ảnh thu nhỏ, không chỉnh nội dung.' : 'Thumbnail; image content unchanged.'}</p></details>
        <div className="tour-stop-actions"><button className="secondary" onClick={() => onMap(site)}><Icon name="walk"/>{text('directions')}</button><button className="secondary" onClick={onCamera}><Icon name="camera"/>{text('scan')}</button></div>
        <button className="primary tour-main-action" onClick={() => dispatch({ type: 'completeStop' })}>{text('done')}<Icon name="check"/></button>
        <div className="tour-session-actions"><button onClick={() => dispatch({ type: 'pause' })}>{text('pause')}</button><button onClick={() => dispatch({ type: 'finish' })}>{text('finish')}</button></div>
      </article>}
      <nav className="tour-stops" aria-label={text('tour')}><ol>{TOUR_SITES.map((item, i) => <li key={item.id}><button aria-current={!overview && !complete && item.id === state.current ? 'step' : undefined} onClick={() => dispatch({ type: 'open', siteId: item.id })}><span className="tour-stop-number">{state.completed.includes(item.id) ? <Icon name="check" size={16}/> : String(i + 1).padStart(2,'0')}</span><span><strong lang={state.language}>{item[state.language].name}</strong><small>{state.completed.includes(item.id) ? text('completed') : complete ? text('remaining') : item.address}</small></span><Icon name="chevron" size={17}/></button></li>)}</ol></nav>
      <p className="tour-save-status" role="status">{text(persisted ? 'saved' : 'notSaved')}</p>
      <button className="tour-share" onClick={onShare}><Icon name="qr" size={18}/>{text('share')}</button>
    </div>
    {restart && <Modal title={text('restart')} onClose={() => setRestart(false)}><p>{text('confirm')}</p><button className="primary wide" onClick={() => { dispatch({ type: 'restart' }); setRestart(false); }}>{text('restart')}</button></Modal>}
  </div>;
}
