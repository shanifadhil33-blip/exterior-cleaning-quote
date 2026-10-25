import re,sys
p='src/index.html'; s=open(p).read()
def R(a,b,count=1):
    global s
    n=s.count(a)
    if n<1: sys.exit('MISSING: '+a[:80])
    s=s.replace(a,b) if count==0 else s.replace(a,b,count)

# head
R('and book it on WhatsApp.">','and book it by text or WhatsApp.">')
# CSS
R('  --h-sweep:#FFFFFF;\n','  --h-sweep:#FFFFFF;\n  --h-panel:#3E474D;\n  --h-cell:rgba(255,255,255,.22);\n')
R('    --h-sweep:#FFFFFF;\n','    --h-sweep:#FFFFFF;\n    --h-panel:#0B0E10;\n    --h-cell:rgba(238,241,242,.16);\n')
R('.c-roof .g-roof,','.c-solar .g-solar,.c-roof .g-roof,')
R('.c-windows .shine{opacity:.95}','.c-windows .shine{opacity:.95}\n.f-panel{fill:var(--h-panel)}.s-cell{stroke:var(--h-cell);stroke-width:.8}\n.pshine{opacity:.1;transition:opacity .8s ease .3s}\n.c-solar .pshine{opacity:.55}\n.nb{opacity:.5}')
R('.seg{position:relative;display:grid;grid-template-columns:repeat(3,1fr);','.seg{--cols:3;--rows:1;position:relative;display:grid;grid-template-columns:repeat(var(--cols),1fr);')
R('.seg-thumb{position:absolute;top:4px;bottom:4px;left:4px;width:calc((100% - 8px) / 3);','.seg-thumb{position:absolute;top:4px;left:4px;height:calc((100% - 8px) / var(--rows));width:calc((100% - 8px) / var(--cols));')
R('.hint{margin:7px','''.tel{display:flex;gap:8px}
.cc{position:relative;flex:none;display:flex;align-items:center;gap:6px;height:54px;padding:0 30px 0 14px;border:1px solid var(--line-2);border-radius:14px;background:var(--surface);font-size:16px;font-weight:550;white-space:nowrap;transition:border-color .2s,box-shadow .2s}
.cc::after{content:"";position:absolute;right:13px;top:50%;width:6px;height:6px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:translateY(-70%) rotate(45deg);pointer-events:none}
.cc select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:16px;-webkit-appearance:none;appearance:none}
.cc:focus-within{border-color:var(--ink);box-shadow:0 0 0 4px var(--ring)}
.tel .input{flex:1;min-width:0}
.hint{margin:7px''')
R('.osm{position:absolute;right:8px;bottom:6px;padding:2px 6px;border-radius:6px;background:var(--surface);font-size:10px;color:var(--muted)}',
  '.osm{position:absolute;right:8px;bottom:6px;padding:2px 6px;border-radius:6px;background:var(--surface);font-size:11px;color:var(--muted);text-decoration:none}\n.osm:hover{text-decoration:underline}')
# HTML
R('<p>Tap what needs cleaning and watch the price build. Book it on WhatsApp when it looks right.</p>','<p id="heroP">Tap what needs cleaning and watch the price build.</p>')
R('<label class="field"><span>Mobile number</span><input class="input" id="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Your WhatsApp number" maxlength="24"><p class="hint" id="phoneHint" aria-live="polite"></p></label>',
  '<div class="field"><span id="hPhone">Mobile number</span><div class="tel"><label class="cc"><span id="ccShow"></span><select id="cc" aria-label="Country code"></select></label><input class="input" id="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="Mobile number" maxlength="20" aria-labelledby="hPhone"></div><p class="hint" id="phoneHint" aria-live="polite"></p></div>')
R('Optional. Adds a map pin to your message.</span>','Adds a map pin to your message.</span>')
R('<div class="map" aria-hidden="true">\n            <div class="map-bg" id="mapBg"></div>\n            <div class="tiles" id="tiles"></div>\n            <span class="pin-pulse"></span>\n            <svg class="pin" viewBox="0 0 34 44">',
  '<div class="map">\n            <div class="map-bg" id="mapBg" aria-hidden="true"></div>\n            <div class="tiles" id="tiles" aria-hidden="true"></div>\n            <span class="pin-pulse" aria-hidden="true"></span>\n            <svg class="pin" viewBox="0 0 34 44" aria-hidden="true">')
