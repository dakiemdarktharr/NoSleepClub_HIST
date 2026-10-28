import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n';
import Icon from '../ui/Icon';
import { LANDMARKS, landmarkPlace } from './landmarks';
import type { Place } from './types';
export default function DestinationInput({value, disabled, onChange, onSearch, onChoose}: {value:string; disabled:boolean; onChange:(value:string)=>void; onSearch:()=>void; onChoose:(place:Place)=>void}) {
  const {t,locale}=useLocale(); const [open,setOpen]=useState(false),[filter,setFilter]=useState(false),[active,setActive]=useState(-1);
  const root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null);
  const normalize=(text:string)=>text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const options=LANDMARKS.filter(item=>!filter || normalize(item.names.join(' ')+item.local).includes(normalize(value)));
  useEffect(()=>{ if(active>=0) root.current?.querySelector(`#landmark-${active}`)?.scrollIntoView({block:'nearest'}); },[active]);
  const choose=(index:number)=>{if(!options[index])return;onChoose(landmarkPlace(options[index],locale));setOpen(false);setActive(-1);input.current?.focus();};
  return <div className={`destination-combobox ${open?'is-open':''}`} ref={root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setActive(-1);}}}>
    <div className="destination-controls"><label className="sr-only" htmlFor="map-destination">{t('destination')}</label><input ref={input} id="map-destination" role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls="landmark-options" aria-activedescendant={open&&active>=0?`landmark-${active}`:undefined} value={value} placeholder={t('destinationPlaceholder')} disabled={disabled} onChange={event=>{onChange(event.target.value);setFilter(true);setOpen(true);setActive(-1);}} onKeyDown={event=>{
      if(event.nativeEvent.isComposing)return;
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);setActive(i=>!options.length?-1:i<0?(event.key==='ArrowDown'?0:options.length-1):(i+(event.key==='ArrowDown'?1:-1)+options.length)%options.length);}
      if(event.key==='Escape'){event.preventDefault();setOpen(false);setActive(-1);}
      if(event.key==='Enter'){event.preventDefault();if(open&&active>=0)choose(active);else {setOpen(false);onSearch();}}
    }}/><button className="icon-button landmark-toggle" disabled={disabled} aria-label={t('openLandmarks')} aria-expanded={open} aria-controls="landmark-options" onClick={()=>{setOpen(!open);setFilter(false);setActive(-1);input.current?.focus();}}><span aria-hidden="true">⌄</span></button><button className="icon-button" aria-label={t('searchDestination')} disabled={disabled} onClick={()=>{setOpen(false);onSearch();}}><Icon name="search" size={18}/></button></div>
    {open&&<div className="landmark-menu"><p>{t('landmarks')}</p><ul id="landmark-options" role="listbox" aria-label={t('landmarks')}>{options.map((item,index)=><li id={`landmark-${index}`} key={item.id} role="option" aria-selected={active===index}><button tabIndex={-1} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(index)}><span>{landmarkPlace(item,locale).name}</span><small lang="vi">{item.local}</small>{item.note&&<em>{t(item.note)}</em>}</button></li>)}</ul>{!options.length&&<p>{t('noLandmarks')}</p>}</div>}
  </div>;
}
