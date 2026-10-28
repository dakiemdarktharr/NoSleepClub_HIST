// Editable ornaments. The dragon traces the user's temporary hand-drawn reference.
export function CloudDragon({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="100 25 1245 545" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-artwork="sketch-dragon-placeholder">
    {/* Long body and upright head retain the reference's deliberately simple outline. */}
    <path d="M220 383c9-36 27-79 59-102l33-21 26-11h138c24 8 54 35 86 62 32 28 61 51 96 60h62l61-22c38-10 62-24 84-52l29-52c10-18 16-36 20-54v-57c4-19 21-34 39-50 13-6 25-7 40-6h75c17 3 31 16 37 28v78h53v41l-26 30h-61l-24-14c-5 35-22 65-38 94l-21 35c-18 24-40 40-67 52l-100 45-24 11h-99c-37-4-78-16-116-29l-73-30c-31-17-54-45-82-68l-32-23h-52c-23 0-42 9-61 21l-54 35Z"/>
    {/* Stepped dorsal ridge, forked tail and four loosely sketched claws. */}
    <path d="m312 261 20-13v-16h92v-38l43 19 30 20 17-12h9l15 22 6 12h18l12-5 5 43 34-11h9l23 29 28-9h22v32l33-25h10l12 27 14-33 23 12h16v-31h18v-35h17v-47h17l-9-16 8-9 21-7v-23l-18 1 15 11"/>
    <path d="m253 310-77 31 31 8-53 73 64-18-26 20-67 71 66-24-7 51 15-33 8 32 3-49 21-28 12 26 10-61 16-35 1 55"/>
    <path d="m476 405-25 17-5 34-14 26 3-37-29 29h-19l40-35h-39m67-20 24 5-23 14m106-32v82l-28 27m29-28 43 14 16 10 4 18m-22-28-2 41m-11-43-7 45m-36-102-30-1c-6 12 3 19 32 29"/>
    <path d="m921 260-1 79 17 47m-15-92 37-26m-35 35 49-12m-51 37h40m-39 18-24 16-8 15 35-13m-20 12-15 21 25-11m-10 0-14 20 24-12m81-17 26 24 24 48 23 32m-48-57-22 2 11 22 34-12m-13 20-2 25m13-25 25-27 15-7m-25 32 17 3"/>
    {/* Two short horns, heavy brow, dot eye, muzzle, tongue and hanging whiskers. */}
    <path d="m955 80-24-30-2-5m72 31V49l-3-5m74 206v-37h55m28 20 45 15 15 10v16h-17l-22-8-30-15m-68 4 8 34 6 32m-29-64 8 41v39l-9 5"/>
    <path d="M1011 130c16-11 40-4 56 8l3 8h-28l-16-14Z" fill="currentColor"/>
    <circle cx="1040" cy="169" r="8.5" fill="currentColor" stroke="none"/>
    <path d="M1193 325c8-13 20-13 38-8l42 10c31 12 47 25 52 45l1 40c-7 22-20 43-43 53-24 10-51 2-72-5-24-9-36-30-40-54v-64l9-26c13-8 26-9 38-4" strokeWidth="13"/>
  </svg>;
}
export function Lantern() {
  return <svg className="lantern" viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M50 0v32m-20 0h40l-3 9H33zm3 9C-5 61 0 124 33 145h34c33-21 38-84 0-104M34 42c-19 28-19 74 0 103m32-103c19 28 19 74 0 103M45 41c-8 29-8 75 0 104m10-104c8 29 8 75 0 104M13 69h74M8 114h84M33 145v8h34v-8m-17 8v22m-7 0h14m-7 0v24m-5-23v20m10-20v20"/></svg>;
}
export function InkLandscape() {
  return <svg className="ink-landscape" viewBox="0 0 800 230" fill="none" stroke="currentColor" aria-hidden="true"><g opacity=".22" strokeWidth="1.2"><path d="m0 182 75-16 40-31 29 14 63-74 24 37 27-17 58 87 71-9 47-49 23 15 37-83 58 111 28-23 51 41 99-18 70 14M0 194c157-27 199 29 363 4s255 25 437-6M24 210c180-14 242 20 428-3"/><path d="m205 83-24 99m53-67 33 67m211-109-9 98m24-68 27 75m-108-29 9 23"/></g><g opacity=".4"><path d="M126 185v-51m0 19-24-18m24 4 21-22m-21 50-21-7m21-4 22-8M649 183v-38m0 10 19-17m-19 29-18-8"/></g><g opacity=".14" strokeWidth="2"><path d="M397 144c-35-37 37-40 9-75s20-43 7-65"/><path d="M415 154c-33-31 20-42 13-61"/></g></svg>;
}
