import re
p='/workspace/exterior-cleaning-quote/src/index.html'
s=open(p).read()
def R(a,b,c=1):
    global s
    n=s.count(a)
    assert n>=1, ('MISSING',a[:80])
    if c==1: assert n==1,('MULTI',n,a[:80])
    s=s.replace(a,b)
# rename
R('Peak Clean','Gleam',0)
# regions: add SA, NZ
R("""        patio:         { small: 115, medium: 175, large: 260 }
      } }
  }""","""        patio:         { small: 115, medium: 175, large: 260 }
      } },
    NZ: { label: 'NZ $', currency: 'NZD', locale: 'en-NZ', minimum: 150, units: 'm',
      booking: 'sms', country: 'NZ', sizes: ['S', 'M', 'L'],
      words: { pipes: 'downpipes', walls: 'Weatherboard, brick or plaster' },
      prices: {
        windows:       { S: 170, M: 260, L: 380 },
        windowsInside: { S: 110, M: 170, L: 240 },
        solar:         { S: 150, M: 200, L: 280 },
        gutters:       { S: 170, M: 250, L: 360 },
        roof:          { S: 550, M: 800, L: 1150 },
        walls:         { S: 450, M: 650, L: 950 },
        driveway:      { one: 150, two: 220, three: 320 },
        patio:         { small: 130, medium: 190, large: 280 }
      } },
    // Saudi Arabia: Arabic first, with an English switch. Solar is priced at SAR 35 to 45 a panel.
    SA: { label: 'SA SAR', currency: 'SAR', locale: 'en-SA', minimum: 250, units: 'm',
      booking: 'whatsapp', country: 'SA', sizes: ['VS', 'VM', 'VL', 'DUP', 'APT'], langs: ['ar', 'en'],
      words: { pipes: 'drain pipes', walls: 'Stone, paint or marble' },
      prices: {
        windows:       { VS: 350, VM: 900, VL: 2000, DUP: 1100, APT: 350 },
        windowsInside: { VS: 200, VM: 450, VL: 900, DUP: 550, APT: 200 },
        solar:         { VS: 420, VM: 800, VL: 1350, DUP: 600, APT: 300 },
        gutters:       { VS: 150, VM: 250, VL: 400, DUP: 200, APT: 150 },
        roof:          { VS: 400, VM: 700, VL: 1100, DUP: 600, APT: 300 },
        walls:         { VS: 900, VM: 1600, VL: 2800, DUP: 1300, APT: 600 },
        driveway:      { one: 150, two: 250, three: 350 },
        patio:         { small: 150, medium: 250, large: 400 }
      } }
  }""")
R("  BUN:  { label: 'Bungalow',      sub: '1 floor',          floors: 1, bays: 4, door: 1, garage: 58, seed: 41 }\n",
"""  BUN:  { label: 'Bungalow',      sub: '1 floor',          floors: 1, bays: 4, door: 1, garage: 58, seed: 41 },
  VS:  { label: 'Small villa',  sub: '2 floors',            floors: 2, bays: 3, door: 1, garage: 0,  roof: 'flat', seed: 43 },
  VM:  { label: 'Medium villa', sub: '2 floors, wider',     floors: 2, bays: 4, door: 1, garage: 68, roof: 'flat', seed: 47 },
  VL:  { label: 'Large villa',  sub: '3 floors',            floors: 3, bays: 5, door: 1, garage: 68, roof: 'flat', seed: 53 },
  DUP: { label: 'Duplex',       sub: '2 floors, shared wall', floors: 2, bays: 2, door: 1, garage: 0, neigh: 'left', roof: 'flat', seed: 59 },
  APT: { label: 'Apartment',    sub: 'Your own unit',       floors: 3, bays: 3, door: 1, garage: 0,  roof: 'flat', apt: true, seed: 61 }
""")
R("const SIZE_SWAP = { S: 'TER', M: 'SEMI', L: 'DET', DET: 'L', SEMI: 'M', TER: 'S', BUN: 'S' };",
  "const SIZE_SWAP = { S: 'TER', M: 'SEMI', L: 'DET', DET: 'L', SEMI: 'M', TER: 'S', BUN: 'S', VS: 'S', VM: 'M', VL: 'L', DUP: 'M', APT: 'S' };\nconst swapSize = k => sizeKeys().includes(SIZE_SWAP[k]) ? SIZE_SWAP[k] : (k === 'S' || k === 'TER' ? sizeKeys()[0] : sizeKeys()[1]);")