R('<span class="osm" id="osm" hidden>© OpenStreetMap</span>','<a class="osm" id="osm" hidden href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a>')
R('<p class="note">Based on what you picked. The final price is confirmed with you on WhatsApp.</p>','<p class="note" id="note">Based on what you picked.</p>')

# JS config
R("const WHATSAPP_NUMBER = '971500000000'; // digits only, country code first",
"""// Placeholder only. Put the firm's own number here, digits only, country code first.
// The same number is used for text messages and WhatsApp.
const BOOKING_NUMBER = '971500000000';""")
R("""  regions: {
    US: { label: 'US $', currency: 'USD', locale: 'en-US', minimum: 150, units: 'ft',""",
"""  // Each market: how customers book ('sms' opens a text message, 'whatsapp' opens wa.me),
  // the default country code for the mobile field, the home types shown and all prices.
  regions: {
    US: { label: 'US $', currency: 'USD', locale: 'en-US', minimum: 150, units: 'ft',
      booking: 'sms', country: 'US', sizes: ['S', 'M', 'L'],""")
R("""        windowsInside: { S:  90, M: 135, L: 195 },""","""        windowsInside: { S:  90, M: 135, L: 195 },
        solar:         { S: 150, M: 200, L: 275 },""")
R("""    UK: { label: 'UK £', currency: 'GBP', locale: 'en-GB', minimum: 40, units: 'm',
      words: { pipes: 'downpipes', walls: 'Render, brick or cladding' },
      prices: {
        windows:       { S: 30, M: 45, L: 65 },
        windowsInside: { S: 30, M: 45, L: 65 },
        gutters:       { S: 70, M: 95, L: 140 },
        roof:          { S: 400, M: 600, L: 900 },
        walls:         { S: 350, M: 550, L: 800 },""",
"""    UK: { label: 'UK £', currency: 'GBP', locale: 'en-GB', minimum: 40, units: 'm',
      booking: 'whatsapp', country: 'GB', sizes: ['DET', 'SEMI', 'TER', 'BUN'],
      words: { pipes: 'downpipes', walls: 'Render, brick or cladding' },
      prices: {
        windows:       { TER: 25, SEMI: 35, DET: 50, BUN: 35 },
        windowsInside: { TER: 25, SEMI: 35, DET: 50, BUN: 35 },
        solar:         { TER: 70, SEMI: 80, DET: 100, BUN: 90 },
        gutters:       { TER: 60, SEMI: 85, DET: 120, BUN: 80 },
        roof:          { TER: 350, SEMI: 500, DET: 750, BUN: 550 },
        walls:         { TER: 300, SEMI: 450, DET: 700, BUN: 450 },""")
R("""    AU: { label: 'AU $', currency: 'AUD', locale: 'en-AU', minimum: 160, units: 'm',""","""    AU: { label: 'AU $', currency: 'AUD', locale: 'en-AU', minimum: 160, units: 'm',
      booking: 'whatsapp', country: 'AU', sizes: ['S', 'M', 'L'],""")
R("""        windowsInside: { S: 120, M: 180, L: 260 },""","""        windowsInside: { S: 120, M: 180, L: 260 },
        solar:         { S: 150, M: 200, L: 280 },""")
R("""    CA: { label: 'CA $', currency: 'CAD', locale: 'en-CA', minimum: 165, units: 'm',""","""    CA: { label: 'CA $', currency: 'CAD', locale: 'en-CA', minimum: 165, units: 'm',
      booking: 'sms', country: 'CA', sizes: ['S', 'M', 'L'],""")
R("""        windowsInside: { S: 100, M: 155, L: 220 },""","""        windowsInside: { S: 100, M: 155, L: 220 },
        solar:         { S: 160, M: 220, L: 300 },""")
