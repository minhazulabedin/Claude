/* ============================================================
   Dhaka Utility Service — offline PWA
   Bill estimation (electricity / water / gas), bill tracker,
   helpline directory and saving tips for residents of Dhaka.

   NOTE on tariffs: the rates below are indicative retail slabs
   published by BERC / the Dhaka utilities (DPDC, DESCO, Dhaka WASA,
   Titas). They are meant for estimation only — your printed bill is
   authoritative. Rates can be revised by the regulator at any time.
   ============================================================ */

'use strict';

/* ---------- Tariff data (indicative) ---------- */
const TARIFF = {
  // Electricity — residential retail slabs, BDT per kWh (unit).
  electricity: {
    lifeline: { limit: 50, rate: 4.63 }, // whole bill at this rate if total <= 50 units
    slabs: [
      { upto: 75,       rate: 5.26 },
      { upto: 200,      rate: 7.20 },
      { upto: 300,      rate: 7.59 },
      { upto: 400,      rate: 8.02 },
      { upto: 600,      rate: 12.67 },
      { upto: Infinity, rate: 14.61 },
    ],
    vat: 0.05,
  },
  // Dhaka WASA — BDT per 1000 L (1 unit = 1 m³).
  water: {
    domestic: 15.18,
    commercial: 42.00,
    // Sewerage charge billed at 100% of the water charge where a sewer line exists.
    sewerRatio: 1.0,
  },
  // Titas gas.
  gas: {
    meteredRate: 18.00, // BDT per m³ (domestic metered)
    flat: { single: 990, double: 1080 }, // BDT/month, non-metered
  },
};

/* ---------- Helpline directory ---------- */
const DIRECTORY = [
  {
    group: 'Emergency',
    items: [
      { name: 'National Emergency', desc: 'Police · Fire · Ambulance', num: '999' },
      { name: 'Fire Service & Civil Defence', desc: 'Control room', num: '102' },
      { name: 'Ambulance (Govt.)', desc: 'Health hotline', num: '16263' },
    ],
  },
  {
    group: 'Electricity',
    items: [
      { name: 'DPDC', desc: 'Dhaka Power Distribution Co.', num: '16116' },
      { name: 'DESCO', desc: 'Dhaka Electric Supply Co.', num: '16120' },
      { name: 'BPDB', desc: 'Bangladesh Power Dev. Board', num: '16200' },
    ],
  },
  {
    group: 'Water & Gas',
    items: [
      { name: 'Dhaka WASA', desc: 'Water & sewerage', num: '16162' },
      { name: 'Titas Gas', desc: 'Gas supply & leak report', num: '16496' },
    ],
  },
  {
    group: 'Civic',
    items: [
      { name: 'Dhaka North City Corp.', desc: 'DNCC hotline', num: '333' },
      { name: 'Dhaka South City Corp.', desc: 'DSCC hotline', num: '333' },
      { name: 'Govt. Info & Services', desc: 'National helpline', num: '333' },
    ],
  },
];

const TIPS = [
  { ic: '💡', t: 'Switch to LED', d: 'Replacing one 60W incandescent bulb with a 9W LED can cut that light’s power use by ~85% — and LEDs keep you in lower tariff slabs.' },
  { ic: '❄️', t: 'AC at 24–26°C', d: 'Each degree below 24°C raises consumption noticeably. 25°C with a fan feels the same and keeps units down.' },
  { ic: '🔌', t: 'Kill standby load', d: 'TVs, chargers and set-top boxes draw power on standby. Use a switched power strip and turn it off at night.' },
  { ic: '🚿', t: 'Fix the dripping tap', d: 'A single leaking tap can waste 60+ litres a day. WASA bills by 1000 L units — small leaks add real Taka.' },
  { ic: '🔥', t: 'Gas: cover the pot', d: 'Cooking with lids on and right-sized flames cuts gas use. Metered users pay per m³, so it shows up directly.' },
  { ic: '📅', t: 'Pay before the date', d: 'Add your bills to “My Bills” and clear them before the due date to dodge late surcharges and reconnection fees.' },
  { ic: '🧾', t: 'Read your own meter', d: 'Note the meter reading monthly. If the bill jumps without higher usage, raise it with the distributor early.' },
];

/* ---------- Helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const screen = $('#screen');
const fmt = (n) => {
  const r = Math.round((n + Number.EPSILON) * 100) / 100;
  return r.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmt0 = (n) => Math.round(n).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

/* ---------- Bill store (localStorage) ---------- */
const STORE_KEY = 'dus.bills.v1';
function loadBills() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function saveBills(bills) {
  localStorage.setItem(STORE_KEY, JSON.stringify(bills));
}

