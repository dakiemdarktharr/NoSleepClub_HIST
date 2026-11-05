// Use a production build (npm run build; npm run preview) to exercise the real service worker.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.AUDIT_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless:true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {}) });
try {
 const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('requestfailed',request=>console.error('Request failed: '+request.url()));
 await page.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel:()=>{}},configurable:true});});
 await page.goto(base+'/?tour=central-architecture-v1');await page.locator('.language-en').click();await page.locator('#view-tour.is-active').waitFor();
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.locator('.tour-main-action').click();await page.getByRole('button',{name:'Finish this stop',exact:true}).click();
 assert.equal(await page.locator('.tour-story h1').innerText(),'Notre Dame Cathedral');
 await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.locator('.language-en').click();await page.locator('#view-tour.is-active').waitFor();
 assert.equal(await page.locator('.tour-story h1').innerText(),'Notre Dame Cathedral');assert.ok(await page.locator('.tour-offline').isVisible());
 await page.waitForFunction(()=>document.querySelector('.tour-story img')?.naturalWidth>0);
 assert.equal(await page.locator('.fact-citation').count(),2);
 await page.locator('#view-tab-maps').click();assert.equal(await page.locator('#view-tab-tour').getAttribute('aria-selected'),'true');await page.locator('.error-toast button').click();
 await page.getByRole('button',{name:'Finish this stop',exact:true}).click();assert.equal(await page.locator('.tour-story h1').innerText(),'Independence Palace');
 await page.locator('.tour-audio button').click();await page.locator('.tour-audio p').waitFor();
 await page.locator('.tour-share').click();await page.locator('.qr-image').waitFor();
 const link=await page.getByRole('dialog').locator('input').inputValue();assert.equal(link,base+'/?tour=central-architecture-v1');assert.ok(!link.includes('room=')&&!link.includes('#'));
 await page.getByRole('dialog').locator('.modal-heading button').click();
 const cached=await page.evaluate(async()=>{const keys=await caches.keys(),urls=[];for(const key of keys.filter(key=>key.startsWith('nep-pho-guide-'))){const cache=await caches.open(key);urls.push(...(await cache.keys()).map(item=>item.url));}return urls;});
 assert.ok(cached.length>5);assert.ok(cached.every(url=>!url.includes('/api/')&&!url.includes('room=')&&!url.includes('huggingface')));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({offlineGuide:true,resumedStop:'cathedral',photos:true,sources:true,voiceUnavailableFallback:true,privateCacheEntries:0,shareLink:link,errors},null,2));
}finally{await browser.close();}