R("""  L: { label: 'Large',  sub: '2 floors, 4+ beds', floors: 2, bays: 4, door: 1, garage: 100, seed: 37 }
};
const SIZE_KEYS = ['S', 'M', 'L'];""",
"""  L: { label: 'Large',  sub: '2 floors, 4+ beds', floors: 2, bays: 4, door: 1, garage: 100, seed: 37 },
  DET:  { label: 'Detached',      sub: '2 floors, garage', floors: 2, bays: 3, door: 1, garage: 68, seed: 23 },
  SEMI: { label: 'Semi detached', sub: 'One shared wall',  floors: 2, bays: 2, door: 1, garage: 0, neigh: 'left', seed: 29 },
  TER:  { label: 'Terraced',      sub: 'In a row',         floors: 2, bays: 2, door: 1, garage: 0, neigh: 'both', seed: 31 },
  BUN:  { label: 'Bungalow',      sub: '1 floor',          floors: 1, bays: 4, door: 1, garage: 58, seed: 41 }
};
const SIZE_SWAP = { S: 'TER', M: 'SEMI', L: 'DET', DET: 'L', SEMI: 'M', TER: 'S', BUN: 'S' };
const sizeKeys = () => R().sizes;

// Country codes for the mobile field. The market's own code is listed first.
const COUNTRIES = [
  ['US', 'United States', '+1', '🇺🇸'], ['CA', 'Canada', '+1', '🇨🇦'], ['GB', 'United Kingdom', '+44', '🇬🇧'],
  ['AU', 'Australia', '+61', '🇦🇺'], ['IE', 'Ireland', '+353', '🇮🇪'], ['NZ', 'New Zealand', '+64', '🇳🇿'],
  ['AE', 'United Arab Emirates', '+971', '🇦🇪'], ['SA', 'Saudi Arabia', '+966', '🇸🇦'], ['QA', 'Qatar', '+974', '🇶🇦'],
  ['IN', 'India', '+91', '🇮🇳'], ['PK', 'Pakistan', '+92', '🇵🇰'], ['PH', 'Philippines', '+63', '🇵🇭'],
  ['ZA', 'South Africa', '+27', '🇿🇦'], ['SG', 'Singapore', '+65', '🇸🇬'], ['MX', 'Mexico', '+52', '🇲🇽'],
  ['DE', 'Germany', '+49', '🇩🇪'], ['FR', 'France', '+33', '🇫🇷'], ['ES', 'Spain', '+34', '🇪🇸'],
  ['IT', 'Italy', '+39', '🇮🇹'], ['NL', 'Netherlands', '+31', '🇳🇱'], ['PL', 'Poland', '+48', '🇵🇱']
];
const COPY = {
  sms: { hero: 'Text it to us when it looks right.', btn: 'Text us', busy: 'Opening messages',
    note: 'The final price is confirmed with you by text.', ready: 'Opens your messages with your request ready to send.',
    sent: 'Your request is ready in your messages. Tap send to book.' },
  whatsapp: { hero: 'Book it on WhatsApp when it looks right.', btn: 'Book on WhatsApp', busy: 'Opening WhatsApp',
    note: 'The final price is confirmed with you on WhatsApp.', ready: 'Opens WhatsApp with your request ready to send.',
    sent: 'Your request is ready in WhatsApp. Tap send to book.' }
};""")
R("""  roof:     SVG_ICON(""","""  solar:    SVG_ICON('<path d="M5 9h14l2 9H3z"/><path d="M4 13.5h16M9.6 9l-1 9M14.4 9l1 9"/><path d="M12 2.5v2M6.5 4.5l1 1.2M17.5 4.5l-1 1.2"/>'),
  roof:     SVG_ICON(""")
R("""  { id: 'roof',     name: 'Roof soft wash',""","""  { id: 'solar',    name: 'Solar panels',     desc: () => 'Dust and bird mess rinsed off' },
  { id: 'roof',     name: 'Roof soft wash',""")
