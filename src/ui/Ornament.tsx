// Native SVG recreations of the Canva concept. Sources and editable paths: public/art/.
export function CloudDragon({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 640 180" aria-hidden="true" data-artwork="indochine-dragon"><use href="/art/dragon.svg#artwork"/></svg>;
}
export function Lantern() {
  return <svg className="lantern" viewBox="0 0 96 240" aria-hidden="true"><use href="/art/lantern.svg#artwork"/></svg>;
}
export function InkLandscape() {
  return <svg className="ink-landscape" viewBox="0 0 800 230" aria-hidden="true"><use href="/art/river-pavilion.svg#artwork"/></svg>;
}
export function CompassSeal() {
  return <svg viewBox="0 0 100 100" aria-hidden="true"><use href="/art/compass.svg#artwork"/></svg>;
}
