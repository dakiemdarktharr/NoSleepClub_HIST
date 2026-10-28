// Original vector ornaments, informed by the user's tile, cloud and dragon references.
export function CloudDragon({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 760 190" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {/* One continuous, tapering body; details stay inside its silhouette. */}
    <path d="M80 132c35 8 57-8 80-30 31-30 55-45 85-30 34 17 40 65 78 64 39-1 48-70 91-70 43 0 51 54 91 50 30-3 41-35 60-50l22 19c-21 18-31 52-69 57-49 7-65-51-101-51-32 0-43 67-88 68-47 1-56-56-88-68-22-9-45 3-72 23-31 22-58 29-89 18Z"/>
    <path d="M81 132c28 0 37-12 45-25-1 14-9 23-21 28m52-30 9 11m8-25 10 11m9-24 8 12m12-20 4 13m15-14-1 13m17-9-6 12m19-1-9 9m19 3-10 7m18 6-11 6m20 9-7 10m22-10-1 14m22-17 7 12m10-25 10 10m3-29 11 7m3-28 12 5m4-25 10 9m10-23 6 12m17-16v14m20-10-5 13m21-3-9 11m21 3-11 8m20 7-10 9m22 5-7 12m24-7-1 13m23-16 5 12m12-24 9 10m6-27 11 8" strokeWidth="1"/>
    {/* Flame-like dorsal spines follow the upper curve. */}
    <path d="m182 84 4-15 9 7 10-17 7 12 12-13 4 12m53 36 2-16 12 9m55 26 12 4 1-17m35-34 1-15 12 4 8-17 9 13 12-11 4 15m46 35 1-17 13 10m42 16 12 5 4-16m16-21 9 1 1-15"/>
    {/* Two pairs of articulated legs and three-toed claws. */}
    <path d="m252 103-3 24-20 14 8 17m-8-17-8 10m16 7 12 1m-12-1-2 9m2-9-9 7m94-21 13 21 24-2 7 12m-7-12 9-7m-2 19 11 1m-11-1 1 9m-1-9-7 6m103-74-1 24 17 14-6 14m6-14 9 5m-15 9-9 5m9-5 4 9m-4-9-3 10m101-23 12 21 20-1 8 12m-8-12 8-7m0 19 11 1m-11-1 1 9m-1-9-7 6"/>
    {/* Long muzzle, visible eye, antler horns, mane and flowing whiskers. */}
    <path d="M562 66c-4-19 11-39 32-39 15 0 21 10 28 16l31 1 12 10-5 13-32 3c-5 14-15 23-30 21l-15-8m-20-18-13-9 7-9-10-8 17-1-3-13 14 8 4-13 8 8"/>
    <path d="m589 30-4-17 10 5 4-13m10 31 10-19 10 1 4-11m-17 17 14 2m-47 22 9-7 16 7-14 7-11-7Zm3-1 5 3 4-3m33 9 15 1m-26 13 7-7h20m-23 11 3 7 8-9m-47 6 7 7 11-5m-26-19-8 10 9 7m-10-9-12 4"/>
    <path d="M652 49c28-25 54-18 57-5 3 10-9 14-14 6m-40 14c31 0 45 12 39 24-5 11-22 7-20-2m-74 4c-9 18-26 21-43 15m37-15c-1 16-14 27-29 29m35-88c-13-16-30-16-40-9" strokeWidth="1.2"/>
    {/* Quiet cloud curls and architectural fretwork frame the animal. */}
    <path d="M15 151h47v-20H37v-17h31m621 37h56v-20h-25v-17h25M19 162h54m612 0h60M29 62c-5-14 15-24 23-11 12-10 29 3 21 14-6 9-17 4-16-3m631 58c18-9 30 5 24 14m-378-95c-5-14 11-22 19-12 9-15 30-7 29 5m-179 129c11-14 25-12 31 0m-52 8h76" strokeWidth="1.1"/>
  </svg>;
}
export function Lantern() {
  return <svg className="lantern" viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M50 0v32m-20 0h40l-3 9H33zm3 9C-5 61 0 124 33 145h34c33-21 38-84 0-104M34 42c-19 28-19 74 0 103m32-103c19 28 19 74 0 103M45 41c-8 29-8 75 0 104m10-104c8 29 8 75 0 104M13 69h74M8 114h84M33 145v8h34v-8m-17 8v22m-7 0h14m-7 0v24m-5-23v20m10-20v20"/></svg>;
}
export function InkLandscape() {
  return <svg className="ink-landscape" viewBox="0 0 800 230" fill="none" stroke="currentColor" aria-hidden="true"><g opacity=".22" strokeWidth="1.2"><path d="m0 182 75-16 40-31 29 14 63-74 24 37 27-17 58 87 71-9 47-49 23 15 37-83 58 111 28-23 51 41 99-18 70 14M0 194c157-27 199 29 363 4s255 25 437-6M24 210c180-14 242 20 428-3"/><path d="m205 83-24 99m53-67 33 67m211-109-9 98m24-68 27 75m-108-29 9 23"/></g><g opacity=".4"><path d="M126 185v-51m0 19-24-18m24 4 21-22m-21 50-21-7m21-4 22-8M649 183v-38m0 10 19-17m-19 29-18-8"/></g><g opacity=".14" strokeWidth="2"><path d="M397 144c-35-37 37-40 9-75s20-43 7-65"/><path d="M415 154c-33-31 20-42 13-61"/></g></svg>;
}