R("""  day: 'any', time: 'any', name: '', phone: '', loc: null,""","""  day: 'any', time: 'any', name: '', phone: '', cc: 'US', ccTouched: false, loc: null,""")
R("""const detailsEl = $('#details'), regionSel = $('#region');""","""const detailsEl = $('#details'), regionSel = $('#region');
const ccSel = $('#cc'), ccShow = $('#ccShow'), heroP = $('#heroP'), noteEl = $('#note');
const BK = () => COPY[R().booking] || COPY.whatsapp;""")
R("""  const s = SIZES[key];""","""  const s = SIZES[key], noGar = !s.garage, NL = s.neigh === 'left' || s.neigh === 'both', NR = s.neigh === 'both';""")
R("""  const roofMain = [[x0 - 12, wt], [x0 + mw + 12, wt], [x0 + mw - 30, rTop], [x0 + 30, rTop]];""",
"""  const roofMain = [[NL ? x0 : x0 - 12, wt], [NR ? x0 + mw : x0 + mw + 12, wt], [NR ? x0 + mw : x0 + mw - 30, rTop], [NL ? x0 : x0 + 30, rTop]];""")
R("""  const drive = [[gx + 7, G], [gx + gw - 5, G], [gx + gw + 24, H], [gx - 16, H]];""",
"""  const drive = !noGar ? [[gx + 7, G], [gx + gw - 5, G], [gx + gw + 24, H], [gx - 16, H]]
    : NR ? [[dx + dw + 12, G], [x0 + mw - 2, G], [x0 + mw + 14, H], [dx + dw + 6, H]]
    : [[x0 + mw + 8, G], [x0 + mw + 62, G], [x0 + mw + 86, H], [x0 + mw - 6, H]];
  const dL = drive[0][0], dR = drive[1][0], dWid = dR - dL;""")
R("""  const guts = [{ x: x0 - 14, y: wt - 3, w: mw + 28, h: 6 }, { x: gx - 2, y: gTop - 3, w: gw + 12, h: 5 }];
  const pipes = [{ x: x0 - 9, y: wt + 3, w: 4, h: G - wt - 7 }, { x: gx + gw + 3, y: gTop + 2, w: 4, h: gh - 6 }];
  const elbows = [{ x: x0 - 13, y: G - 5, w: 8, h: 4 }, { x: gx + gw + 1, y: G - 5, w: 8, h: 4 }];""",
"""  const guts = [{ x: NL ? x0 : x0 - 14, y: wt - 3, w: mw + (NL ? 0 : 14) + (NR ? 0 : 14), h: 6 }];
  if (!noGar) guts.push({ x: gx - 2, y: gTop - 3, w: gw + 12, h: 5 });
  const pipes = [];
  pipes.push(NL ? { x: x0 + 3, y: wt + 3, w: 4, h: G - wt - 7 } : { x: x0 - 9, y: wt + 3, w: 4, h: G - wt - 7 });
  pipes.push(noGar ? { x: x0 + mw - 7, y: wt + 3, w: 4, h: G - wt - 7 } : { x: gx + gw + 3, y: gTop + 2, w: 4, h: gh - 6 });
  const elbows = pipes.map(p => ({ x: p.x - 3, y: G - 5, w: 8, h: 4 }));
  // solar panels on the main roof, clear of the chimney
  const chX = s.bays <= 2 ? x0 + mw - 40 : x0 + mw - 66;
  const pTop = rTop + 7, pH = wt - rTop - 15, pW = 18;
  const pCount = Math.max(2, Math.floor((chX - x0 - 34) / (pW + 2)));
  const panels = [];
  for (let i = 0; i < pCount; i++) panels.push({ x: x0 + 28 + i * (pW + 2), y: pTop, w: pW, h: pH });""")
R("""    `<clipPath id="cp-roof"><polygon points="${P(roofGar)}"/><polygon points="${P(roofMain)}"/></clipPath>` +""",
"""    `<clipPath id="cp-roof">${noGar ? '' : `<polygon points="${P(roofGar)}"/>`}<polygon points="${P(roofMain)}"/></clipPath>` +
    `<clipPath id="cp-solar">${panels.map(q => rect(q.x, q.y, q.w, q.h, '')).join('')}</clipPath>` +""")
R("""  if (x0 > 72) {""","""  if (s.neigh) {
    const nb = nx => {
      let h = rect(nx, wt, mw, G - wt, 'base f-wall2');
      const rf = nx < x0 ? [[nx - (NR ? 0 : 12), wt], [nx + mw, wt], [nx + mw, rTop], [nx + (NR ? 0 : 30), rTop]]
                         : [[nx, wt], [nx + mw, wt], [nx + mw, rTop], [nx, rTop]];
      h += `<polygon points="${P(rf)}" class="base f-roof"/>`;
      for (let f = 0; f < s.floors; f++) for (let b = 0; b < s.bays; b++) {
        const top = G - (f + 1) * FH;
        h += rect(nx + PAD + b * BW + 10, top + (f === 0 ? 13 : 11), 30, f === 0 ? 31 : 34, 'base f-glass');
      }
      return h;
    };
    deco += `<g class="deco nb">${NL ? nb(x0 - mw) : ''}${NR ? nb(x0 + mw) : ''}</g>`;
  } else if (x0 > 72) {""")
