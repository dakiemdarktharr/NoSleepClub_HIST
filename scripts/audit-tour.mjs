// Browser acceptance tests. Install Playwright, or point PLAYWRIGHT_MODULE at an existing installation.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.AUDIT_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'], ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const report = { matrix: [], checks: [] };
async function open(page, locale = 'en', deep = false) {
  await page.goto(base + (deep ? '/?tour=central-architecture-v1' : '/'));
  await page.locator('.language-' + locale).click();
  if (!deep) await page.locator('.user-role').click();
  await page.locator('#view-tour.is-active').waitFor();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.iris-curtain')).visibility === 'hidden');
}
async function stable(page) { await page.waitForTimeout(450); }
async function syntheticSpeech(page) {
  await page.addInitScript(() => {
    window.audioCalls = { speak: 0, cancel: 0 };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { constructor(text) { this.text = text; } }, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [{ lang: 'en-US', localService: true }, { lang: 'vi-VN', localService: true }], cancel: () => { window.audioCalls.cancel++; }, speak: item => { window.audioCalls.speak++; } }, configurable: true });
  });
}
try {
  for (const locale of ['en','vi','ko','zh','ja','ru']) for (const [width,height] of [[320,740],[390,844],[844,390],[1440,1000]]) {
    const context = await browser.newContext({ viewport: { width,height }, isMobile: width < 900, hasTouch: width < 900 });
    const page = await context.newPage(), errors = [], rpc = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.url().includes('/api/rpc')) rpc.push(request.url()); });
    await open(page, locale); await stable(page);
    assert.equal(await page.locator('#guide-language').inputValue(), locale === 'vi' ? 'vi' : 'en');
    assert.equal(rpc.length, 0, 'Public walk unexpectedly needs room API');
    const layout = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, headings: [...document.querySelectorAll('#view-tour h1')].map(element => element.getBoundingClientRect().width) }));
    assert.ok(layout.width <= layout.viewport + 1, `Horizontal overflow ${locale} ${width}`);
    const nav = await page.locator('.view-tabs').boundingBox(); assert.ok(nav.x >= 0 && nav.x + nav.width <= width + 1);
    await page.locator('.tour-main-action').click();
    assert.equal(await page.locator('.tour-story').getAttribute('data-guide-language'), locale === 'vi' ? 'vi' : 'en');
    assert.equal(await page.locator('.tour-story h1').innerText(), locale === 'vi' ? 'Bưu điện Trung tâm' : 'Central Post Office');
    assert.equal(await page.locator('.fact-citation').count(), 2);
    assert.deepEqual(errors, []);
    if (locale === 'vi' && width === 390) await page.screenshot({ path: '.tmp/tour-mobile-story.png', fullPage: false });
    if (locale === 'en' && width === 1440) await page.screenshot({ path: '.tmp/tour-desktop-story.png', fullPage: false });
    report.matrix.push({ locale, width, height }); await context.close();
  }
  {
    const context = await browser.newContext({ viewport: { width:390,height:844 }, isMobile:true, hasTouch:true }), page = await context.newPage();
    const errors = [], requests = []; page.on('pageerror', error => errors.push(error.message));
    await syntheticSpeech(page);
    await page.addInitScript(() => {
      window.permissionCalls = { camera:0, location:0 };
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { window.permissionCalls.camera++; throw new DOMException('Denied', 'NotAllowedError'); } });
      Object.defineProperty(navigator.geolocation, 'getCurrentPosition', { value: (ok, fail) => { window.permissionCalls.location++; fail({ code:1 }); } });
    });
    // Exercise real MapLibre UI with a deterministic basemap and road service.
    await page.route('https://tiles.openfreemap.org/styles/positron', route => route.fulfill({ json: { version:8, sources:{}, layers:[{id:'paper',type:'background',paint:{'background-color':'#e8e5d9'}}] } }));
    await page.route('**/api/rpc', async route => {
      const data = route.request().postDataJSON(); requests.push(data);
      if (data.action === 'maps.route') return route.fulfill({ json: { route: { coordinates:[[data.origin.lat,data.origin.lon],[data.destination.lat,data.destination.lon]], meters:420, seconds:330, instructions:[{text:'Follow the public pavement.',meters:420,type:1}], provider:'acceptance-fixture' } } });
      throw Error('Unexpected RPC ' + data.action);
    });
    await open(page, 'vi', true);
    assert.deepEqual(await page.evaluate(() => window.permissionCalls), {camera:0,location:0});
    await page.locator('.tour-main-action').click();
    await page.locator('.tour-audio button').click(); assert.equal((await page.evaluate(() => window.audioCalls)).speak, 1);
    const before = (await page.evaluate(() => window.audioCalls)).cancel;
    await page.locator('.tour-stop-actions button').first().click(); await stable(page);
    assert.ok((await page.evaluate(() => window.audioCalls)).cancel > before, 'Audio continued into Maps');
    assert.equal(await page.locator('#map-origin').inputValue(), '');
    assert.equal(await page.locator('#map-destination').inputValue(), 'Bưu điện Trung tâm');
    assert.equal(requests.length, 0, 'First stop fabricated an origin');
    await page.locator('.place-search-actions button').first().click();
    await page.locator('.map-error').waitFor();
    assert.equal(await page.locator('#map-destination').inputValue(), 'Bưu điện Trung tâm');
    await page.locator('#view-tab-tour').click(); await stable(page);
    await page.getByRole('button',{name:'Xong điểm này',exact:true}).click();
    assert.equal(await page.locator('.tour-story h1').innerText(), 'Nhà thờ Đức Bà');
    await page.reload(); await page.locator('.language-vi').click(); await page.locator('#view-tour.is-active').waitFor();
    assert.equal(await page.locator('.tour-story h1').innerText(), 'Nhà thờ Đức Bà');
    await page.locator('.tour-stop-actions button').first().click();
    await page.locator('.route-summary').waitFor();
    const firstLeg = requests.find(request => request.action === 'maps.route');
    assert.equal(firstLeg.origin.id, 'tour:post-office'); assert.equal(firstLeg.destination.id, 'tour:cathedral'); assert.equal(firstLeg.mode, 'walk');
    assert.ok(await page.locator('.tour-map-context').isVisible());
    await page.locator('#view-tab-tour').click(); await stable(page);
    await page.locator('.tour-stop-actions button').last().click(); await stable(page);
    await page.locator('.camera-start').click(); await page.locator('.error-toast').waitFor();
    assert.equal((await page.evaluate(() => window.permissionCalls)).camera, 1);
    await page.locator('#view-tab-tour').click(); await stable(page);
    assert.equal(await page.locator('.tour-story h1').innerText(), 'Nhà thờ Đức Bà');
    await page.getByRole('button',{name:'Xong điểm này',exact:true}).click();
    await page.locator('.tour-stop-actions button').first().click(); await page.locator('.route-summary').waitFor();
    const last = requests.filter(request => request.action === 'maps.route').at(-1);
    assert.equal(last.origin.id, 'tour:cathedral'); assert.equal(last.destination.id, 'tour:palace');
    await page.locator('#view-tab-tour').click(); await stable(page);
    await page.getByRole('button',{name:'Xong điểm này',exact:true}).click();
    assert.equal(await page.locator('.tour-kicker').innerText(), '3 / 3 · ĐÃ XONG');
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('nep-pho-tour-v1')));
    assert.deepEqual(progress.completed, ['post-office','cathedral','palace']);
    await page.locator('.tour-main-action').click(); await page.getByRole('dialog').waitFor();
    await page.getByRole('dialog').getByRole('button',{name:'Bắt đầu chuyến mới',exact:true}).click();
    await page.locator('.tour-main-action').click(); await page.getByRole('button',{name:'Kết thúc tại đây',exact:true}).click();
    assert.equal(await page.locator('.tour-kicker').innerText(), '0 / 3 · ĐÃ XONG');
    assert.deepEqual(errors, []); report.checks.push('Full bilingual walk, sources, spoken text lifecycle, denied permissions, saved progress, both map legs, completion and early finish');
    await context.close();
  }
  {
    const context = await browser.newContext({viewport:{width:390,height:844}}), page = await context.newPage(), calls=[];
    await page.addInitScript(()=>{
      const id='00000000-0000-4000-8000-000000000001';
      localStorage.setItem('nosleepclub-hist-room-v1',id);
      localStorage.setItem('nosleepclub-hist-room-v1:'+id,JSON.stringify({id,readKey:'a'.repeat(64),writeKey:'b'.repeat(64)}));
    });
    page.on('request',request=>{if(request.url().includes('/api/rpc'))calls.push(request.url());});
    await open(page,'en',true);await page.locator('.tour-share').click();await page.locator('.qr-image').waitFor();
    assert.equal(await page.getByRole('dialog').locator('input').inputValue(),base+'/?tour=central-architecture-v1');
    assert.equal(calls.length,0,'Public deep link loaded saved private room');
    await page.getByRole('dialog').locator('.modal-heading button').click();
    await page.locator('#view-tab-camera').click();await stable(page);
    assert.ok((await page.locator('.camera-placeholder p').innerText()).includes('Three published facades'));
    assert.ok(!(await page.locator('.camera-status').innerText()).toLowerCase().includes('room'));
    report.checks.push('Public deep link and QR stay independent of saved private capabilities');await context.close();
  }
  {
    const context = await browser.newContext({ viewport:{width:390,height:844} }), page = await context.newPage();
    await page.addInitScript(() => { Storage.prototype.getItem = () => { throw Error('blocked'); }; Storage.prototype.setItem = () => { throw Error('blocked'); }; });
    await open(page);
    assert.ok((await page.locator('.tour-save-status').innerText()).includes('session only'));
    await page.locator('.tour-main-action').click(); await page.getByRole('button',{name:'Finish this stop',exact:true}).click();
    assert.equal(await page.locator('.tour-story h1').innerText(), 'Notre Dame Cathedral');
    await page.getByRole('button',{name:'Pause walk',exact:true}).click(); await page.locator('.tour-main-action').click();
    assert.equal(await page.locator('.tour-story h1').innerText(), 'Notre Dame Cathedral');
    report.checks.push('Blocked persistent storage and pause/resume without a room'); await context.close();
  }
  console.log(JSON.stringify(report,null,2));
} finally { await browser.close(); }
