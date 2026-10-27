// Customer and owner walk for the exterior cleaning quote page.
// BASE=http://127.0.0.1:8787 OUT=/workspace/qa/exterior-quote node qa.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const OUT = process.env.OUT || '/workspace/qa/exterior-quote';
fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [360, 390, 1280, 1440, 1920];
const MARKETS = [
  { path: '/us/', region: 'US', scheme: 'sms', dial: '+1', btn: 'Text us' },
  { path: '/ca/', region: 'CA', scheme: 'sms', dial: '+1', btn: 'Text us' },
  { path: '/uk/', region: 'UK', scheme: 'wa', dial: '+44', btn: 'Book on WhatsApp' },
  { path: '/ie/', region: 'IE', scheme: 'wa', dial: '+353', btn: 'Book on WhatsApp' },
  { path: '/au/', region: 'AU', scheme: 'wa', dial: '+61', btn: 'Book on WhatsApp' },
  { path: '/nz/', region: 'NZ', scheme: 'sms', dial: '+64', btn: 'Text us' },
  { path: '/sa/', region: 'SA', scheme: 'wa', dial: '+966', btn: 'Book on WhatsApp', sa: true },
  { path: '/sa/', region: 'SA', scheme: 'wa', dial: '+966', btn: 'احجز على واتساب', ar: true, sa: true, key: 'sa-ar' },
  { path: '/', region: 'US', scheme: 'sms', dial: '+1', btn: 'Text us', tz: 'America/New_York' },
];
const SERVICES = ['windows', 'solar', 'gutters', 'roof', 'walls', 'driveway', 'patio'];
let pass = 0, fail = 0; const fails = []; const messages = {};
const ok = (c, m) => { if (c) pass++; else { fail++; fails.push(m); console.log('FAIL', m); } };
const DASH = /[\-\u2010-\u2015\u2212]/;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const fpsLog = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function noSideScroll(page, tag) {
  const d = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
  ok(d.sw <= d.w, `${tag} sideways scroll ${d.sw}>${d.w}`);
}
async function dashCheck(page, tag) {
  const txt = await page.evaluate(() => {
    const out = [document.body.innerText, document.title, document.querySelector('meta[name=description]').content];
    document.querySelectorAll('[aria-label],[placeholder],[alt],option').forEach(e => out.push(e.getAttribute('aria-label') || '', e.getAttribute('placeholder') || '', e.getAttribute('alt') || '', e.tagName === 'OPTION' ? e.textContent : ''));
    return out.join('\n');
  });
  const bad = txt.split('\n').filter(l => DASH.test(l));
  ok(bad.length === 0, `${tag} dash in visible text: ${bad.slice(0, 3).join(' | ')}`);
}
const amount = page => page.evaluate(() => document.querySelector('#sumAmt').textContent);
const num = s => Number(s.replace(/[^\d]/g, ''));