R("""  const cx = gx + gw / 2;""","""  const cx = (dL + dR) / 2;""")
R("""  let dG = `<polygon points="${P([[cx - gw * 0.34, G], [cx - gw * 0.2, G], [cx - gw * 0.24, H], [cx - gw * 0.48, H]])}" class="f-grime" opacity=".13"/>` +
           `<polygon points="${P([[cx + gw * 0.2, G], [cx + gw * 0.34, G], [cx + gw * 0.52, H], [cx + gw * 0.3, H]])}" class="f-grime" opacity=".13"/>`;
  for (let i = 0; i < 6; i++) dG += ell(r(gx + 2, gx + gw + 6), r(G + 7, H - 6), r(3, 9), r(1.6, 4), r(0.22, 0.48));""",
"""  let dG = `<polygon points="${P([[cx - dWid * 0.34, G], [cx - dWid * 0.2, G], [cx - dWid * 0.24, H], [cx - dWid * 0.48, H]])}" class="f-grime" opacity=".13"/>` +
           `<polygon points="${P([[cx + dWid * 0.2, G], [cx + dWid * 0.34, G], [cx + dWid * 0.52, H], [cx + dWid * 0.3, H]])}" class="f-grime" opacity=".13"/>`;
  for (let i = 0; i < 6; i++) dG += ell(r(dL + 2, dR + 6), r(G + 7, H - 6), r(3, 9), r(1.6, 4), r(0.22, 0.48));""")
R("""  let gd = rect(gx + 9, G - 38, gw - 18, 38, 'base f-wall2');
  for (let i = 1; i < 4; i++)""","""  let gd = noGar ? '' : rect(gx + 9, G - 38, gw - 18, 38, 'base f-wall2');
  if (!noGar) for (let i = 1; i < 4; i++)""")
R("""  for (let y = grTop + 6; y < gTop; y += 6) rT +=""","""  if (!noGar) for (let y = grTop + 6; y < gTop; y += 6) rT +=""")
R("""  for (let i = 0; i < 5; i++) rG += ell(r(gx, gx + gw), r(grTop + 5, gTop - 1), r(2.5, 6), r(1.5, 3), r(0.5, 0.85), 'f-moss');
  const chX = x0 + mw - 66;""","""  if (!noGar) for (let i = 0; i < 5; i++) rG += ell(r(gx, gx + gw), r(grTop + 5, gTop - 1), r(2.5, 6), r(1.5, 3), r(0.5, 0.85), 'f-moss');""")
R("""<polygon points="${P(roofGar)}" class="base f-roof"/><polygon points="${P(roofMain)}" class="base f-roof"/><g clip-path="url(#cp-roof)">${rT}<g class="grime g-roof">${rG}</g>${sweepV(rTop - 30, gTop - rTop + 50)}</g></g>`;""",
"""${noGar ? '' : `<polygon points="${P(roofGar)}" class="base f-roof"/>`}<polygon points="${P(roofMain)}" class="base f-roof"/><g clip-path="url(#cp-roof)">${rT}<g class="grime g-roof">${rG}</g>${sweepV(rTop - 30, G - rTop)}</g></g>`;

  // solar panels
  let sCells = '', sShine = '', sG = '';
  panels.forEach(q => {
    sCells += `<line x1="${n1(q.x + q.w / 2)}" y1="${q.y}" x2="${n1(q.x + q.w / 2)}" y2="${n1(q.y + q.h)}" class="s-cell"/>`;
    for (let k = 1; k < 3; k++) sCells += `<line x1="${q.x}" y1="${n1(q.y + q.h * k / 3)}" x2="${q.x + q.w}" y2="${n1(q.y + q.h * k / 3)}" class="s-cell"/>`;
    sShine += `<polygon points="${P([[q.x, q.y + 9], [q.x, q.y + 14], [q.x + 14, q.y], [q.x + 9, q.y]])}"/>`;
    sG += rect(q.x, q.y, q.w, q.h, 'f-moss', 'opacity=".55"');
    for (let k = 0; k < 3; k++) sG += `<circle cx="${n1(q.x + r(3, q.w - 3))}" cy="${n1(q.y + r(3, q.h - 3))}" r="${n1(r(0.9, 1.8))}" class="f-shine" opacity=".9"/>`;
  });
  const partSolar = `<g class="part" data-part="solar" ${A('solar')}>${panels.map(q => rect(q.x, q.y, q.w, q.h, 'base f-panel', 'rx="1"')).join('')}<g clip-path="url(#cp-solar)">${sCells}<g class="pshine f-shine">${sShine}</g><g class="grime g-solar">${sG}</g><g transform="skewX(-18)">${sweepH(W + 100)}</g></g></g>`;""")