/* ============================================================
   Estimation engine
   ============================================================ */
function calcElectricity(units, opts) {
  const t = TARIFF.electricity;
  const lines = [];
  let energy = 0;

  if (units <= t.lifeline.limit) {
    energy = units * t.lifeline.rate;
    lines.push({ k: 'Lifeline energy', s: `${fmt0(units)} units × ৳${t.lifeline.rate}`, v: energy });
  } else {
    let prev = 0;
    for (const slab of t.slabs) {
      if (units <= prev) break;
      const qty = Math.min(units, slab.upto) - prev;
      if (qty > 0) {
        const amt = qty * slab.rate;
        energy += amt;
        const hi = slab.upto === Infinity ? '∞' : fmt0(slab.upto);
        lines.push({ k: `Slab ${fmt0(prev + 1)}–${hi}`, s: `${fmt0(qty)} units × ৳${slab.rate}`, v: amt });
      }
      prev = slab.upto;
    }
  }

  const demand = Math.max(0, opts.demand || 0);
  const meter = Math.max(0, opts.meter || 0);
  if (demand) lines.push({ k: 'Demand charge', s: 'Sanctioned load', v: demand });
  if (meter)  lines.push({ k: 'Meter rent', s: 'Monthly', v: meter });

  const vat = (energy + demand) * t.vat;
  lines.push({ k: 'VAT', s: '5% on energy + demand', v: vat });

  const total = energy + demand + meter + vat;
  return { total, lines, sub: `${fmt0(units)} units this cycle` };
}

function calcWater(volume, opts) {
  const t = TARIFF.water;
  const rate = opts.commercial ? t.commercial : t.domestic;
  const lines = [];
  const water = volume * rate;
  lines.push({ k: 'Water charge', s: `${fmt0(volume)} × 1000 L × ৳${rate}`, v: water });

  let sewer = 0;
  if (opts.sewer) {
    sewer = water * t.sewerRatio;
    lines.push({ k: 'Sewerage charge', s: '100% of water charge', v: sewer });
  }
  const total = water + sewer;
  return { total, lines, sub: `${fmt0(volume * 1000)} litres · ${opts.commercial ? 'commercial' : 'domestic'}` };
}

function calcGas(opts) {
  const t = TARIFF.gas;
  const lines = [];
  let total, sub;
  if (opts.metered) {
    const vol = Math.max(0, opts.volume || 0);
    total = vol * t.meteredRate;
    lines.push({ k: 'Metered gas', s: `${fmt0(vol)} m³ × ৳${t.meteredRate}`, v: total });
    sub = `${fmt0(vol)} m³ metered`;
  } else {
    total = opts.burner === 'double' ? t.flat.double : t.flat.single;
    const label = opts.burner === 'double' ? 'Double burner' : 'Single burner';
    lines.push({ k: `${label} (flat)`, s: 'Monthly, non-metered', v: total });
    sub = `${label} · non-metered`;
  }
  return { total, lines, sub };
}

/* ============================================================
   Views
   ============================================================ */
let activeService = 'electricity';

const SVC_META = {
  electricity: { label: 'Electricity', icon: '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/>', color: '#c77700' },
  water:       { label: 'Water',       icon: '<path d="M12 2.5S5 10 5 15a7 7 0 0 0 14 0c0-5-7-12.5-7-12.5Z"/>', color: '#2a7de1' },
  gas:         { label: 'Gas',         icon: '<path d="M8.5 14.5A4 4 0 0 0 16 13c0-3-3-4-2.5-8C9 7 8 9.5 8 11c0-1-1-2-1-2a4 4 0 0 0 1.5 5.5Z"/>', color: '#d62b3a' },
};

