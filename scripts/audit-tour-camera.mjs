// Real DINOv2/ORB integration with synthetic camera streams made from the published photos.
// This proves wiring, not independent recognition accuracy at the historical sites.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader'], ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath:process.env.CHROMIUM_EXECUTABLE } : {}) });
try {
 const page = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}), errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.fixtureSite='post-office'; window.fixtureTracks=[];
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
   let image;
   if(window.fixtureSite!=='blank'){image=new Image();image.src='/guide/'+window.fixtureSite+'.jpg';await image.decode();canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;}
   else{canvas.width=960;canvas.height=640;}
   const draw=()=>{if(image)context.drawImage(image,0,0);else{context.fillStyle='#b6afa2';context.fillRect(0,0,canvas.width,canvas.height);}};
   draw();const stream=canvas.captureStream(12),track=stream.getVideoTracks()[0];window.fixtureTracks.push(track);
   const loop=()=>{if(track.readyState==='ended')return;draw();requestAnimationFrame(loop);};requestAnimationFrame(loop);return stream;
  }});
 });
 await page.goto((process.env.AUDIT_URL||'http://127.0.0.1:5173')+'/?tour=central-architecture-v1');await page.locator('.language-en').click();
 await page.locator('#view-tour.is-active').waitFor();
 const checks=[];
 for(const [id,name]of[['post-office','Central Post Office'],['cathedral','Notre Dame Cathedral'],['palace','Independence Palace']]){
  await page.evaluate(id=>{window.fixtureSite=id;},id);
  await page.locator('#view-tab-camera').click(); await page.waitForTimeout(500); await page.locator('.camera-start').click();
  await page.waitForFunction(name=>document.querySelector('.recognition-result.matched strong')?.textContent===name,name,{timeout:90000});
  await page.locator('.recognized-story').click(); await page.waitForTimeout(500);
  assert.equal(await page.locator('.tour-story h1').innerText(),name);
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('nep-pho-tour-v1')));
  assert.equal(state.current,id);assert.equal(state.completed.length,0,'Camera fabricated a completed visit');
  assert.ok(await page.evaluate(()=>window.fixtureTracks.every(track=>track.readyState==='ended')));
  checks.push(id+': real model match → correct sourced story; camera stopped; no visit recorded');
 }
 await page.evaluate(()=>{window.fixtureSite='blank';});await page.locator('#view-tab-camera').click();await page.waitForTimeout(500);await page.locator('.camera-start').click();await page.waitForTimeout(3000);
 assert.equal(await page.locator('.recognition-result strong').innerText(),'...');assert.equal(await page.locator('.recognized-story').count(),0);
 await page.locator('#view-tab-tour').click();await page.waitForTimeout(500);assert.deepEqual(errors,[]);
 checks.push('Blank scene remains unknown with no content shortcut');console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