R("""  ['DE', 'Germany', '+49', '🇩🇪'], ['FR', 'France', '+33', '🇫🇷'], ['ES', 'Spain', '+34', '🇪🇸'],
  ['IT', 'Italy', '+39', '🇮🇹'], ['NL', 'Netherlands', '+31', '🇳🇱'], ['PL', 'Poland', '+48', '🇵🇱']""",
"""  ['KW', 'Kuwait', '+965', '🇰🇼'], ['BH', 'Bahrain', '+973', '🇧🇭'], ['OM', 'Oman', '+968', '🇴🇲'],
  ['EG', 'Egypt', '+20', '🇪🇬'], ['JO', 'Jordan', '+962', '🇯🇴'], ['BD', 'Bangladesh', '+880', '🇧🇩']""")
# Arabic dictionary + tr
R("const SVG_ICON = d =>", r"""/* Arabic text for the Saudi page. Keys are the English text. */
const AR = {
  'Your price, before anyone visits.': 'سعرك جاهز قبل ما يزورك أحد.',
  'Tap what needs cleaning and watch the price build.': 'اضغط على اللي يحتاج تنظيف وشوف السعر يتحدث قدامك.',
  'Book it on WhatsApp when it looks right.': 'واحجز على واتساب إذا ناسبك.',
  'Book on WhatsApp': 'احجز على واتساب', 'Opening WhatsApp': 'نفتح واتساب',
  'The final price is confirmed with you on WhatsApp.': 'نأكد معك السعر النهائي على واتساب.',
  'Opens WhatsApp with your request ready to send.': 'يفتح واتساب وطلبك جاهز للإرسال.',
  'Your request is ready in WhatsApp. Tap send to book.': 'طلبك جاهز في واتساب. اضغط إرسال وتم الحجز.',
  'Based on what you picked.': 'حسب اختياراتك.',
  'Tap any part of your home to add it': 'اضغط على أي جزء من بيتك لإضافته',
  'Estimate': 'التقدير', 'Home size': 'حجم البيت', 'Home type': 'نوع البيت',
  'What needs cleaning': 'وش تبي ننظف', 'Your details': 'بياناتك', 'Your name': 'اسمك',
  'First name is fine': 'الاسم الأول يكفي', 'Mobile number': 'رقم الجوال',
  'Preferred day': 'اليوم المناسب', 'Time of day': 'الوقت المناسب',
  'Share my location': 'شارك موقعي', 'Adds a map pin to your message.': 'يضيف موقعك على الخريطة في رسالتك.',
  'Remove': 'إزالة', 'Your estimate': 'تقديرك', 'Demo page with sample prices.': 'صفحة تجريبية بأسعار للعرض.',
  'Region and currency': 'المنطقة والعملة', 'Country code': 'رمز الدولة',
  'Your home. Tap a part to add it to your quote.': 'بيتك. اضغط على أي جزء لإضافته لعرض السعر.',
  'Windows': 'الزجاج والنوافذ', 'Gutters': 'المزاريب', 'Solar panels': 'الألواح الشمسية',
  'Roof soft wash': 'غسيل السطح', 'Walls soft wash': 'غسيل الواجهات', 'Driveway': 'الممر والمواقف', 'Patio and paths': 'الحوش والممرات',
  'Glass, frames and sills': 'الزجاج والإطارات والحواف', 'Cleared out, drain pipes flushed': 'تنظيف المزاريب وتسليك مواسير التصريف',
  'Dust and bird mess rinsed off': 'إزالة الغبار وفضلات الطيور', 'Moss, algae and black streaks': 'الغبار والبقع والترسبات',
  'Stone, paint or marble': 'حجر أو دهان أو رخام', 'Pressure washed': 'غسيل بالضغط',
  '1 car': 'سيارة وحدة', '2 cars': 'سيارتين', '3 cars': '3 سيارات', 'Small': 'صغير', 'Medium': 'متوسط', 'Large': 'كبير',
  'Morning': 'الصباح', 'Afternoon': 'العصر', 'Any time': 'أي وقت', 'Flexible': 'مرن', 'Any day': 'أي يوم',
  'morning': 'الصباح', 'afternoon': 'العصر', 'any time': 'أي وقت', 'Inside too': 'من الداخل بعد',
  'Windows, outside': 'النوافذ، من الخارج', 'Windows, outside and inside': 'النوافذ، من الخارج والداخل',
  'Small villa': 'فيلا صغيرة', 'Medium villa': 'فيلا متوسطة', 'Large villa': 'فيلا كبيرة', 'Duplex': 'دوبلكس', 'Apartment': 'شقة',
  '2 floors': 'دورين', '2 floors, wider': 'دورين، أوسع', '3 floors': '3 أدوار', '2 floors, shared wall': 'دورين، جدار مشترك', 'Your own unit': 'وحدتك السكنية',
  'Nothing picked yet. Tap your home or a service to start.': 'ما اخترت شي للحين. اضغط على بيتك أو على خدمة عشان تبدأ.',
  'Minimum visit': 'الحد الأدنى للزيارة', 'Continue': 'متابعة',
  'Pick at least one service to book.': 'اختر خدمة وحدة على الأقل للحجز.',
  'Add your name and mobile number to book.': 'أضف اسمك ورقم جوالك للحجز.',
  'Add your full mobile number, with the area code.': 'اكتب رقم جوالك كامل.',
  'Location added': 'تمت إضافة الموقع', 'Approximate location': 'موقع تقريبي', 'Finding you': 'نحدد موقعك',
  'Allow location when your phone asks.': 'اسمح بالموقع لما يطلب منك جوالك.',
  'Location is not available on this device. You can still book.': 'الموقع غير متاح على هذا الجهاز. تقدر تحجز بدونه.',
  'Location was not shared. You can still book without it.': 'ما تمت مشاركة الموقع. تقدر تحجز بدونه.',
  'Your location could not be found. You can still book without it.': 'ما قدرنا نحدد موقعك. تقدر تحجز بدونه.',
  'Inside windows added': 'تمت إضافة تنظيف النوافذ من الداخل', 'Inside windows removed': 'تمت إزالة تنظيف النوافذ من الداخل',
  'Gleam | Instant exterior cleaning quote': 'جليم | عرض سعر فوري لتنظيف الواجهات',
  'Build your exterior cleaning quote on your own home and book it by text or WhatsApp.': 'جهز عرض سعر تنظيف بيتك من الخارج واحجز على واتساب.'
};
const isAr = () => state.lang === 'ar';
const tr = x => (isAr() && AR[x]) || x;
const LOC = () => isAr() ? 'ar-SA-u-ca-gregory-nu-latn' : R().locale;
const company = () => isAr() ? 'جليم' : CONFIG.company;

const SVG_ICON = d =>""")
R("  region: 'US', size: 'M', sel: {},","  region: 'US', lang: 'en', langPicked: false, size: 'M', sel: {},")
R("const svcName = id => SERVICES.find(s => s.id === id).name;","const svcName = id => tr(SERVICES.find(s => s.id === id).name);")
R("""  const r = R(), k = r.locale + r.currency;
  if (!fmtCache[k]) fmtCache[k] = new Intl.NumberFormat(r.locale,""","""  const r = R(), k = LOC() + r.currency;
  if (!fmtCache[k]) fmtCache[k] = new Intl.NumberFormat(LOC(),""")
