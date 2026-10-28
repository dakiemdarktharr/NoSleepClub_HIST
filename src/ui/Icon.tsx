export type IconName = 'camera' | 'record' | 'qr' | 'back' | 'close' | 'menu' | 'map' | 'walk' | 'bike' | 'transit' | 'search' | 'locate' | 'swap' | 'chevron' | 'check';
export default function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></>,
    record: <><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="4"/></>,
    qr: <><path d="M3 3h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm12 0h3v3h3v3h-6zM12 3v9H3m9 9v-6h9M18 12h3"/></>,
    back: <path d="m14 5-7 7 7 7M7 12h14"/>, close: <path d="m6 6 12 12M6 18 18 6"/>,
    menu: <><path d="M4 7h16M4 17h16"/><circle cx="12" cy="12" r="1"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/></>,
    walk: <><circle cx="14" cy="4" r="2"/><path d="m7 13 3-5 4 1 3 4h3m-7-4-2 7-4 6m4-6 5 2 1 4"/></>,
    bike: <><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17h9l3-8h-4m1-4h4l2 9M6 13l3-4h3M7 7h4"/></>,
    transit: <><rect x="5" y="2" width="14" height="17" rx="3"/><path d="M5 11h14M8 22l2-3m6 3-2-3M8 6h8"/><circle cx="9" cy="15" r=".8"/><circle cx="15" cy="15" r=".8"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
    locate: <><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/></>,
    swap: <path d="M8 3v17m-4-4 4 4 4-4M16 21V4m-4 4 4-4 4 4"/>,
    chevron: <path d="m8 4 8 8-8 8"/>, check: <path d="m4 12 5 5L20 6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
