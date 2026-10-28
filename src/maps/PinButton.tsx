import { useRef, type PointerEvent } from 'react';
import { useLocale } from '../i18n';
export type Field = 'origin'|'destination';
export default function PinButton({field,disabled,active,onPick,onDrag,onDrop}: {field:Field;disabled:boolean;active:boolean;onPick:()=>void;onDrag:(point:{x:number;y:number;field:Field}|null)=>void;onDrop:(x:number,y:number)=>void}) {
  const {t}=useLocale(); const start=useRef<{id:number;x:number;y:number;dragged:boolean}|null>(null);
  function end(event:PointerEvent<HTMLButtonElement>,cancel=false){
    const old=start.current;if(!old||old.id!==event.pointerId)return;start.current=null;onDrag(null);
    // Touch compatibility clicks can be suppressed after capture. Complete the gesture
    // on pointerup; reserve click(detail=0) for keyboard and assistive activation.
    if(!cancel){if(old.dragged)onDrop(event.clientX,event.clientY);else onPick();}
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return <button className={`pin-handle ${field}`} disabled={disabled} aria-label={t(field==='origin'?'originPin':'destinationPin')} aria-describedby="map-pin-help" aria-pressed={active} onClick={event=>{if(event.detail===0)onPick();}} onPointerDown={event=>{if(event.button!==0||!event.isPrimary)return;start.current={id:event.pointerId,x:event.clientX,y:event.clientY,dragged:false};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{const old=start.current;if(!old||old.id!==event.pointerId)return;if(Math.hypot(event.clientX-old.x,event.clientY-old.y)>8)old.dragged=true;if(old.dragged)onDrag({x:event.clientX,y:event.clientY,field});}} onPointerUp={event=>end(event)} onPointerCancel={event=>end(event,true)} onLostPointerCapture={()=>{start.current=null;onDrag(null);}}><span aria-hidden="true">{field==='origin'?'A':'B'}</span></button>;
}