R("""    [x0 + mw / 2 - 16, rTop + RH * 0.55],""","""    [x0 + mw - 22, rTop + RH * 0.62],
    [panels[0].x + panels[0].w, pTop + pH / 2],""")
R("""+ partRoof + partGut +""","""+ partRoof + partSolar + partGut +""")
# region render + sizes
R("""function renderSizes() {
  sizeSeg.innerHTML = '<span class="seg-thumb" aria-hidden="true"></span>' +
    SIZE_KEYS.map(""","""function renderSizes() {
  sizeSeg.style.setProperty('--n', sizeKeys().length);
  sizeSeg.innerHTML = '<span class="seg-thumb" aria-hidden="true"></span>' +
    sizeKeys().map(""")
R("""function setSeg(el, idx) {
  el.querySelector('.seg-thumb').style.transform = `translateX(${idx * 100}%)`;""","""function setSeg(el, idx) {
  const n = el.querySelectorAll('button').length;
  const cols = n === 4 && !matchMedia('(min-width:520px)').matches ? 2 : n, rows = Math.ceil(n / cols);
  el.style.setProperty('--cols', cols); el.style.setProperty('--rows', rows);
  el.querySelector('.seg-thumb').style.transform = `translate(${(idx % cols) * 100}%, ${Math.floor(idx / cols) * 100}%)`;""")
R("""  setSeg(sizeSeg, SIZE_KEYS.indexOf(state.size));""","""  setSeg(sizeSeg, sizeKeys().indexOf(state.size));""")
R("""  const ok = ready(t);
  const bookLabel = state.sending ? `${CHAT}<span>Opening WhatsApp</span>` : `${CHAT}<span>Book on WhatsApp</span>`;""",
"""  const ok = ready(t), bk = BK();
  heroP.textContent = 'Tap what needs cleaning and watch the price build. ' + bk.hero;
  noteEl.textContent = 'Based on what you picked. ' + bk.note;
  const bookLabel = state.sending ? `${CHAT}<span>${bk.busy}</span>` : `${CHAT}<span>${bk.btn}</span>`;""")
R("""'Add your name and mobile number to book.' : 'Opens WhatsApp with your request ready to send.';""","""'Add your name and mobile number to book.' : bk.ready;""")
# message
R("""function buildMessage() {
  const t = totals(), s = SIZES[state.size], B = CONFIG.bundle;
  const L = [`Hi ${CONFIG.company}, I'd like to book an exterior clean.`, ''];
  L.push(`*Name:* ${state.name.trim()}`, `*Mobile:* ${state.phone.trim()}`, `*Home:* ${s.label} (${s.sub})`, '', '*Services*');
  t.items.forEach(it => L.push(`• ${it.label}: ${money(it.price)}`));
  if (t.disc) L.push(`Bundle saving ${B.percent}%: ${money(t.disc)} off`);
  if (t.minApplied) L.push(`Minimum visit: ${money(t.min)}`);
  L.push('', `*Estimate: ${money(t.total)}*`, '', `*Preferred:* ${dayText()}`);
  if (state.loc) L.push(`*Location:* https://maps.google.com/?q=${state.loc.lat.toFixed(6)},${state.loc.lng.toFixed(6)}`);
  return L.join('\\n');
}

function book() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener';""",
"""const country = code => COUNTRIES.find(c => c[0] === code) || COUNTRIES[0];
function fullPhone() {
  const raw = state.phone.trim();
  if (raw.startsWith('+')) return raw;
  return `${country(state.cc)[2]} ${raw.replace(/^0+/, '')}`;
}
function buildMessage() {
  const t = totals(), s = SIZES[state.size], B = CONFIG.bundle;
  const wa = R().booking !== 'sms', b = x => wa ? `*${x}*` : x;
  const L = [`Hi ${CONFIG.company}, I'd like to book an exterior clean.`, ''];
  L.push(`${b('Name:')} ${state.name.trim()}`, `${b('Mobile:')} ${fullPhone()}`, `${b('Home:')} ${s.label} (${s.sub})`, '', b('Services'));
  t.items.forEach(it => L.push(`• ${it.label}: ${money(it.price)}`));
  if (t.disc) L.push(`Bundle saving ${B.percent}%: ${money(t.disc)} off`);
  if (t.minApplied) L.push(`Minimum visit: ${money(t.min)}`);
  L.push('', b(`Estimate: ${money(t.total)}`), '', `${b('Preferred:')} ${dayText()}`);
  if (state.loc) L.push(`${b('Location:')} https://maps.google.com/?q=${state.loc.lat.toFixed(6)},${state.loc.lng.toFixed(6)}`);
  return L.join('\\n');
}
function bookUrl() {
  const body = encodeURIComponent(buildMessage());
  return R().booking === 'sms' ? `sms:+${BOOKING_NUMBER}?&body=${body}` : `https://wa.me/${BOOKING_NUMBER}?text=${body}`;
}

function book() {
  const url = bookUrl(), sms = url.startsWith('sms:');
  const a = document.createElement('a');
  a.href = url; if (!sms) { a.target = '_blank'; a.rel = 'noopener'; }""")