for (const mk of MARKETS) for (const w of WIDTHS) {
  const tag = `${mk.key || mk.path} ${w}`;
  const fk = mk.key || (mk.path.replace(/\//g, '') || 'root');
  const phone = w < 960;
  const ctx = await browser.newContext({ viewport: { width: w, height: phone ? 800 : 900 }, deviceScaleFactor: phone ? 2 : 1, hasTouch: phone, isMobile: phone, timezoneId: mk.tz || 'Asia/Dubai', permissions: ['geolocation'], geolocation: { latitude: 51.5007, longitude: -0.1246 } });
  await ctx.addInitScript(() => {
    window.__links = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (/^(sms:|https:\/\/wa\.me)/.test(this.href)) { window.__links.push(this.href); return; } return orig.call(this); };
  });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/tile\.openstreetmap|ERR_|net::/.test(m.text() + (m.location().url || ''))) errs.push('console: ' + m.text()); });
  const res = await page.goto(BASE + mk.path, { waitUntil: 'networkidle' });
  ok(res.status() === 200, `${tag} status ${res.status()}`);
  if (mk.sa && !mk.ar) ok(await page.evaluate(() => document.documentElement.dir === 'ltr' && document.documentElement.lang === 'en'), `${tag} SA defaults to English`);
  if (mk.ar) {
    await page.locator('#langSw button[data-lang="ar"]').click(); await sleep(400);
    await page.reload({ waitUntil: 'networkidle' });
    ok(await page.evaluate(() => document.documentElement.dir === 'rtl'), `${tag} Arabic choice remembered after reload`);
  }
  ok(await page.$eval('#region', e => e.value) === mk.region, `${tag} region`);
  await page.waitForFunction(() => window.__h3d || window.__h3dError, null, { timeout: 20000 }).catch(() => {});
  ok(await page.evaluate(() => !!window.__h3d && document.querySelector('.stage').classList.contains('gl-on')), `${tag} 3D house loaded ${await page.evaluate(() => window.__h3dError || '')}`);
  await page.waitForFunction(() => document.querySelector('.stage.gl-show'), null, { timeout: 20000 }).catch(() => {});
  await sleep(1800);
  ok(await page.evaluate(() => document.documentElement.dir) === (mk.ar ? 'rtl' : 'ltr'), `${tag} text direction`);
  if (phone || w === 1440) {
    const f = await page.evaluate(() => window.__h3d && window.__h3d.fps());
    if (phone) ok(f >= 24, `${tag} phone fps ${f}`);
    fpsLog.push(`${tag} ${f}`);
  }
  await page.screenshot({ path: `${OUT}/${fk}-${w}-1-start.png` });
  await noSideScroll(page, tag + ' start');
  await dashCheck(page, tag + ' start');
  ok((await page.$eval('#cc', e => e.value)) && (await page.$eval('#ccShow', e => e.textContent)).endsWith(mk.dial), `${tag} default code ${mk.dial}`);
  const sizes = await page.$$eval('#sizeSeg button .t', b => b.map(x => x.textContent));
  if (mk.region === 'UK' || mk.region === 'IE') ok(sizes.join(',') === 'Detached,Semi detached,Terraced,Bungalow', `${tag} UK types ${sizes}`);
  else if (mk.ar) ok(sizes.join(',') === 'فيلا صغيرة,فيلا متوسطة,فيلا كبيرة,دوبلكس,شقة', `${tag} SA types ${sizes}`);
  else if (mk.sa) ok(sizes.join(',') === 'Small villa,Medium villa,Large villa,Duplex,Apartment', `${tag} SA EN types ${sizes}`);
  else ok(sizes.length === 3, `${tag} sizes`);
  // every home type changes the windows price and the house
  const prices = [];
  for (let i = 0; i < sizes.length; i++) {
    await page.locator('#sizeSeg button').nth(i).click();
    await sleep(120);
    prices.push(await page.$eval('.svc[data-id="windows"] .svc-price', e => e.textContent));
    ok(await page.evaluate(() => window.__h3d && window.__h3d.parts().length) === 7, `${tag} 3D parts ${sizes[i]}`);
    await noSideScroll(page, `${tag} size ${sizes[i]}`);
    if (w === 390 && ['UK', 'SA', 'US'].includes(mk.region) && !(mk.sa && !mk.ar)) { await sleep(300); await page.locator('.stage').screenshot({ path: `${OUT}/${mk.region.toLowerCase()}-390-house-${i}.png` }); }
  }
  ok(new Set(prices).size >= 3, `${tag} prices scale by home ${prices}`);
  await page.locator('#sizeSeg button').nth(1).click(); await sleep(200);
  // tap every service from the list, and the roof and panels on the house
  let last = 0;
  for (const id of SERVICES) {
    const viaHouse = ['solar', 'roof', 'walls', 'windows'].includes(id);
    if (viaHouse) {
      await page.evaluate(() => scrollTo(0, 0)); await sleep(400);
      const pt = await page.evaluate(id => window.__h3d && window.__h3d.project(id), id);
      ok(!!pt, `${tag} ${id} visible on the 3D house`);
      if (pt) { if (phone) await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y); }
    } else {
      await page.locator(`.svc[data-id="${id}"] .svc-main`).scrollIntoViewIfNeeded();
      await page.locator(`.svc[data-id="${id}"] .svc-main`).click();
    }
    const washing = await page.evaluate(id => window.__h3d.washing(id), id);
    ok(washing, `${tag} ${id} 3D wash animation ran`);
    ok(await page.$eval('#house', (e, id) => e.classList.contains('c-' + id), id), `${tag} ${id} selected on house`);
    await sleep(1500);
    const dirt = await page.evaluate(id => window.__h3d.dirt(id), id);
    ok(dirt === 0, `${tag} ${id} grime cleaned on 3D house (${dirt})`);
    if (id === 'roof' && w === 390) await page.locator('.stage').screenshot({ path: `${OUT}/${fk}-390-wash-roof.png` });
    const a = num(await amount(page));
    ok(a !== last, `${tag} ${id} price changed ${last}->${a}`);
    last = a;
    await noSideScroll(page, `${tag} ${id}`);
  }
  // options
  const inside = page.locator('.svc[data-id="windows"] .chip').first();
  await inside.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await sleep(250);
  try { await inside.click({ timeout: 8000 }); }
  catch (e) { ok(false, `${tag} inside windows chip ${e.message.split('\n')[0]}`); }
  await sleep(700);
  ok(num(await amount(page)) !== last, `${tag} inside windows changes price`);
  await page.evaluate(() => scrollTo(0, 0)); await sleep(500);
  await page.screenshot({ path: `${OUT}/${fk}-${w}-2-clean.png` });
  if (phone) ok(await page.$eval('#bar', e => e.classList.contains('show')), `${tag} price bar shows`);
  // form
  await page.locator('#name').scrollIntoViewIfNeeded();
  ok(await page.$$eval('input', l => l.filter(i => /zip|postal|street|address/i.test(i.id + i.name + i.placeholder + i.autocomplete)).length) === 0, `${tag} no address or zip`);
  await page.fill('#name', 'Yusuf');
  const national = mk.dial === '+966' ? '050 123 4567' : mk.dial === '+64' ? '021 123 4567' : mk.dial === '+353' ? '087 123 4567' : mk.dial === '+44' ? '07700 900123' : mk.dial === '+61' ? '0412 345 678' : '555 010 2030';
  await page.fill('#phone', national);
  if (w === 1440 && mk.region === 'US') { await page.locator('#cc').selectOption('AE', { force: true }); }
  await page.locator('#locBtn').click(); await sleep(1500);
  ok(await page.$eval('#loc', e => e.classList.contains('has')), `${tag} location pin added`);
  // drag the map so the pin moves, then the message must carry the new spot
  const mb = await page.locator('.map').boundingBox();
  await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2); await page.mouse.down();
  await page.mouse.move(mb.x + mb.width / 2 - 64, mb.y + mb.height / 2 - 32, { steps: 6 }); await page.mouse.up(); await sleep(300);
  const moved = await page.evaluate(() => window.__gleamLoc());
  ok(moved && moved.moved && moved.lng > -0.1246 && moved.lat < 51.5007, `${tag} pin drag moves location`);
  const mapsUrl = moved ? `https://maps.google.com/?q=${moved.lat.toFixed(6)},${moved.lng.toFixed(6)}` : 'x';
  const osmVis = await page.$eval('#osm', e => !e.hidden);
  if (osmVis) ok(/OpenStreetMap contributors/.test(await page.$eval('#osm', e => e.textContent)), `${tag} OSM attribution`);
  await sleep(600);
  await page.locator('#summary').scrollIntoViewIfNeeded(); await sleep(500);
  await page.screenshot({ path: `${OUT}/${fk}-${w}-3-form.png` });
  await noSideScroll(page, tag + ' form');
  await dashCheck(page, tag + ' form');
  const btnTxt = await page.$eval('#sumBtn', e => e.textContent.trim());
  ok(btnTxt === mk.btn, `${tag} button "${btnTxt}"`);
  ok(!(await page.$eval('#sumBtn', e => e.disabled)), `${tag} book enabled`);
  const total = await amount(page);
  await page.locator('#sumBtn').click(); await sleep(300);
  const links = await page.evaluate(() => window.__links);
  ok(links.length === 1, `${tag} one booking link`);
  const href = links[0] || '';
  const expDial = (w === 1440 && mk.region === 'US') ? '+971' : mk.dial;
  if (mk.scheme === 'sms') ok(href.startsWith('sms:+971500000000?&body='), `${tag} sms link ${href.slice(0, 40)}`);
  else ok(href.startsWith('https://wa.me/971500000000?text='), `${tag} wa link ${href.slice(0, 40)}`);
  const body = decodeURIComponent(href.split(/body=|text=/)[1] || '');
  ok(body.includes(mk.ar ? 'مرحبا جليم' : 'Hi Gleam'), `${tag} body greeting`);
  ok(body.includes('Yusuf'), `${tag} body name`);
  ok(body.includes(`${expDial} ${national.replace(/^0/, '')}`), `${tag} body mobile with ${expDial}`);
  ok(body.includes(total), `${tag} body total ${total}`);
  ok(body.includes(mapsUrl), `${tag} body exact maps link ${mapsUrl}`);
  const labels = mk.ar ? ['النوافذ، من الخارج والداخل', 'الألواح الشمسية', 'المزاريب', 'غسيل السطح', 'غسيل الواجهات', 'الممر والمواقف', 'الحوش والممرات'] : ['Windows, outside and inside', 'Solar panels', 'Gutters', 'Roof soft wash', 'Walls soft wash', 'Driveway', 'Patio and paths'];
  for (const l of labels) ok(body.includes(l), `${tag} body has ${l}`);
  ok(mk.scheme === 'sms' ? !body.includes('*') : body.includes(mk.ar ? '*التقدير' : '*Estimate'), `${tag} message formatting`);
  if (mk.ar) ok(!/[A-Za-z]{3,}/.test(body.replace(/https?:\S+/g, '').replace('Yusuf', '')), `${tag} message all Arabic`);
  ok(!DASH.test(body.replace(/https?:\S+/g, '')), `${tag} no dash in message`);
  messages[mk.key || mk.path] = body;
  if (mk.ar) {
    // English switch on the Saudi page
    await page.evaluate(() => scrollTo(0, 0)); await sleep(2500); await page.locator('#langSw button[data-lang="en"]').click(); await sleep(700);
    ok(await page.evaluate(() => document.documentElement.dir === 'ltr' && document.querySelector('h1').textContent.startsWith('Your price')), `${tag} EN switch`);
    ok((await page.$eval('#sumBtn', e => e.textContent.trim())) === 'Book on WhatsApp', `${tag} EN button`);
    ok((await amount(page)).includes('SAR'), `${tag} EN keeps SAR`);
    await dashCheck(page, tag + ' en');
    await noSideScroll(page, tag + ' en');
    await page.evaluate(() => { window.__links = []; }); await page.locator('#sumBtn').click(); await sleep(300);
    const b2 = decodeURIComponent(((await page.evaluate(() => window.__links[0])) || '').split('text=')[1] || '');
    ok(b2.includes('Hi Gleam') && b2.includes('Small villa') === false || b2.includes('Medium villa'), `${tag} EN message`);
    await page.screenshot({ path: `${OUT}/sa-${w}-5-english.png` });
    await page.locator('#langSw button[data-lang="ar"]').click(); await sleep(500);
    ok(await page.evaluate(() => document.documentElement.dir) === 'rtl', `${tag} back to Arabic`);
  }
  ok(errs.length === 0, `${tag} page errors ${errs.join(';')}`);
  await page.screenshot({ path: `${OUT}/${fk}-${w}-4-full.png`, fullPage: true });
  await ctx.close();
}
// root guesses, and ?region= still works
for (const [tz, q, exp] of [['Europe/London', '', 'UK'], ['Australia/Sydney', '', 'AU'], ['America/Toronto', '', 'CA'], ['Europe/Dublin', '', 'IE'], ['Asia/Dubai', '?region=ie', 'IE'], ['Asia/Dubai', '?region=au', 'AU'], ['Asia/Dubai', '?region=uk', 'UK'], ['Europe/London', '?region=ca', 'CA'], ['Asia/Riyadh', '', 'SA'], ['Pacific/Auckland', '', 'NZ'], ['Asia/Dubai', '?region=sa', 'SA'], ['Asia/Dubai', '?region=nz', 'NZ']]) {
  const ctx = await browser.newContext({ timezoneId: tz, viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage(); await page.goto(BASE + '/' + q);
  ok(await page.$eval('#region', e => e.value) === exp, `root ${tz} ${q} -> ${exp}`);
  await ctx.close();
}
// location denied: friendly note, booking still works without a map link
for (const mk of MARKETS) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, timezoneId: mk.tz || 'Asia/Dubai' });
  await ctx.addInitScript(() => { window.__links = []; const o = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (/^(sms:|https:\/\/wa\.me)/.test(this.href)) { window.__links.push(this.href); return; } return o.call(this); }; navigator.geolocation.getCurrentPosition = (s, e) => setTimeout(() => e({ code: 1, message: 'denied' }), 50); });
  if (mk.ar) await ctx.addInitScript(() => localStorage.setItem('gleam.lang', 'ar'));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + mk.path, { waitUntil: 'networkidle' });
  await page.locator('.svc[data-id="gutters"] .svc-main').click();
  await page.fill('#name', 'Omar'); await page.fill('#phone', '0412345678');
  await page.locator('#locBtn').click(); await sleep(400);
  const s = await page.$eval('#locS', e => e.textContent);
  ok(!(await page.$eval('#loc', e => e.classList.contains('has'))) && (mk.ar ? /تقدر تحجز/.test(s) : /still book/.test(s)), `${mk.key || mk.path} denied note "${s}"`);
  await page.locator('#sumBtn').click(); await sleep(300);
  const h = await page.evaluate(() => window.__links[0] || '');
  ok(h.startsWith(mk.scheme === 'sms' ? 'sms:+971500000000' : 'https://wa.me/971500000000') && !decodeURIComponent(h).includes('maps.google'), `${mk.key || mk.path} denied still books`);
  ok(errs.length === 0, `${mk.key || mk.path} denied errors ${errs}`);
  if (mk.path === '/us/' || mk.sa) await page.screenshot({ path: `${OUT}/${mk.key || mk.path.replace(/\//g, '')}-390-location-denied.png` });
  await ctx.close();
}
// fallback: without WebGL or with the 3D script blocked, the drawn house still works
for (const mode of ['flat', 'blocked']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  if (mode === 'blocked') await page.route(/jsdelivr|house3d/, r => r.abort());
  await page.goto(BASE + '/uk/' + (mode === 'flat' ? '?flat=1' : ''), { waitUntil: 'networkidle' }); await sleep(1500);
  ok(await page.evaluate(() => !document.querySelector('.stage').classList.contains('gl-on') && getComputedStyle(document.querySelector('#house')).display !== 'none'), `fallback ${mode}: still house shown`);
  await page.locator('#house .part[data-part="walls"]').click({ force: true }); await sleep(300);
  ok(await page.$eval('#house', e => e.classList.contains('c-walls')), `fallback ${mode}: tap works`);
  await page.locator('.stage').screenshot({ path: `${OUT}/fallback-${mode}-390.png` });
  await ctx.close();
}
// drag turns the house
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); await page.goto(BASE + '/us/'); await page.waitForFunction(() => window.__h3d, null, { timeout: 20000 }); await sleep(800);
  const box = await page.locator('canvas.gl3').boundingBox();
  const sel0 = await page.$eval('#sumAmt', e => e.textContent);
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 8 }); await page.mouse.up(); await sleep(200);
  ok(await page.$eval('#sumAmt', e => e.textContent) === sel0, 'drag does not select a part');
  await page.screenshot({ path: `${OUT}/us-1280-drag.png` });
  await ctx.close();
}
// owner: one number, one config block, prices in one place
const src = fs.readFileSync(process.env.SRC || new URL('../src/index.html', import.meta.url), 'utf8');
const houseSrc = fs.readFileSync(new URL('../src/house3d.js', import.meta.url), 'utf8');
ok((src.match(/971500000000/g) || []).length === 1, 'owner: placeholder number set in one place');
ok(src.indexOf('BUSINESS SETTINGS') < src.indexOf('const SIZES'), 'owner: settings block at top of script');
ok(/booking: 'sms'/.test(src) && /booking: 'whatsapp'/.test(src), 'owner: booking channel per market');
ok(!/prefers-color-scheme/.test(src + houseSrc), 'owner: theme does not follow the system scheme');
ok(/color-scheme:\s*only light/.test(src) && /color-scheme:\s*only dark/.test(src), 'owner: explicit color scheme for both themes');
ok(src.indexOf("localStorage.getItem('gleam.theme')") < src.indexOf('<style>'), 'owner: saved theme is applied before first paint');
ok(/id="themeBtn"/.test(src) && /gleam\.theme/.test(src), 'owner: theme toggle is remembered');
ok(/background-color:#ECEEEE/.test(src) && /background-color:#F9FAFA/.test(src) && /background-color:var\(--bg\)/.test(src), 'owner: explicit light backgrounds');
ok(/0xeceeee/.test(houseSrc) && /0x121618/.test(houseSrc) && /NoToneMapping/.test(houseSrc) && /HemisphereLight/.test(houseSrc), 'owner: house clear colour matches the page');

// Light and dark emulation must render the same bright page.
const { PNG } = await import('pngjs');
const pixelmatch = (await import('pixelmatch')).default;
const SCHEME_WIDTHS = [360, 390, 1440];
const bright = (label, value) => {
  const m = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  ok(!!m && Number(m[1]) >= 220 && Number(m[2]) >= 220 && Number(m[3]) >= 220, `${label} background ${value}`);
};
function pngDiff(aPath, bPath) {
  const a = PNG.sync.read(fs.readFileSync(aPath));
  const b = PNG.sync.read(fs.readFileSync(bPath));
  if (a.width !== b.width || a.height !== b.height) return { ratio: 1, mismatch: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  return { ratio: n / (a.width * a.height), n };
}
for (const mk of MARKETS) {
  if (mk.path === '/') continue;
  for (const w of SCHEME_WIDTHS) {
    const tag = `scheme ${mk.key || mk.path} ${w}`;
    const fk = mk.key || (mk.path.replace(/\//g, '') || 'root');
    const shots = {};
    for (const scheme of ['light', 'dark']) {
      const phone = w < 960;
      const ctx = await browser.newContext({
        viewport: { width: w, height: phone ? 800 : 900 },
        deviceScaleFactor: 1,
        hasTouch: phone,
        isMobile: phone,
        colorScheme: scheme,
        reducedMotion: 'reduce',
        timezoneId: 'Asia/Dubai',
      });
      if (mk.ar) await ctx.addInitScript(() => localStorage.setItem('gleam.lang', 'ar'));
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !/tile\.openstreetmap|ERR_|net::/.test(m.text() + (m.location().url || ''))) errs.push('console: ' + m.text()); });
      await page.goto(BASE + mk.path, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => {
        const root = document.documentElement;
        const stage = document.querySelector('.stage.gl-show');
        const h = window.__h3d;
        const canvas = document.querySelector('canvas.gl3');
        if (!stage || !h || !canvas) return false;
        if (root.classList.contains('lang-out') || root.classList.contains('lang-swap')) return false;
        if (getComputedStyle(canvas).opacity !== '1') return false;
        const v = h.view();
        const key = [v.az, v.el, v.dist, h.dirt('walls'), h.dirt('roof')].map(n => (+n).toFixed(4)).join();
        if (window.__schemeKey !== key) { window.__schemeKey = key; window.__schemeN = 0; return false; }
        return ++window.__schemeN >= 4;
      }, null, { timeout: 20000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      const info = await page.evaluate(() => {
        const bg = el => el ? getComputedStyle(el).backgroundColor : '';
        const cs = getComputedStyle(document.documentElement);
        return {
          scheme: cs.colorScheme,
          html: bg(document.documentElement),
          body: bg(document.body),
          input: bg(document.querySelector('#name')),
          phone: bg(document.querySelector('#phone')),
          canvas: bg(document.querySelector('canvas.gl3')),
          bgVar: cs.getPropertyValue('--bg').trim(),
          wall: cs.getPropertyValue('--h-wall').trim(),
          sw: document.documentElement.scrollWidth,
          w: innerWidth,
          fps: window.__h3d ? window.__h3d.fps() : 0,
        };
      });
      ok(info.sw <= info.w, `${tag} ${scheme} sideways scroll ${info.sw}>${info.w}`);
      ok(/light/.test(info.scheme) && !/^dark$/.test(info.scheme), `${tag} ${scheme} used scheme ${info.scheme}`);
      ok(sameColor(info.bgVar, '#ECEEEE'), `${tag} ${scheme} --bg ${info.bgVar}`);
      ok(sameColor(info.wall, '#FFFFFF'), `${tag} ${scheme} wall token ${info.wall}`);
      bright(`${tag} ${scheme} html`, info.html);
      bright(`${tag} ${scheme} body`, info.body);
      bright(`${tag} ${scheme} input`, info.input);
      bright(`${tag} ${scheme} phone`, info.phone);
      bright(`${tag} ${scheme} canvas`, info.canvas);
      ok(errs.length === 0, `${tag} ${scheme} page errors ${errs.join(';')}`);
      if (phone) fpsLog.push(`${tag} ${scheme} ${info.fps}`);
      const path = `${OUT}/scheme-${fk}-${w}-${scheme}.png`;
      await page.screenshot({ path });
      shots[scheme] = path;
      await ctx.close();
    }
    const diff = pngDiff(shots.light, shots.dark);
    ok(diff.ratio < 0.005, `${tag} system schemes differ ${(diff.ratio * 100).toFixed(2)}% ${diff.mismatch || ''}`);
  }
}
function parseRgb(value) {
  const m = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function sameColor(value, hex) {
  const v = String(value).trim();
  if (v.toUpperCase() === hex.toUpperCase()) return true;
  const rgb = parseRgb(v);
  const h = hex.replace('#', '');
  if (!rgb || h.length !== 6) return false;
  return rgb[0] === parseInt(h.slice(0, 2), 16) && rgb[1] === parseInt(h.slice(2, 4), 16) && rgb[2] === parseInt(h.slice(4, 6), 16);
}
function relLum([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const L1 = relLum(a), L2 = relLum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
// Chosen themes. System dark mode still opens on the light design, then the toggle switches.
for (const mk of MARKETS) {
  if (mk.path === '/') continue;
  for (const w of SCHEME_WIDTHS) {
    const tag = `theme ${mk.key || mk.path} ${w}`;
    const fk = mk.key || (mk.path.replace(/\//g, '') || 'root');
    const phone = w < 960;
    const ctx = await browser.newContext({
      viewport: { width: w, height: phone ? 800 : 900 },
      deviceScaleFactor: 1,
      hasTouch: phone,
      isMobile: phone,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      timezoneId: 'Asia/Dubai',
    });
    if (mk.ar) await ctx.addInitScript(() => localStorage.setItem('gleam.lang', 'ar'));
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/tile\.openstreetmap|ERR_|net::/.test(m.text() + (m.location().url || ''))) errs.push('console: ' + m.text()); });
    await page.goto(BASE + mk.path, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__h3d && window.__h3d.fps() > 0, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await sleep(400);
    ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'light', `${tag} defaults to light`);
    await page.screenshot({ path: `${OUT}/theme-${fk}-${w}-light.png` });
    await page.locator('#themeBtn').click();
    await sleep(700);
    const dark = await page.evaluate(() => {
      const bg = el => getComputedStyle(el).backgroundColor;
      const cs = getComputedStyle(document.documentElement);
      const theme = document.querySelector('#themeBtn').getBoundingClientRect();
      const region = document.querySelector('.region').getBoundingClientRect();
      return {
        theme: document.documentElement.getAttribute('data-theme'),
        scheme: cs.colorScheme,
        stored: localStorage.getItem('gleam.theme'),
        body: bg(document.body),
        text: getComputedStyle(document.body).color,
        muted: getComputedStyle(document.querySelector('.hero p')).color,
        input: bg(document.querySelector('#phone')),
        canvas: bg(document.querySelector('canvas.gl3')),
        label: document.querySelector('#themeBtn').getAttribute('aria-label'),
        sw: document.documentElement.scrollWidth,
        w: innerWidth,
        themeBox: { left: theme.left, right: theme.right, top: theme.top, bottom: theme.bottom },
        regionBox: { left: region.left, right: region.right, top: region.top, bottom: region.bottom },
        dir: document.documentElement.dir,
        house: !!(window.__h3d && window.__h3d.fps() >= 0),
      };
    });
    ok(dark.theme === 'dark' && dark.stored === 'dark', `${tag} toggle stores dark`);
    ok(/dark/.test(dark.scheme), `${tag} color scheme ${dark.scheme}`);
    const body = parseRgb(dark.body), text = parseRgb(dark.text), muted = parseRgb(dark.muted), input = parseRgb(dark.input), canvas = parseRgb(dark.canvas);
    ok(body && body.every(c => c < 40), `${tag} charcoal page ${dark.body}`);
    ok(text && body && contrast(text, body) >= 7, `${tag} text contrast`);
    ok(muted && body && contrast(muted, body) >= 4.5, `${tag} muted contrast`);
    ok(input && input.every(c => c < 55), `${tag} input surface ${dark.input}`);
    ok(canvas && canvas.every(c => c < 72), `${tag} house stage ${dark.canvas}`);
    ok(dark.house, `${tag} 3D house still mounted`);
    ok(dark.sw <= dark.w, `${tag} sideways scroll ${dark.sw}>${dark.w}`);
    const gap = Math.min(Math.abs(dark.themeBox.left - dark.regionBox.right), Math.abs(dark.regionBox.left - dark.themeBox.right));
    const sameRow = dark.themeBox.top < dark.regionBox.bottom && dark.regionBox.top < dark.themeBox.bottom;
    ok(gap <= 20 && sameRow, `${tag} toggle beside market picker gap ${gap}`);
    ok(dark.themeBox.left >= -1 && dark.themeBox.right <= dark.w + 1, `${tag} toggle inside the viewport`);
    ok(dark.dir === 'rtl' ? gap <= 20 : true, `${tag} rtl toggle placement`);
    ok(!DASH.test(dark.label), `${tag} toggle label dash ${dark.label}`);
    if (mk.ar) ok(dark.label === 'حول إلى المظهر الفاتح', `${tag} arabic toggle label ${dark.label}`);
    ok(errs.length === 0, `${tag} page errors ${errs.join(';')}`);
    await page.screenshot({ path: `${OUT}/theme-${fk}-${w}-dark.png` });
    await page.reload({ waitUntil: 'domcontentloaded' });
    ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark' && getComputedStyle(document.body).backgroundColor !== 'rgb(236, 238, 238)'), `${tag} dark theme restored before paint`);
    await ctx.close();
  }
}
fs.writeFileSync(`${OUT}/messages.txt`, Object.entries(messages).map(([k, v]) => `==== ${k}\n${v}\n`).join('\n'));
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ base: BASE, pass, fail, fails, fps: fpsLog }, null, 1));
console.log(`PASS ${pass} FAIL ${fail}`);
await browser.close();
process.exit(fail ? 1 : 0);
