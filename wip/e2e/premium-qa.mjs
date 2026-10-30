// Checks for the premium quote page, plus a pixel diff of the live pages.
// PREM=http://127.0.0.1:8787 LIVE=http://127.0.0.1:8788 node premium-qa.mjs
import { createRequire } from 'module';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const { chromium } = createRequire(import.meta.url)('playwright');
const PREM = process.env.PREM || 'http://127.0.0.1:8787';
const LIVE = process.env.LIVE || 'http://127.0.0.1:8788';
const OUT = process.env.OUT || '/tmp/prem-qa';
fs.mkdirSync(OUT, { recursive: true });
const DASH = /[\-\u2010-\u2015\u2212]/;
let pass = 0, fail = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); console.log('FAIL', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function ready(page) {
  await page.waitForFunction(() => {
    const stage = document.querySelector('.stage.gl-show');
    const h = window.__h3d;
    const canvas = document.querySelector('canvas.gl3');
    if (!stage || !h || !canvas) return false;
    if (getComputedStyle(canvas).opacity !== '1') return false;
    const v = h.view();
    const key = [v.az, v.el, v.dist].map(n => (+n).toFixed(4)).join();
    if (window.__k !== key) { window.__k = key; window.__n = 0; return false; }
    return ++window.__n >= 3;
  }, null, { timeout: 40000 });
}

async function openPrem(width, height, opts = {}) {
  const phone = width < 960;
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: phone ? 2 : 1,
    hasTouch: phone,
    isMobile: phone,
    timezoneId: 'Europe/London',
  });
  if (opts.theme === 'dark') await ctx.addInitScript(() => localStorage.setItem('gleam.theme', 'dark'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(PREM + (opts.path || '/premium/uk/'), { waitUntil: 'commit', timeout: 60000 });
  await ready(page);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  return { ctx, page, errors };
}

async function drawLoopMs(page, turns) {
  return page.evaluate(async (n) => {
    const h = window.__h3d;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      h.setYaw(i * 0.17);
      await new Promise(r => requestAnimationFrame(r));
    }
    return performance.now() - t0;
  }, turns);
}

async function openLive(width, height) {
  const phone = width < 960;
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: phone ? 2 : 1,
    hasTouch: phone,
    isMobile: phone,
    timezoneId: 'Europe/London',
  });
  const page = await ctx.newPage();
  await page.goto(LIVE + '/uk/', { waitUntil: 'commit', timeout: 60000 });
  await ready(page);
  return { ctx, page };
}

console.log('fps');
{
  const prem = await openPrem(390, 800);
  const premMs = await drawLoopMs(prem.page, 40);
  const faces = await prem.page.evaluate(async () => {
    await document.fonts.load('500 32px "Schibsted Grotesk"');
    const probe = document.createElement('span');
    probe.textContent = 'Tap the house to start';
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;font:500 32px "Schibsted Grotesk",sans-serif;white-space:nowrap';
    document.body.appendChild(probe);
    const own = probe.getBoundingClientRect().width;
    probe.style.fontFamily = 'Arial, sans-serif';
    const arial = probe.getBoundingClientRect().width;
    probe.remove();
    return {
      loaded: document.fonts.check('500 16px "Schibsted Grotesk"'),
      own, arial,
      hosted: !document.documentElement.outerHTML.includes('fonts.gstatic.com'),
      alpha: window.__h3d.contextAttributes().alpha,
    };
  });
  await prem.ctx.close();
  const live = await openLive(390, 800);
  const liveMs = await drawLoopMs(live.page, 40);
  await live.ctx.close();
  const premFps = Math.round(40000 / premMs);
  const liveFps = Math.round(40000 / liveMs);
  console.log(JSON.stringify({ premFps, liveFps, faces }));
  fs.writeFileSync(`${OUT}/fps.json`, JSON.stringify({ premFps, liveFps, premMs, liveMs, faces }));
  ok(premFps >= 24, `390 fps ${premFps}`);
  ok(premFps + 1 >= liveFps * 0.85, `390 fps ${premFps} vs live ${liveFps}`);
  ok(faces.loaded && Math.abs(faces.own - faces.arial) > 1, `Schibsted loaded ${faces.own} vs Arial ${faces.arial}`);
  ok(faces.hosted, 'body font is self hosted');
  ok(faces.alpha === false, `premium canvas opaque ${faces.alpha}`);
}

