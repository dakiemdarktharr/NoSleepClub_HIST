// Original vector ornaments, informed by the user's tile, cloud and dragon references.
export function CloudDragon({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 760 170" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d="M14 131h77v-25H57V85h55V62h42v26h-20v19h43v24h70m499 0h-77v-25h34V85h-55V62h-42v26h20v19h-43v24h-70"/>
    <path d="M20 142h84v-47H68m678 47h-84v-47h30M120 46c32-22 62-12 70 9 5 12 0 25-12 25-15 0-20-19-7-24m469-10c-32-22-62-12-70 9-5 12 0 25 12 25 15 0 20-19 7-24"/>
    <path d="M204 119c36-5 29-49 71-51 32-2 41 38 76 35 42-4 42-49 84-48 37 1 36 33 64 32 26-1 24-19 43-26m-336 69c35-1 44-40 71-40 30 0 43 38 77 30 39-9 52-48 81-47 29 2 34 27 66 26 29-1 39-24 57-22"/>
    <path d="m272 68-4-15 16 7 7-14 11 18m43 35 13-23 13 4m47-23-2-18 17 12 9-15 10 24m37 28 12-21 13 6M229 105l-20-7 8-13m119 27-9 18-15-6m140-41 9 26 21 2"/>
    <path d="M541 61c-1-22 19-36 39-30l17-15-3 23 15 5-12 12 16 11-19 7c-16 27-34 27-48 19m4-39 10-8 13 5-2 12-18 8m29-31 8 1m-50 14c-13-6-21-17-19-28m-1 45c-21 4-35 17-38 36m82-33c18 1 31 11 33 24m-28-59 27-11m-22 19 35-2"/>
    <path d="M40 36c15-21 40-10 33 5-5 12-21 7-19-1m663-4c-15-21-40-10-33 5 5 12 21 7 19-1M219 40c-2-14 13-21 22-12 9-19 34-6 27 9m107 96c15-18 35-14 40 0m-61 6h84"/>
  </svg>;
}
export function Lantern() {
  return <svg className="lantern" viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M50 0v32m-20 0h40l-3 9H33zm3 9C-5 61 0 124 33 145h34c33-21 38-84 0-104M34 42c-19 28-19 74 0 103m32-103c19 28 19 74 0 103M45 41c-8 29-8 75 0 104m10-104c8 29 8 75 0 104M13 69h74M8 114h84M33 145v8h34v-8m-17 8v22m-7 0h14m-7 0v24m-5-23v20m10-20v20"/></svg>;
}
export function InkLandscape() {
  return <svg className="ink-landscape" viewBox="0 0 800 230" fill="none" stroke="currentColor" aria-hidden="true"><g opacity=".22" strokeWidth="1.2"><path d="m0 182 75-16 40-31 29 14 63-74 24 37 27-17 58 87 71-9 47-49 23 15 37-83 58 111 28-23 51 41 99-18 70 14M0 194c157-27 199 29 363 4s255 25 437-6M24 210c180-14 242 20 428-3"/><path d="m205 83-24 99m53-67 33 67m211-109-9 98m24-68 27 75m-108-29 9 23"/></g><g opacity=".4"><path d="M126 185v-51m0 19-24-18m24 4 21-22m-21 50-21-7m21-4 22-8M649 183v-38m0 10 19-17m-19 29-18-8"/></g><g opacity=".14" strokeWidth="2"><path d="M397 144c-35-37 37-40 9-75s20-43 7-65"/><path d="M415 154c-33-31 20-42 13-61"/></g></svg>;
}