R("""  statusEl.textContent = 'Your request is ready in WhatsApp. Tap send to book.';
  statusEl.classList.add('ok');
  update();""","""  statusEl.textContent = BK().sent;
  statusEl.classList.add('ok');
  update();""")
R("""    statusEl.textContent = 'Your request is ready in WhatsApp. Tap send to book.';
    statusEl.classList.add('ok');
  }, 1800);""","""    statusEl.textContent = BK().sent;
    statusEl.classList.add('ok');
  }, 1800);""")
R("""    locS.textContent = msg || 'Optional. Adds a map pin to your message.';""","""    locS.textContent = msg || 'Adds a map pin to your message.';""")
# region detect: path
R("""  if (CONFIG.regions[q]) return q;
  try {""","""  if (CONFIG.regions[q]) return q;
  const m = location.pathname.match(/^\\/(us|uk|ca|au)(\\/|$)/i);
  if (m && CONFIG.regions[m[1].toUpperCase()]) return m[1].toUpperCase();
  try {""")
R("""  if (!b || b.dataset.size === state.size) return;""","""  if (!b || b.dataset.size === state.size) return;
  sizeSeg.classList.add('moved');""")
R("""regionSel.addEventListener('change', () => {
  state.region = regionSel.value;
  renderList(); renderDays();""","""function renderCountries() {
  const own = R().country;
  const list2 = [country(own), ...COUNTRIES.filter(c => c[0] !== own).sort((a, b) => a[1].localeCompare(b[1]))];
  ccSel.innerHTML = list2.map(c => `<option value="${c[0]}">${c[3]} ${c[1]} ${c[2]}</option>`).join('');
  if (!state.ccTouched) state.cc = own;
  ccSel.value = state.cc;
  showCc();
}
function showCc() { const c = country(state.cc); ccShow.textContent = `${c[3]} ${c[2]}`; }
ccSel.addEventListener('change', () => { state.cc = ccSel.value; state.ccTouched = true; showCc(); update(); });

regionSel.addEventListener('change', () => {
  state.region = regionSel.value;
  if (!sizeKeys().includes(state.size)) { state.size = SIZE_SWAP[state.size]; renderHouse(true); }
  if (/^\\/(us|uk|ca|au)\\/?$/i.test(location.pathname) || location.search) {
    try { history.replaceState(null, '', '/' + state.region.toLowerCase() + '/'); } catch (_) { /* ignore */ }
  }
  renderSizes(); renderCountries(); renderList(); renderDays();""")
R("""window.addEventListener('resize', chrome);""","""window.addEventListener('resize', () => { chrome(); setSeg(sizeSeg, sizeKeys().indexOf(state.size)); });""")
R("""state.region = detectRegion();
renderRegions(); renderSizes();""","""state.region = detectRegion();
if (!sizeKeys().includes(state.size)) state.size = SIZE_SWAP[state.size];
renderRegions(); renderCountries(); renderSizes();""")
open(p,'w').write(s)
print('ok')