R("""  if (id === 'windows') return state.opt.inside ? 'Windows, outside and inside' : 'Windows, outside';
  if (id === 'driveway') return `Driveway, ${DRIVE[state.opt.driveway]}`;
  if (id === 'patio') return `Patio and paths, ${PATIO[state.opt.patio].toLowerCase()}`;""",
"""  if (id === 'windows') return tr(state.opt.inside ? 'Windows, outside and inside' : 'Windows, outside');
  if (id === 'driveway') return `${tr('Driveway')}، ${tr(DRIVE[state.opt.driveway])}`.replace('، ', isAr() ? '، ' : ', ');
  if (id === 'patio') return isAr() ? `${tr('Patio and paths')}، ${tr(PATIO[state.opt.patio])}` : `Patio and paths, ${PATIO[state.opt.patio].toLowerCase()}`;""")
R("setCaption(n ? `${n} selected. Tap a part again to remove it.` : 'Tap any part of your home to add it');",
  "setCaption(n ? (isAr() ? `${n} مختارة. اضغط على الجزء مرة ثانية لإزالته.` : `${n} selected. Tap a part again to remove it.`) : tr('Tap any part of your home to add it'));")
R('<span class="t">${SIZES[k].label}</span><span class="s">${SIZES[k].sub}</span>','<span class="t">${tr(SIZES[k].label)}</span><span class="s">${tr(SIZES[k].sub)}</span>')
R("TIMES.map(([k, l]) => `<button type=\"button\" data-time=\"${k}\" aria-pressed=\"false\">${l}</button>`)","TIMES.map(([k, l]) => `<button type=\"button\" data-time=\"${k}\" aria-pressed=\"false\">${tr(l)}</button>`)")
R("""  const cols = n === 4 && !matchMedia('(min-width:520px)').matches ? 2 : n, rows = Math.ceil(n / cols);
  el.style.setProperty('--cols', cols); el.style.setProperty('--rows', rows);
  el.querySelector('.seg-thumb').style.transform = `translate(${(idx % cols) * 100}%, ${Math.floor(idx / cols) * 100}%)`;""",
"""  const wide = matchMedia('(min-width:520px)').matches;
  const cols = n === 4 ? (wide ? 4 : 2) : n > 4 ? 3 : n, rows = Math.ceil(n / cols);
  el.style.setProperty('--cols', cols); el.style.setProperty('--rows', rows);
  const dir = document.documentElement.dir === 'rtl' ? -1 : 1;
  el.querySelector('.seg-thumb').style.transform = `translate(${dir * (idx % cols) * 100}%, ${Math.floor(idx / cols) * 100}%)`;""")
