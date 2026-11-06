/* Shared mode UI and quote payload. No photo bytes leave the browser. */
window.GleamModes = {
  mount({ refresh, arabic, translate }) {
    const $ = s => document.querySelector(s);
    const en = {
      headline: 'A quote for your home.', instant: 'Instant price', quote: 'Quote request', mode: 'How would you like to book?',
      job: 'About the job', storeys: 'Storeys', windows: 'Window count or rough size',
      windowHint: 'For example 12 windows or large windows', gutters: 'Gutters to clean',
      unsure: 'Not sure', yes: 'Yes', no: 'No', more: '4 or more',
      photos: 'Photos (optional)', photoHint: 'Up to 6 images, 10 MB each. Previews stay on this device. Only file names go with the demo request.',
      remove: 'Remove', photoError: 'Choose up to 6 image files of 10 MB or less.',
      request: 'Request a quote', intro: 'Pick the services. Add a few details so the job can be reviewed.',
      risk: 'The price is confirmed after your request is reviewed.', summary: 'Your quote request',
      note: 'No online price is set for this request.', footer: 'Demo quote request. Photos are previewed on this device only.',
      ready: 'Review your details before sending.', status: 'Pick a service and add your name and mobile number.', demo: 'Demo request recorded on this page. No message has been sent.',
      preview: 'Photos to describe the job'
    };
    const ar = {
      headline: 'عرض سعر لمنزلك.', instant: 'سعر فوري', quote: 'طلب عرض سعر', mode: 'كيف ترغب بالحجز؟', job: 'تفاصيل العمل',
      storeys: 'عدد الأدوار', windows: 'عدد النوافذ أو حجمها التقريبي', windowHint: 'مثلاً 12 نافذة أو نوافذ كبيرة',
      gutters: 'هل تحتاج المزاريب إلى تنظيف؟', unsure: 'غير متأكد', yes: 'نعم', no: 'لا', more: '4 أو أكثر',
      photos: 'صور (اختياري)', photoHint: 'حتى 6 صور، 10 ميغابايت لكل صورة. تبقى المعاينات على جهازك وترسل أسماء الملفات فقط مع الطلب التجريبي.',
      remove: 'إزالة', photoError: 'اختر حتى 6 صور بحجم 10 ميغابايت أو أقل لكل صورة.', request: 'اطلب عرض سعر',
      intro: 'اختر الخدمات وأضف بعض التفاصيل لمراجعة العمل.', risk: 'يتم تأكيد السعر بعد مراجعة طلبك.',
      summary: 'طلب عرض السعر', note: 'لم يتم تحديد سعر عبر الإنترنت لهذا الطلب.',
      footer: 'طلب عرض سعر تجريبي. معاينة الصور على جهازك فقط.', ready: 'راجع تفاصيلك قبل إرسال الطلب.', status: 'اختر خدمة وأضف اسمك ورقم جوالك.',
      demo: 'تم تسجيل الطلب التجريبي في هذه الصفحة. لم يتم إرسال رسالة.', preview: 'صور لتوضيح العمل'
    };
    const t = k => (arabic() ? ar : en)[k];
    let mode = 'instant', photos = [];
    try { if (sessionStorage.getItem('gleam.mode') === 'quote') mode = 'quote'; } catch (_) {}
    const control = document.createElement('div');
    control.className = 'mode-control'; control.setAttribute('role', 'group');
    control.innerHTML = '<button type="button" data-mode="instant"></button><button type="button" data-mode="quote"></button>';
    $('.hero h1').after(control);
    const fields = document.createElement('section');
    fields.id = 'quoteFields'; fields.className = 'block quote-fields'; fields.setAttribute('aria-labelledby', 'jobTitle');
    fields.innerHTML = `<h2 class="h2" id="jobTitle"></h2><div class="fields">
      <label class="field"><span data-copy="storeys"></span><select class="input" id="quoteStoreys"><option value="unsure"></option><option>1</option><option>2</option><option>3</option><option value="4+"></option></select></label>
      <label class="field"><span data-copy="windows"></span><input class="input" id="quoteWindows" maxlength="120"></label>
      <label class="field"><span data-copy="gutters"></span><select class="input" id="quoteGutters"><option value="unsure"></option><option value="yes"></option><option value="no"></option></select></label>
      <label class="field quote-photo-field"><span data-copy="photos"></span><input class="input" id="quotePhotos" type="file" accept="image/*" multiple aria-describedby="photoHelp photoError"><span class="hint" id="photoHelp" data-copy="photoHint"></span></label>
      </div><p class="hint" id="photoError" role="status"></p><div class="photo-previews"></div>`;
    $('#details').before(fields);
    function previews() {
      const host = fields.querySelector('.photo-previews'); host.replaceChildren();
      for (const item of photos) {
        const card = document.createElement('div'); card.className = 'photo-preview';
        const img = document.createElement('img'); img.src = item.url; img.alt = item.file.name;
        const label = document.createElement('span'); label.textContent = item.file.name;
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = t('remove');
        remove.setAttribute('aria-label', `${t('remove')} ${item.file.name}`);
        remove.onclick = () => { URL.revokeObjectURL(item.url); photos = photos.filter(p => p !== item); previews(); };
        card.append(img, label, remove); host.append(card);
      }
    }
    $('#quotePhotos').onchange = e => {
      const files = [...e.target.files];
      const valid = files.length + photos.length <= 6 && files.every(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024);
      $('#photoError').textContent = valid ? '' : t('photoError');
      if (valid) photos.push(...files.map(file => ({ file, url: URL.createObjectURL(file) })));
      e.target.value = ''; previews();
    };
    control.onclick = e => {
      const btn = e.target.closest('[data-mode]'); if (!btn || mode === btn.dataset.mode) return;
      mode = btn.dataset.mode;
      try { sessionStorage.setItem('gleam.mode', mode); } catch (_) {}
      refresh();
    };
    function paint(items, count, ready) {
      const quote = mode === 'quote';
      document.documentElement.dataset.mode = mode;
      control.setAttribute('aria-label', t('mode'));
      control.querySelectorAll('button').forEach(b => { b.textContent = t(b.dataset.mode); b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
      fields.hidden = !quote;
      fields.querySelectorAll('[data-copy]').forEach(el => el.textContent = t(el.dataset.copy));
      $('#jobTitle').textContent = t('job'); $('#quoteWindows').placeholder = t('windowHint');
      $('#quoteStoreys option[value="unsure"]').textContent = t('unsure');
      $('#quoteStoreys option[value="4+"]').textContent = t('more');
      $('#quoteGutters').querySelectorAll('option').forEach(o => o.textContent = t(o.value));
      previews();
      if ($('#h1a')) {
        $('#h1a').textContent = quote ? t('headline') : translate('Your price, ');
        $('#h1b').hidden = quote; $('#h1c').hidden = quote;
      } else {
        $('.hero h1').textContent = quote ? t('headline') : translate('Your price, before anyone visits.');
      }
      if (!quote) return;
      $('#heroP').textContent = t('intro');
      if ($('#heroRisk')) $('#heroRisk').textContent = t('risk');
      $('#hSum').textContent = t('summary'); $('#note').textContent = t('note');
      const footer = $('#footNote') || $('.foot'); footer.textContent = t('footer');
      ['#barBtn', '#sumBtn', '#heroBtn'].forEach(s => { if ($(s)) { $(s).textContent = t('request'); $(s).disabled = false; } });
      $('#bar').classList.add('show'); $('#barSub').textContent = t('quote');
      $('#status').textContent = t(ready ? 'ready' : 'status');
      if (count) {
        $('#lines').replaceChildren(...items.map(it => { const row = document.createElement('div'); row.className = 'line'; row.textContent = it.label; return row; }));
      }
    }
    function payload(base) {
      if (mode !== 'quote') return { ...base, mode: 'instant' };
      const detail = {
        storeys: $('#quoteStoreys').value,
        windows: $('#quoteWindows').value.trim(), gutters: $('#quoteGutters').value,
        photos: photos.map(p => ({ name: p.file.name, size: p.file.size, type: p.file.type }))
      };
      const items = base.items.map(({ id, label }) => ({ id, label }));
      const text = [t('summary'), base.name, base.phone, base.home, ...items.map(i => i.label),
        `${t('storeys')}: ${detail.storeys}`, `${t('windows')}: ${detail.windows || t('unsure')}`,
        `${t('gutters')}: ${t(detail.gutters)}`, `${t('photos')}: ${detail.photos.length}`,
        ...detail.photos.map(p => p.name), base.when, base.location].filter(Boolean).join('\n');
      const { total, disc, minimum, ...rest } = base;
      return { ...rest, mode: 'quote', items, job: detail, text };
    }
    function review(payload, host) {
      host.replaceChildren();
      for (const line of payload.text.split('\n')) { const p = document.createElement('p'); p.textContent = line; host.append(p); }
      const note = document.createElement('p'); note.textContent = t('note'); host.append(note);
    }
    return { paint, payload, review, isQuote: () => mode === 'quote', demo: () => t('demo') };
  }
};