function svcIcon(key, size = 22) {
  const m = SVC_META[key];
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${m.icon}</svg>`;
}

function renderEstimate() {
  const svc = (key) => `
    <button class="svc ${key === activeService ? 'is-active' : ''}" data-svc="${key}" type="button">
      ${svcIcon(key, 26)}<span>${SVC_META[key].label}</span>
    </button>`;

  let form = '';
  if (activeService === 'electricity') {
    form = `
      <div class="field">
        <label for="e-units">Units consumed <span class="hint">(kWh this month)</span></label>
        <div class="input-group">
          <input class="input" id="e-units" type="number" inputmode="decimal" min="0" placeholder="e.g. 250" />
          <span class="unit">kWh</span>
        </div>
      </div>
      <div class="row-2">
        <div class="field">
          <label for="e-demand">Demand charge <span class="hint">(৳)</span></label>
          <input class="input" id="e-demand" type="number" inputmode="decimal" min="0" placeholder="0" />
        </div>
        <div class="field">
          <label for="e-meter">Meter rent <span class="hint">(৳)</span></label>
          <input class="input" id="e-meter" type="number" inputmode="decimal" min="0" placeholder="0" />
        </div>
      </div>`;
  } else if (activeService === 'water') {
    form = `
      <div class="field">
        <label for="w-vol">Water used <span class="hint">(1000 L units = m³)</span></label>
        <div class="input-group">
          <input class="input" id="w-vol" type="number" inputmode="decimal" min="0" placeholder="e.g. 15" />
          <span class="unit">m³</span>
        </div>
      </div>
      <div class="field">
        <label for="w-type">Connection type</label>
        <select class="input" id="w-type">
          <option value="domestic">Domestic / residential</option>
          <option value="commercial">Commercial / industrial</option>
        </select>
      </div>
      <label class="check"><input type="checkbox" id="w-sewer" checked /> Add sewerage charge (100%)</label>`;
  } else {
    form = `
      <div class="field">
        <label for="g-mode">Billing type</label>
        <select class="input" id="g-mode">
          <option value="flat">Non-metered (flat monthly)</option>
          <option value="metered">Metered (per m³)</option>
        </select>
      </div>
      <div class="field" id="g-flat-field">
        <label for="g-burner">Burners</label>
        <select class="input" id="g-burner">
          <option value="single">Single burner — ৳${TARIFF.gas.flat.single}/mo</option>
          <option value="double">Double burner — ৳${TARIFF.gas.flat.double}/mo</option>
        </select>
      </div>
      <div class="field" id="g-metered-field" hidden>
        <label for="g-vol">Gas used <span class="hint">(cubic metres)</span></label>
        <div class="input-group">
          <input class="input" id="g-vol" type="number" inputmode="decimal" min="0" placeholder="e.g. 88" />
          <span class="unit">m³</span>
        </div>
      </div>`;
  }

  screen.innerHTML = `
    <section class="view">
      <div class="view-head">
        <h1>Bill estimator</h1>
        <p>Estimate your monthly utility bill with current Dhaka tariff slabs.</p>
      </div>
      <div class="svc-grid">${svc('electricity')}${svc('water')}${svc('gas')}</div>
      <div class="card">
        <h2>${SVC_META[activeService].label} details</h2>
        ${form}
        <button class="btn" id="calcBtn" type="button">Calculate bill</button>
      </div>
      <div id="estResult"></div>
      <p class="note"><strong>Heads up:</strong> rates are indicative retail slabs for estimation only. Your official printed bill — including any arrears, rebate, surcharge or service charge — is the final word.</p>
    </section>`;

  // wire service chooser
  screen.querySelectorAll('.svc').forEach((b) =>
    b.addEventListener('click', () => { activeService = b.dataset.svc; renderEstimate(); }));

  if (activeService === 'gas') {
    const mode = $('#g-mode');
    mode.addEventListener('change', () => {
      const metered = mode.value === 'metered';
      $('#g-metered-field').hidden = !metered;
      $('#g-flat-field').hidden = metered;
    });
  }

  $('#calcBtn').addEventListener('click', runEstimate);
}

function runEstimate() {
  let res;
  if (activeService === 'electricity') {
    const units = parseFloat($('#e-units').value);
    if (!(units >= 0)) return toast('Enter the units consumed');
    res = calcElectricity(units, {
      demand: parseFloat($('#e-demand').value) || 0,
      meter: parseFloat($('#e-meter').value) || 0,
    });
  } else if (activeService === 'water') {
    const vol = parseFloat($('#w-vol').value);
    if (!(vol >= 0)) return toast('Enter the water used');
    res = calcWater(vol, {
      commercial: $('#w-type').value === 'commercial',
      sewer: $('#w-sewer').checked,
    });
  } else {
    const metered = $('#g-mode').value === 'metered';
    if (metered && !(parseFloat($('#g-vol').value) >= 0)) return toast('Enter the gas used');
    res = calcGas({
      metered,
      volume: parseFloat($('#g-vol').value) || 0,
      burner: $('#g-burner').value,
    });
  }

  const rows = res.lines.map((l) => `
    <li><span class="bd-key">${esc(l.k)}<small>${esc(l.s)}</small></span><span class="bd-val">৳ ${fmt(l.v)}</span></li>`).join('');

  $('#estResult').innerHTML = `
    <div class="card result-card">
      <div class="label">Estimated ${SVC_META[activeService].label.toLowerCase()} bill</div>
      <div class="total"><span class="tk">৳</span> ${fmt(res.total)}</div>
      <div class="sub">${esc(res.sub)}</div>
    </div>
    <div class="card">
      <h2>Breakdown</h2>
      <ul class="breakdown">
        ${rows}
        <li class="total-row"><span class="bd-key">Total payable</span><span class="bd-val">৳ ${fmt(res.total)}</span></li>
      </ul>
      <button class="btn secondary" id="saveFromEst" type="button" style="margin-top:14px">＋ Save to My Bills</button>
    </div>`;

  $('#saveFromEst').addEventListener('click', () => openBillModal({
    service: activeService,
    amount: Math.round(res.total),
  }));

  $('#estResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ---------- My Bills ---------- */
function billStatus(b) {
  if (b.paid) return { cls: 'paid', label: 'Paid' };
  if (!b.due) return { cls: 'ok', label: 'No due date' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(b.due + 'T00:00:00');
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { cls: 'due', label: `${Math.abs(days)}d overdue` };
  if (days === 0) return { cls: 'due', label: 'Due today' };
  if (days <= 3) return { cls: 'soon', label: `Due in ${days}d` };
  return { cls: 'ok', label: `Due in ${days}d` };
}

function renderBills() {
  const bills = loadBills().sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    return (a.due || '9999').localeCompare(b.due || '9999');
  });

  let body;
  if (!bills.length) {
    body = `
      <div class="card"><div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 10h18"/></svg>
        <p>No bills saved yet.<br/>Add one to track due dates and totals.</p>
      </div></div>`;
  } else {
    const items = bills.map((b) => {
      const st = billStatus(b);
      const m = SVC_META[b.service] || SVC_META.electricity;
      return `
        <div class="bill" data-id="${b.id}">
          <span class="bill-ic" style="background:${m.color}">${svcIcon(b.service, 20)}</span>
          <span class="bill-main">
            <span class="b-name">${esc(b.name || m.label)}</span>
            <span class="b-meta">${esc(m.label)}${b.acct ? ' · ' + esc(b.acct) : ''}</span>
          </span>
          <span class="bill-amt">
            <span class="b-tk">৳ ${fmt0(b.amount || 0)}</span><br/>
            <span class="pill ${st.cls}">${st.label}</span>
          </span>
        </div>`;
    }).join('');

    const dueTotal = bills.filter((b) => !b.paid).reduce((s, b) => s + (b.amount || 0), 0);
    body = `
      <div class="card result-card">
        <div class="label">Outstanding total</div>
        <div class="total"><span class="tk">৳</span> ${fmt0(dueTotal)}</div>
        <div class="sub">${bills.filter((b) => !b.paid).length} unpaid · ${bills.length} tracked</div>
      </div>
      <div class="card" style="padding:0">${items}</div>`;
  }

  screen.innerHTML = `
    <section class="view">
      <div class="view-head">
        <h1>My bills</h1>
        <p>Track utility accounts, amounts and due dates. Saved on this device only.</p>
      </div>
      ${body}
      <button class="btn" id="addBill" type="button">＋ Add a bill</button>
    </section>`;

  $('#addBill').addEventListener('click', () => openBillModal());
  screen.querySelectorAll('.bill').forEach((el) =>
    el.addEventListener('click', () => openBillModal(loadBills().find((b) => b.id === el.dataset.id))));
}

function openBillModal(prefill) {
  const editing = prefill && prefill.id;
  const b = prefill || {};
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2>${editing ? 'Edit bill' : 'Add bill'}</h2>
        <button type="button" id="mClose" aria-label="Close">✕</button>
      </div>
      <div class="field">
        <label for="m-svc">Service</label>
        <select class="input" id="m-svc">
          <option value="electricity">Electricity</option>
          <option value="water">Water (WASA)</option>
          <option value="gas">Gas (Titas)</option>
        </select>
      </div>
      <div class="field">
        <label for="m-name">Label <span class="hint">(optional)</span></label>
        <input class="input" id="m-name" type="text" placeholder="e.g. Home · DPDC" value="${esc(b.name || '')}" />
      </div>
      <div class="row-2">
        <div class="field">
          <label for="m-amount">Amount <span class="hint">(৳)</span></label>
          <input class="input" id="m-amount" type="number" inputmode="decimal" min="0" placeholder="0" value="${b.amount != null ? b.amount : ''}" />
        </div>
        <div class="field">
          <label for="m-due">Due date</label>
          <input class="input" id="m-due" type="date" value="${esc(b.due || '')}" />
        </div>
      </div>
      <div class="field">
        <label for="m-acct">Account / meter no. <span class="hint">(optional)</span></label>
        <input class="input" id="m-acct" type="text" placeholder="e.g. 1234567" value="${esc(b.acct || '')}" />
      </div>
      <label class="check" style="margin-bottom:16px"><input type="checkbox" id="m-paid" ${b.paid ? 'checked' : ''}/> Mark as paid</label>
      <button class="btn" id="mSave" type="button">${editing ? 'Save changes' : 'Add bill'}</button>
      ${editing ? '<button class="btn secondary" id="mDelete" type="button" style="margin-top:10px">Delete</button>' : ''}
    </div>`;

  document.body.appendChild(back);
  if (b.service) $('#m-svc', back).value = b.service;

  const close = () => back.remove();
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  $('#mClose', back).addEventListener('click', close);

  $('#mSave', back).addEventListener('click', () => {
    const bills = loadBills();
    const rec = {
      id: editing ? b.id : 'b' + Date.now().toString(36),
      service: $('#m-svc', back).value,
      name: $('#m-name', back).value.trim(),
      amount: parseFloat($('#m-amount', back).value) || 0,
      due: $('#m-due', back).value,
      acct: $('#m-acct', back).value.trim(),
      paid: $('#m-paid', back).checked,
    };
    if (editing) {
      const i = bills.findIndex((x) => x.id === b.id);
      bills[i] = rec;
    } else {
      bills.push(rec);
    }
    saveBills(bills);
    close();
    toast(editing ? 'Bill updated' : 'Bill added');
    navigate('bills');
  });

  if (editing) {
    $('#mDelete', back).addEventListener('click', () => {
      saveBills(loadBills().filter((x) => x.id !== b.id));
      close();
      toast('Bill deleted');
      navigate('bills');
    });
  }
}