R("data-opt=\"inside\">Inside too <span","data-opt=\"inside\">${tr('Inside too')} <span")
R("optsWrap('<button type=\"button\" class=\"chip\" data-opt=\"inside\">${tr('Inside too')} <span class=\"p\"></span></button>')",
  "optsWrap(`<button type=\"button\" class=\"chip\" data-opt=\"inside\">${tr('Inside too')} <span class=\"p\"></span></button>`)")
R('data-val="${v}">${l} <span class="p"></span>','data-val="${v}">${tr(l)} <span class="p"></span>',0)
R('<span class="svc-name">${s.name}</span><span class="svc-desc">${s.desc(r)}</span>','<span class="svc-name">${tr(s.name)}</span><span class="svc-desc">${tr(s.desc(r))}</span>')
R('aria-pressed="false">Flexible</button>','aria-pressed="false">${tr(\'Flexible\')}</button>')
R("let html = '<button type=\"button\" class=\"day any\" data-day=\"any\" aria-pressed=\"false\">${tr('Flexible')}</button>';",
  "let html = `<button type=\"button\" class=\"day any\" data-day=\"any\" aria-pressed=\"false\">${tr('Flexible')}</button>`;")
s=s.replace("d.toLocaleDateString(r.locale,","d.toLocaleDateString(LOC(),")
R("""    if (t.disc) txt = `Bundle saving applied. You save ${money(t.disc)}.`;
    else if (t.n === B.minServices - 1) txt = `Add one more service to save ${B.percent}%.`;
    else txt = `Book ${B.minServices} or more services and save ${B.percent}%.`;""",
"""    if (t.disc) txt = isAr() ? `تم تطبيق خصم الباقة. توفر ${money(t.disc)}.` : `Bundle saving applied. You save ${money(t.disc)}.`;
    else if (t.n === B.minServices - 1) txt = isAr() ? `أضف خدمة وحدة بعد ووفر ${B.percent}%.` : `Add one more service to save ${B.percent}%.`;
    else txt = isAr() ? `احجز ${B.minServices} خدمات أو أكثر ووفر ${B.percent}%.` : `Book ${B.minServices} or more services and save ${B.percent}%.`;""")
