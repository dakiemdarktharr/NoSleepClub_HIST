// User's hand-drawn dragon; other ornaments follow the Canva concept. Editable paths: public/art/.
export function CloudDragon({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="100 25 1245 545" aria-hidden="true" data-artwork="sketch-dragon-placeholder"><use href="/art/dragon.svg#artwork"/></svg>;
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
