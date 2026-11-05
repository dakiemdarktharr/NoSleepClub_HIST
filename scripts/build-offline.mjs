import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const html = await readFile('dist/index.html', 'utf8');
const assets = await readdir('dist/assets');
const entry = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+\.(?:js|css))"/g)].map(match => match[1]);
const fonts = assets.filter(name => /^noto-serif-(?!sc-|jp-|kr-).+\.woff2$/.test(name)).map(name => '/assets/' + name);
const files = ['/', ...entry, ...fonts, '/icon.svg', '/art/indochine-tiles.svg', '/art/dragon.svg', '/art/lantern.svg', '/art/river-pavilion.svg', '/guide/post-office.jpg', '/guide/cathedral.jpg', '/guide/palace.jpg'];
const digest = createHash('sha256').update(html);
for (const file of files.filter(file => file !== '/')) digest.update(await readFile('dist' + file));
const version = digest.digest('hex').slice(0, 16);
const worker = `const SHELL='nep-pho-guide-shell-${version}', RUNTIME='nep-pho-guide-runtime-${version}';
const FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nep-pho-guide-')&&key!==SHELL&&key!==RUNTIME).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'&&url.pathname==='/'){
  event.respondWith((async()=>{try{const response=await fetch(request,{signal:AbortSignal.timeout(5000)});if(response.ok)return response;}catch{}return (await (await caches.open(SHELL)).match('/',{ignoreVary:true}))||Response.error();})());return;
 }
 if(!url.search&&(/^\\/assets\\/[^/]+\\.(js|css|woff2)$/.test(url.pathname)||/^\\/guide\\/(post-office|cathedral|palace)\\.jpg$/.test(url.pathname)||/^\\/art\\/(indochine-tiles|dragon|lantern|river-pavilion)\\.svg$/.test(url.pathname)||url.pathname==='/icon.svg')){
  event.respondWith((async()=>{const shell=await caches.open(SHELL),runtime=await caches.open(RUNTIME),cached=await shell.match(request,{ignoreVary:true})||await runtime.match(request,{ignoreVary:true});if(cached)return cached;const response=await fetch(request);if(response.ok){await runtime.put(request,response.clone());const keys=await runtime.keys();if(keys.length>60)await runtime.delete(keys[0]);}return response;})());
 }
});
`;
await writeFile('dist/offline-guide.js', worker);
console.log('Offline guide: ' + files.length + ' public shell/photo/font files; no API, map tiles, room responses or vision weights.');