R("""  let sub = t.n ? `${t.n} service${t.n > 1 ? 's' : ''}` : '';
  if (t.disc) sub += `, ${B.percent}% bundle saving`;
  else if (hasBundle && t.n && t.n === B.minServices - 1) sub += `, add 1 more to save ${B.percent}%`;
  if (t.minApplied) sub += ', minimum visit';""",
"""  const A2 = isAr();
  let sub = t.n ? (A2 ? (t.n === 1 ? 'خدمة وحدة' : t.n === 2 ? 'خدمتين' : `${t.n} خدمات`) : `${t.n} service${t.n > 1 ? 's' : ''}`) : '';
  if (t.disc) sub += A2 ? `، خصم باقة ${B.percent}%` : `, ${B.percent}% bundle saving`;
  else if (hasBundle && t.n && t.n === B.minServices - 1) sub += A2 ? `، أضف وحدة بعد ووفر ${B.percent}%` : `, add 1 more to save ${B.percent}%`;
  if (t.minApplied) sub += A2 ? '، الحد الأدنى للزيارة' : ', minimum visit';""")
R("lines.innerHTML = '<p class=\"empty\">Nothing picked yet. Tap your home or a service to start.</p>';",
  "lines.innerHTML = `<p class=\"empty\">${tr('Nothing picked yet. Tap your home or a service to start.')}</p>`;")
R('<span class="l">Bundle saving ${B.percent}%</span><span class="r">${money(t.disc)} off</span>',
  '<span class="l">${isAr() ? `خصم الباقة ${B.percent}%` : `Bundle saving ${B.percent}%`}</span><span class="r">${isAr() ? `خصم ${money(t.disc)}` : `${money(t.disc)} off`}</span>')
R('<span class="l">Minimum visit</span>','<span class="l">${tr(\'Minimum visit\')}</span>')
R("""  heroP.textContent = 'Tap what needs cleaning and watch the price build. ' + bk.hero;
  noteEl.textContent = 'Based on what you picked. ' + bk.note;
  const bookLabel = state.sending ? `${CHAT}<span>${bk.busy}</span>` : `${CHAT}<span>${bk.btn}</span>`;
  const barLabel = ok ? bookLabel : '<span>Continue</span>';""",
"""  heroP.textContent = tr('Tap what needs cleaning and watch the price build.') + ' ' + tr(bk.hero);
  noteEl.textContent = tr('Based on what you picked.') + ' ' + tr(bk.note);
  const bookLabel = state.sending ? `${CHAT}<span>${tr(bk.busy)}</span>` : `${CHAT}<span>${tr(bk.btn)}</span>`;
  const barLabel = ok ? bookLabel : `<span>${tr('Continue')}</span>`;""")
R("statusEl.textContent = !t.n ? 'Pick at least one service to book.' : !ok ? 'Add your name and mobile number to book.' : bk.ready;",
  "statusEl.textContent = tr(!t.n ? 'Pick at least one service to book.' : !ok ? 'Add your name and mobile number to book.' : bk.ready);")
R("""  if (state.sel[id]) { wash(id); say(`${svcName(id)} added`); }
  else say(`${svcName(id)} removed`);""","""  if (state.sel[id]) { wash(id); say(isAr() ? `تمت إضافة ${svcName(id)}` : `${svcName(id)} added`); }
  else say(isAr() ? `تمت إزالة ${svcName(id)}` : `${svcName(id)} removed`);""")
R("""  if (state.day === 'any' && state.time === 'any') return 'Flexible';
  const dStr = state.day === 'any' ? 'Any day' : noDots(fromIso(state.day).toLocaleDateString(r.locale, { weekday: 'short', day: 'numeric', month: 'short' }));
  const tStr = { morning: 'morning', afternoon: 'afternoon', any: 'any time' }[state.time];
  return `${dStr}, ${tStr}`;""","""  if (state.day === 'any' && state.time === 'any') return tr('Flexible');
  const dStr = state.day === 'any' ? tr('Any day') : noDots(fromIso(state.day).toLocaleDateString(LOC(), { weekday: 'short', day: 'numeric', month: 'short' }));
  const tStr = tr({ morning: 'morning', afternoon: 'afternoon', any: 'any time' }[state.time]);
  return `${dStr}${isAr() ? '، ' : ', '}${tStr}`;""")
