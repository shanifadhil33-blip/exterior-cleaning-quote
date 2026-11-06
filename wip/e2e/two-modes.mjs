import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.OUT || '/tmp/gleam-two-modes';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
 for (const width of [390, 1440]) for (const path of ['/premium/uk/', '/premium/sa/?lang=ar', '/uk/', '/sa/?lang=ar']) {
  const ar = path.includes('/sa/');
  const ctx = await browser.newContext({ viewport:{width,height:900}, hasTouch:width===390, isMobile:width===390, reducedMotion:'reduce' });
  const p = await ctx.newPage(), errors=[];
  p.on('pageerror', e=>errors.push(e.message));
  // Capture the actual channel payload without adding a production debug API.
  await p.route('**/quote-mode.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+`\nconst mountOriginal=GleamModes.mount;GleamModes.mount=options=>{const ui=mountOriginal(options),make=ui.payload;ui.payload=base=>window.testPayload=make(base);return ui;};`});});
  await p.goto(BASE+path,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.__h3d,null,{timeout:45000});
  await p.waitForFunction(()=>!document.documentElement.classList.contains('lang-out'));
  const mode=p.locator('.mode-control');
  assert.equal(await mode.locator('[data-mode="instant"]').getAttribute('aria-pressed'),'true');
  assert((await mode.boundingBox()).y<480,'switch visible immediately');
  for(const id of ['windows','gutters']) await p.locator(`.svc[data-id="${id}"] .svc-main`).click();
  await p.locator('#name').fill('Omar');await p.locator('#phone').fill('0501234567');
  await p.waitForTimeout(800);
  assert(!/^[^\d]*0$/.test(await p.locator('#sumAmt').textContent()));
  if (!ar) {
   assert.equal((await p.locator('#sumAmt').textContent()).trim(), '£120');
   await p.locator('.svc[data-id="walls"] .svc-main').click();await p.waitForTimeout(800);
   assert.equal((await p.locator('#sumAmt').textContent()).trim(), '£513');
   await p.locator('.svc[data-id="walls"] .svc-main').click();
  }
  await p.locator('#sumBtn').click();await p.locator('#bookDlg[open]').waitFor();
  assert.equal(await p.evaluate(()=>testPayload.mode),'instant');await p.locator('#bookClose').click();
  await mode.locator('[data-mode="quote"]').click();
  assert(await p.locator('#quoteFields').isVisible());
  await p.locator('#name').fill('');await p.locator('#sumBtn').click();
  await p.waitForTimeout(100);
  assert((await p.locator('#quoteFields').boundingBox()).y < 100, 'incomplete quote leads to job details');
  if(width===390) assert((await p.locator('#stageWrap').getAttribute('class')).includes('away'),'house clears the job form');
  await p.locator('#name').fill('Omar');
  for(const s of ['#sumAmt','#barAmt','#stageEst','#heroPrice','.svc-price','#bundle']) if(await p.locator(s).count()) assert.equal(await p.locator(s).first().isVisible(),false,s);
  await p.locator('#quoteStoreys').selectOption('3');await p.locator('#quoteWindows').fill('18 large windows');await p.locator('#quoteGutters').selectOption('yes');
  await p.locator('#quotePhotos').setInputFiles({name:'roof.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  assert.equal(await p.locator('.photo-preview img').count(),1);
  await p.locator('#quotePhotos').setInputFiles({name:'notes.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});
  assert((await p.locator('#photoError').textContent()).length>0);
  await mode.locator('[data-mode="instant"]').click();
  await mode.locator('[data-mode="quote"]').click();
  assert.equal(await p.locator('#quoteWindows').inputValue(),'18 large windows');
  assert.equal(await p.locator('.photo-preview img').count(),1);
  await p.locator('#sumBtn').click();await p.locator('#bookDlg[open]').waitFor();
  const payload=await p.evaluate(()=>testPayload);
  assert.equal(payload.mode,'quote');assert.equal(payload.job.storeys,'3');assert.equal(payload.job.windows,'18 large windows');assert.equal(payload.job.gutters,'yes');assert.equal(payload.job.photos[0].name,'roof.png');
  assert(!('total'in payload));assert(!('price'in payload.items[0]));assert.equal(payload.items.length,2);
  assert(!/[£$€]|SAR|NaN/.test(await p.locator('#bookBody').textContent()));
  await p.locator('#bookSend').click();assert(/Demo|تجريبي/.test(await p.locator('#bookBody').textContent()));await p.locator('#bookClose').click();
  await p.locator('#themeBtn').click();await p.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  assert.equal(await p.evaluate(()=>__h3d.contextAttributes().alpha),false);
  if(ar) assert.equal(await p.locator('html').getAttribute('dir'),'rtl');
  await p.reload({waitUntil:'domcontentloaded'});
  assert.equal(await mode.locator('[data-mode="quote"]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#sumAmt').isVisible(),false);
  await mode.locator('[data-mode="instant"]').click();assert(await p.locator('#sumAmt').isVisible());assert.equal(await p.locator('#quoteFields').isVisible(),false);
  await p.locator('#stageWrap').scrollIntoViewIfNeeded();await p.waitForFunction(()=>window.__h3d);
  for(const yaw of [0,Math.PI]) {
   await p.evaluate(y=>__h3d.setYaw(y),yaw);await p.waitForTimeout(600);
   const pt=await p.evaluate(()=>__h3d.project('roof'));assert(pt,'roof tap point');
   const old=await p.locator('#house').getAttribute('class');
   if(width===390) await p.touchscreen.tap(pt.x,pt.y);else await p.mouse.click(pt.x,pt.y);
   await p.waitForTimeout(100);assert.notEqual(await p.locator('#house').getAttribute('class'),old,'front and back roof tap');
  }
  await mode.locator('[data-mode="quote"]').click();
  const copy=await p.locator('body').innerText();assert(!/[\-\u2010-\u2015\u2212]/.test(copy),'no public dashes');assert(!/whatsapp|cheap|971500000000/i.test(copy));
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll');
  await p.screenshot({path:`${OUT}/${path.includes('premium')?'premium':'classic'}-${width}-${ar?'ar':'en'}.png`,fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS',width,path);await ctx.close();
 }
 for(const market of ['us','ie','ca','au','nz']) {
  const p=await browser.newPage();await p.goto(`${BASE}/premium/${market}/`,{waitUntil:'domcontentloaded'});await p.locator('[data-mode="quote"]').click();assert(await p.locator('#quoteFields').isVisible());assert.equal(await p.locator('#region').inputValue(),market.toUpperCase());await p.close();
 }
 console.log('PASS all customer flows and premium markets');
} finally {await browser.close();}