/* ---------- Directory ---------- */
function renderDirectory() {
  const groups = DIRECTORY.map((g) => `
    <div class="dir-group">
      <h2>${esc(g.group)}</h2>
      <div class="card" style="padding:0">
        ${g.items.map((c) => `
          <a class="contact" href="tel:${esc(c.num)}">
            <span class="contact-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg></span>
            <span class="contact-main"><span class="c-name">${esc(c.name)}</span><span class="c-desc">${esc(c.desc)}</span></span>
            <span class="contact-num">${esc(c.num)}</span>
          </a>`).join('')}
      </div>
    </div>`).join('');

  screen.innerHTML = `
    <section class="view">
      <div class="view-head">
        <h1>Directory</h1>
        <p>Tap a number to call. Utility hotlines and emergency services for Dhaka.</p>
      </div>
      ${groups}
      <p class="note">Short codes (999, 333, 16xxx) are reachable from any mobile or landline in Bangladesh. Save Titas <strong>16496</strong> for gas-leak emergencies.</p>
    </section>`;
}

/* ---------- Tips ---------- */
function renderTips() {
  const items = TIPS.map((t) => `
    <div class="tip">
      <span class="tip-ic">${t.ic}</span>
      <span class="tip-body"><strong>${esc(t.t)}</strong><span>${esc(t.d)}</span></span>
    </div>`).join('');
  screen.innerHTML = `
    <section class="view">
      <div class="view-head">
        <h1>Saving tips</h1>
        <p>Small habits that lower your electricity, water and gas bills.</p>
      </div>
      <div class="card" style="padding:0">${items}</div>
    </section>`;
}

/* ============================================================
   Router / tabs
   ============================================================ */
const VIEWS = { estimate: renderEstimate, bills: renderBills, directory: renderDirectory, tips: renderTips };

function setActiveTab(view) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === view));
}
function navigate(view) {
  (VIEWS[view] || renderEstimate)();
  setActiveTab(view);
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => navigate(t.dataset.view)));

/* ---------- Install prompt ---------- */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $('#installBtn').hidden = false;
});
$('#installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('#installBtn').hidden = true;
});

/* ---------- Boot ---------- */
navigate('estimate');