R("""  const L = [`Hi ${CONFIG.company}, I'd like to book an exterior clean.`, ''];
  L.push(`${b('Name:')} ${state.name.trim()}`, `${b('Mobile:')} ${fullPhone()}`, `${b('Home:')} ${s.label} (${s.sub})`, '', b('Services'));
  t.items.forEach(it => L.push(`• ${it.label}: ${money(it.price)}`));
  if (t.disc) L.push(`Bundle saving ${B.percent}%: ${money(t.disc)} off`);
  if (t.minApplied) L.push(`Minimum visit: ${money(t.min)}`);
  L.push('', b(`Estimate: ${money(t.total)}`), '', `${b('Preferred:')} ${dayText()}`);
  if (state.loc) L.push(`${b('Location:')} https""","""  const A = isAr(), w = (en, ar) => A ? ar : en;
  const L = [w(`Hi ${CONFIG.company}, I'd like to book an exterior clean.`, `مرحبا ${company()}، أبي أحجز تنظيف خارجي للبيت.`), ''];
  L.push(`${b(w('Name:', 'الاسم:'))} ${state.name.trim()}`, `${b(w('Mobile:', 'الجوال:'))} \\u2066${fullPhone()}\\u2069`, `${b(w('Home:', 'البيت:'))} ${tr(s.label)} (${tr(s.sub)})`, '', b(w('Services', 'الخدمات')));
  t.items.forEach(it => L.push(`• ${it.label}: ${money(it.price)}`));
  if (t.disc) L.push(w(`Bundle saving ${B.percent}%: ${money(t.disc)} off`, `خصم الباقة ${B.percent}%: ${money(t.disc)}`));
  if (t.minApplied) L.push(`${tr('Minimum visit')}: ${money(t.min)}`);
  L.push('', b(`${tr('Estimate')}: ${money(t.total)}`), '', `${b(w('Preferred:', 'الوقت المفضل:'))} ${dayText()}`);
  if (state.loc) L.push(`${b(w('Location:', 'الموقع:'))} https""")
R("""    locT.textContent = 'Location added';
    if (a > 1500) locS.textContent = 'Approximate location';""","""    locT.textContent = tr('Location added');
    if (a > 1500) locS.textContent = tr('Approximate location');
    else if (isAr()) locS.textContent = `دقة تقريبية ${Math.max(5, Math.round(a / 5) * 5)} م`;""")
R("""    locT.textContent = 'Finding you';
    locS.textContent = 'Allow location when your phone asks.';
  } else {
    locT.textContent = 'Share my location';
    locS.textContent = msg || 'Adds a map pin to your message.';""","""    locT.textContent = tr('Finding you');
    locS.textContent = tr('Allow location when your phone asks.');
  } else {
    locT.textContent = tr('Share my location');
    locS.textContent = tr(msg || 'Adds a map pin to your message.');""")
R("location.pathname.match(/^\\/(us|uk|ie|ca|au)(\\/|$)/i)","location.pathname.match(/^\\/(us|uk|ie|ca|au|sa|nz)(\\/|$)/i)")
R("    if (tz === 'Europe/Dublin') return 'IE';","    if (tz === 'Europe/Dublin') return 'IE';\n    if (tz === 'Asia/Riyadh') return 'SA';\n    if (/^Pacific\\/(Auckland|Chatham)$/.test(tz)) return 'NZ';")
R("  if (lang.endsWith('-ie')) return 'IE';","  if (lang.endsWith('-ie')) return 'IE';\n  if (lang.endsWith('-sa')) return 'SA';\n  if (lang.endsWith('-nz')) return 'NZ';")
R("""      say(state.opt.inside ? 'Inside windows added' : 'Inside windows removed');""","""      say(tr(state.opt.inside ? 'Inside windows added' : 'Inside windows removed'));""")
R("  say(`${s.label} home, ${s.sub}`);","  say(isAr() ? `${tr(s.label)}، ${tr(s.sub)}` : `${s.label} home, ${s.sub}`);")
R("""phoneHint.textContent = phoneTouched && state.phone.trim() && digits(state.phone) < 7 ? 'Add your full mobile number, with the area code.' : '';""",
  """phoneHint.textContent = phoneTouched && state.phone.trim() && digits(state.phone) < 7 ? tr('Add your full mobile number, with the area code.') : '';""")