console.log('first screen, fonts, flicker, taps, booking');
{
  const { ctx, page, errors } = await openPrem(390, 800);
  const info = await page.evaluate(() => {
    const em = document.querySelector('#h1b');
    const cs = getComputedStyle(em);
    const vh = innerHeight;
    const inView = sel => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return r.height > 0 && r.top >= -2 && r.bottom <= vh + 2;
    };
    return {
      font: getComputedStyle(document.querySelector('h1')).fontFamily,
      italic: cs.fontStyle,
      roman: document.fonts.check('400 48px "Instrument Serif"'),
      italicReady: document.fonts.check('italic 400 48px "Instrument Serif"'),
      bar: document.querySelector('#barSub').textContent,
      amt: document.querySelector('#heroAmt').textContent,
      scroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      seen: ['h1', '#heroAmt', '#heroBtn', '#bar', '#barAmt', '#barBtn', 'canvas.gl3'].every(inView),
      alpha: window.__h3d.contextAttributes().alpha,
      body: getComputedStyle(document.body).fontFamily,
    };
  });
  ok(info.roman && info.italicReady, `display font ready ${info.font}`);
  ok(info.italic === 'italic', `accent word italic ${info.italic}`);
  ok(/Instrument Serif/.test(info.font), `headline face ${info.font}`);
  ok(info.bar === 'Tap the house to start', `idle bar ${info.bar}`);
  ok(info.amt.includes('0'), `hero total ${info.amt}`);
  ok(info.scroll, '390 no sideways scroll');
  ok(info.seen, '390 price and house in the first screen');
  ok(info.alpha === false, 'premium canvas opaque');
  ok(/Schibsted Grotesk/.test(info.body), `body face ${info.body}`);
  ok(errors.length === 0, `page errors ${errors.join(' | ')}`);

  const text = await page.evaluate(() => document.body.innerText + '\n' + document.title);
  const bad = text.split('\n').filter(l => DASH.test(l));
  ok(bad.length === 0, `dashes ${bad.slice(0, 3).join(' | ')}`);
  ok(!/whatsapp|sms link|text me/i.test(text), 'no channel wording');

  for (const y of [0.4, Math.PI, 2.2, 4.1]) {
    await page.evaluate(yy => window.__h3d.setYaw(yy), y);
    await sleep(80);
    const a = await page.locator('canvas.gl3').screenshot();
    const b = await page.locator('canvas.gl3').screenshot();
    const A = PNG.sync.read(a), B = PNG.sync.read(b);
    const n = pixelmatch(A.data, B.data, null, A.width, A.height, { threshold: 0.1 });
    ok(n === 0, `flicker at yaw ${y.toFixed(2)} pixels ${n}`);
  }

  await page.evaluate(() => window.__h3d.setYaw(Math.PI));
  await sleep(100);
  const back = await page.evaluate(() => window.__h3d.project('roof'));
  ok(!!back, 'back roof has a tap point');
  if (back) await page.touchscreen.tap(back.x, back.y);
  const money = await page.evaluate(async () => {
    let bad = 0;
    for (let i = 0; i < 18; i++) {
      await new Promise(r => requestAnimationFrame(r));
      const a = document.querySelector('#heroAmt').textContent;
      const b = document.querySelector('#barAmt').textContent;
      const c = document.querySelector('#sumAmt').textContent;
      if (a !== b || a !== c) bad++;
    }
    return { bad, hero: document.querySelector('#heroAmt').textContent, bar: document.querySelector('#barAmt').textContent };
  });
  ok(money.bad === 0, `totals stay together ${money.bad} ${money.hero} vs ${money.bar}`);
  ok(await page.$eval('#house', e => e.classList.contains('c-roof')), 'back roof selects');

  await page.evaluate(() => window.__h3d.setYaw(0.6));
  await sleep(80);
  for (const id of ['windows', 'gutters', 'solar', 'walls', 'driveway', 'patio']) {
    const pt = await page.evaluate(i => window.__h3d.project(i), id);
    ok(!!pt, `${id} tappable`);
    if (pt) await page.touchscreen.tap(pt.x, pt.y);
    await sleep(80);
  }
  const total = await page.$eval('#heroAmt', e => e.textContent);
  ok(!total.includes('£0') && !/^0/.test(total.trim()), `total moved ${total}`);
  const sub = await page.$eval('#barSub', e => e.textContent);
  ok(sub !== 'Tap the house to start', `bar left idle copy ${sub}`);

  await page.fill('#name', 'Yusuf');
  await page.fill('#phone', '7700900123');
  await page.locator('#sumBtn').scrollIntoViewIfNeeded();
  await sleep(200);
  const tucked = await page.evaluate(() => document.querySelector('#bar').classList.contains('tuck'));
  ok(tucked, 'bar tucks when the summary button is on screen');
  await page.click('#sumBtn');
  await page.waitForSelector('dialog.book[open]', { timeout: 5000 });
  const dlg = await page.$eval('#bookDlg', e => e.innerText);
  ok(dlg.includes('Yusuf'), 'booking shows the name');
  ok(/premium\/uk/.test(page.url()), `stays on the page ${page.url()}`);
  ok(!/whatsapp/i.test(dlg), 'booking dialog has no channel name');
  await ctx.close();
}