R("""  ccSel.innerHTML = list2.map(c => `<option value="${c[0]}">${c[3]} ${c[1]} ${c[2]}</option>`).join('');""",
"""  let dn = null;
  try { dn = new Intl.DisplayNames([state.lang], { type: 'region' }); } catch (_) { /* ignore */ }
  const nm = c => (dn && dn.of(c[0])) || c[1];
  ccSel.innerHTML = list2.map(c => `<option value="${c[0]}">${c[3]} ${nm(c)} \\u2066${c[2]}\\u2069</option>`).join('');""")
R("""  state.region = regionSel.value;
  if (!sizeKeys().includes(state.size)) { state.size = SIZE_SWAP[state.size]; renderHouse(true); }
  if (/^\\/(us|uk|ie|ca|au)\\/?$/i.test(location.pathname) || location.search) {
    try { history.replaceState(null, '', '/' + state.region.toLowerCase() + '/'); } catch (_) { /* ignore */ }
  }
  renderSizes(); renderCountries(); renderList(); renderDays();
  if (state.loc) setLoc('has');
  update();""","""  state.region = regionSel.value;
  if (!sizeKeys().includes(state.size)) { state.size = swapSize(state.size); renderHouse(true); }
  if (/^\\/(us|uk|ie|ca|au|sa|nz)\\/?$/i.test(location.pathname) || location.search) {
    try { history.replaceState(null, '', '/' + state.region.toLowerCase() + '/'); } catch (_) { /* ignore */ }
  }
  pickLang();
  applyLang();""")
R("""/* ---------- start ---------- */
document.getElementById('brandName').textContent = CONFIG.company;
state.region = detectRegion();
if (!sizeKeys().includes(state.size)) state.size = SIZE_SWAP[state.size];
renderRegions(); renderCountries(); renderSizes(); renderTimes(); renderList(); renderDays();
renderHouse(false);""","""/* ---------- language ---------- */
const langSw = $('#langSw');
function pickLang() {
  const langs = R().langs || ['en'];
  if (!state.langPicked || !langs.includes(state.lang)) state.lang = langs[0];
}
function applyLang() {
  const A = isAr(), html = document.documentElement;
  html.lang = A ? 'ar' : 'en'; html.dir = A ? 'rtl' : 'ltr';
  document.title = tr('Gleam | Instant exterior cleaning quote');
  document.querySelector('meta[name="description"]').content = tr('Build your exterior cleaning quote on your own home and book it by text or WhatsApp.');
  $('#brandName').textContent = company();
  document.querySelector('.brand').setAttribute('aria-label', company());
  [['.hero h1', 'Your price, before anyone visits.'], ['#hSvc', 'What needs cleaning'], ['#hDet', 'Your details'],
   ['#nameLbl', 'Your name'], ['#hPhone', 'Mobile number'], ['#hDay', 'Preferred day'], ['#hTime', 'Time of day'],
   ['#locX', 'Remove'], ['#hSum', 'Your estimate'], ['.foot', 'Demo page with sample prices.'],
   ['.stage-est span', 'Estimate'], ['.bar-k', 'Estimate'], ['.total span', 'Estimate'], ['.region .sr', 'Region and currency']
  ].forEach(([q, k]) => { const el = $(q); if (el) el.textContent = tr(k); });
  $('#hSize').textContent = tr(sizeKeys().includes('S') ? 'Home size' : 'Home type');
  nameIn.placeholder = tr('First name is fine'); phoneIn.placeholder = tr('Mobile number');
  ccSel.setAttribute('aria-label', tr('Country code'));
  svg.setAttribute('aria-label', tr('Your home. Tap a part to add it to your quote.'));
  const langs = R().langs;
  langSw.hidden = !langs;
  langSw.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === state.lang));
  caption.textContent = tr('Tap any part of your home to add it');
  renderSizes(); renderTimes(); renderCountries(); renderList(); renderDays();
  setLoc(state.loc ? 'has' : 'idle');
  for (const el of [barAmt, stageAmt, sumAmt]) el.textContent = money(el._cur || 0);
  update();
}
langSw.addEventListener('click', e => {
  const b = e.target.closest('button[data-lang]');
  if (!b || b.dataset.lang === state.lang) return;
  state.lang = b.dataset.lang; state.langPicked = true;
  applyLang();
});

/* ---------- start ---------- */
state.region = detectRegion();
try { const ql = new URLSearchParams(location.search).get('lang'); if (ql && (R().langs || []).includes(ql)) { state.lang = ql; state.langPicked = true; } } catch (_) { /* ignore */ }
pickLang();
if (!sizeKeys().includes(state.size)) state.size = swapSize(state.size);
renderRegions();
applyLang();
renderHouse(false);""")
R("""<label class="field"><span>Your name</span>""","""<label class="field"><span id="nameLbl">Your name</span>""")
R("""    <label class="region"><span class="sr">Region and currency</span><select id="region"></select></label>""",
"""    <div class="top-r">
      <div class="lang" id="langSw" role="group" aria-label="Language" hidden><button type="button" data-lang="ar" lang="ar" aria-pressed="false">عربي</button><button type="button" data-lang="en" lang="en" aria-pressed="false">EN</button></div>
      <label class="region"><span class="sr">Region and currency</span><select id="region"></select></label>
    </div>""")
# RTL css
R(".region::after{content:\"\";position:absolute;right:14px;",".region::after{content:\"\";position:absolute;inset-inline-end:14px;")
R(".region select{appearance:none;-webkit-appearance:none;height:36px;padding:0 32px 0 14px;",".region select{appearance:none;-webkit-appearance:none;height:36px;padding-block:0;padding-inline:14px 32px;")
R(".cc::after{content:\"\";position:absolute;right:13px;",".cc::after{content:\"\";position:absolute;inset-inline-end:13px;")
R(".seg-thumb{position:absolute;top:4px;left:4px;",".seg-thumb{position:absolute;top:4px;inset-inline-start:4px;")
R(".osm{position:absolute;right:8px;",".osm{position:absolute;inset-inline-end:8px;")
R("@media (max-width:370px){.opts{padding-left:16px}","@media (max-width:370px){.opts{padding-inline-start:16px}")
R("</style>","""/* header right, language switch, right to left */
.top-r{display:flex;align-items:center;gap:8px}
.lang{display:inline-flex;height:36px;padding:3px;border:1px solid var(--line-2);border-radius:999px;background:var(--surface)}
.lang[hidden]{display:none}
.lang button{min-width:44px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:600;color:var(--muted)}
.lang button[aria-pressed="true"]{background:var(--ink);color:var(--on-ink)}
[dir="rtl"] body{font-family:"IBM Plex Sans Arabic",var(--sans)}
[dir="rtl"] .hero h1{letter-spacing:0;line-height:1.2}
[dir="rtl"] .svc-main,[dir="rtl"] .svc-txt{text-align:right}
[dir="rtl"] .tel,[dir="rtl"] #phone,[dir="rtl"] .cc{direction:ltr}
[dir="rtl"] #phone{text-align:right}
[dir="rtl"] .opts{padding-left:0;padding-right:72px}
[dir="rtl"] .h2,[dir="rtl"] .bar-amt,[dir="rtl"] .stage-est strong{letter-spacing:0}
/* 3D house */
.stage{position:relative}
.gl3{position:absolute;left:0;top:0;width:100%;display:block;touch-action:pan-y;-webkit-tap-highlight-color:transparent;outline:none;cursor:grab}
.gl3:active{cursor:grabbing}
.stage.gl-on .house{visibility:hidden}
.stage.gl-on .gl3{animation:glIn .6s var(--ease) both}
@keyframes glIn{from{opacity:0}to{opacity:1}}
</style>""",1)
R('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..800&display=swap">',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">')
open(p,'w').write(s)
print('ok')