console.log('arabic accent');
{
  const { ctx, page } = await openPrem(390, 800, { path: '/premium/sa/?lang=ar' });
  await page.waitForFunction(() => document.documentElement.lang === 'ar', null, { timeout: 15000 });
  const ar = await page.evaluate(() => {
    const em = document.querySelector('#h1b');
    const cs = getComputedStyle(em);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    return { text: em.textContent, style: cs.fontStyle, color: cs.color, accent, dir: document.documentElement.dir };
  });
  ok(ar.dir === 'rtl', 'arabic direction');
  ok(ar.style === 'normal', `arabic accent is not italic (${ar.style})`);
  ok(ar.text === 'جاهز', `arabic accent word ${ar.text}`);
  const accentRgb = 'rgb(15, 110, 86)';
  ok(ar.color === accentRgb, `arabic accent colour ${ar.color}`);
  await page.screenshot({ path: `${OUT}/sa-ar-390.png` });
  await ctx.close();
}

console.log('desktop frame and flicker');
{
  const { ctx, page } = await openPrem(1440, 900);
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas.gl3').getBoundingClientRect();
    const h = document.querySelector('h1').getBoundingClientRect();
    return { cw: Math.round(c.width), ch: Math.round(c.height), hx: Math.round(h.x), cx: Math.round(c.x) };
  });
  ok(box.cw >= 520 && box.ch >= 520, `desktop house ${box.cw}x${box.ch}`);
  ok(box.cx > box.hx + 200, `house sits to the right of the headline ${box.hx} ${box.cx}`);
  for (const y of [0.4, Math.PI, 2.2]) {
    await page.evaluate(yy => window.__h3d.setYaw(yy), y);
    await sleep(80);
    const a = await page.locator('canvas.gl3').screenshot();
    const b = await page.locator('canvas.gl3').screenshot();
    const A = PNG.sync.read(a), B = PNG.sync.read(b);
    const n = pixelmatch(A.data, B.data, null, A.width, A.height, { threshold: 0.1 });
    ok(n === 0, `1440 flicker at yaw ${y.toFixed(2)} pixels ${n}`);
  }
  await ctx.close();
}

console.log('dark desktop');
{
  const { ctx, page } = await openPrem(1440, 900, { theme: 'dark' });
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.stage-bg')).backgroundImage);
  ok(/radial-gradient/.test(bg), `dark stage gradient ${bg.slice(0, 80)}`);
  ok(!/backdrop/.test(bg), 'dark stage does not use the photo');
  await page.screenshot({ path: `${OUT}/uk-1440-dark.png` });
  await ctx.close();
}

console.log('live page pixel diff');
async function shotLive(base, path, width, theme) {
  const phone = width < 960;
  const ctx = await browser.newContext({
    viewport: { width, height: phone ? 800 : 900 },
    deviceScaleFactor: 1,
    timezoneId: 'Europe/London',
  });
  if (theme === 'dark') await ctx.addInitScript(() => localStorage.setItem('gleam.theme', 'dark'));
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'commit', timeout: 60000 });
  await ready(page);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await sleep(200);
  const buf = await page.screenshot();
  await ctx.close();
  return buf;
}
for (const path of ['/uk/', '/sa/']) {
  for (const width of [390, 1440]) {
    for (const theme of ['light', 'dark']) {
      const a = PNG.sync.read(await shotLive(LIVE, path, width, theme));
      const b = PNG.sync.read(await shotLive(PREM, path, width, theme));
      const tag = `${path} ${width} ${theme}`;
      if (a.width !== b.width || a.height !== b.height) {
        ok(false, `${tag} size ${a.width}x${a.height} vs ${b.width}x${b.height}`);
        continue;
      }
      const diff = new PNG({ width: a.width, height: a.height });
      const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
      const ratio = n / (a.width * a.height);
      if (ratio > 0.002) fs.writeFileSync(`${OUT}/diff-${path.replace(/\//g, '')}-${width}-${theme}.png`, PNG.sync.write(diff));
      ok(ratio <= 0.002, `${tag} pixel diff ${(ratio * 100).toFixed(3)}% (${n})`);
    }
  }
}

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ pass, fail, fails }, null, 1));
console.log(`pass ${pass} fail ${fail}`);
await browser.close();
process.exit(fail ? 1 : 0);
