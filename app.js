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

/* ---------- Service-zone centers (schematic positions) ----------
   x, y are normalised 0..1 positions on an abstract map of Dhaka
   (x: west→east, y: north→south). Positions are approximate and only
   meant to show which office is *nearest* — not a survey-grade map. */
const ZONES = {
  electricity: {
    label: 'Electricity',
    centers: [
      { n: 'DESCO — Uttara',     a: 'Uttara · Airport',        p: '16120', x: 0.56, y: 0.06 },
      { n: 'DESCO — Mirpur',     a: 'Mirpur · Pallabi',        p: '16120', x: 0.30, y: 0.26 },
      { n: 'DESCO — Gulshan',    a: 'Gulshan · Banani',        p: '16120', x: 0.63, y: 0.31 },
      { n: 'DPDC — Tejgaon',     a: 'Tejgaon · Mohakhali',     p: '16116', x: 0.50, y: 0.42 },
      { n: 'DPDC — Dhanmondi',   a: 'Dhanmondi · Mohammadpur', p: '16116', x: 0.34, y: 0.47 },
      { n: 'DPDC — Banasree',    a: 'Badda · Rampura',         p: '16116', x: 0.72, y: 0.45 },
      { n: 'DPDC — Motijheel',   a: 'Motijheel · Ramna',       p: '16116', x: 0.50, y: 0.62 },
      { n: 'DPDC — Postagola',   a: 'Old Dhaka · Jatrabari',   p: '16116', x: 0.45, y: 0.74 },
    ],
  },
  water: {
    label: 'Water (WASA)',
    centers: [
      { n: 'WASA MODS — Uttara',   a: 'Uttara · Tongi',          p: '16162', x: 0.56, y: 0.07 },
      { n: 'WASA MODS — Mirpur',   a: 'Mirpur · Pallabi',        p: '16162', x: 0.31, y: 0.27 },
      { n: 'WASA MODS — Gulshan',  a: 'Gulshan · Badda',         p: '16162', x: 0.66, y: 0.34 },
      { n: 'WASA MODS — Tejgaon',  a: 'Tejgaon · Mohakhali',     p: '16162', x: 0.50, y: 0.43 },
      { n: 'WASA MODS — Dhanmondi',a: 'Dhanmondi · Mohammadpur', p: '16162', x: 0.33, y: 0.48 },
      { n: 'WASA MODS — Motijheel',a: 'Motijheel · Ramna',       p: '16162', x: 0.50, y: 0.62 },
      { n: 'WASA MODS — Old Dhaka',a: 'Lalbagh · Wari',          p: '16162', x: 0.43, y: 0.72 },
    ],
  },
  gas: {
    label: 'Gas (Titas)',
    centers: [
      { n: 'Titas — Uttara',      a: 'Uttara · Airport',        p: '16496', x: 0.55, y: 0.07 },
      { n: 'Titas — Mirpur',      a: 'Mirpur · Pallabi',        p: '16496', x: 0.31, y: 0.27 },
      { n: 'Titas — Gulshan',     a: 'Gulshan · Banani',        p: '16496', x: 0.64, y: 0.32 },
      { n: 'Titas — Tejgaon',     a: 'Tejgaon · Farmgate',      p: '16496', x: 0.50, y: 0.43 },
      { n: 'Titas — Mohammadpur', a: 'Mohammadpur · Dhanmondi', p: '16496', x: 0.28, y: 0.45 },
      { n: 'Titas — Postagola',   a: 'Old Dhaka · Jatrabari',   p: '16496', x: 0.46, y: 0.72 },
    ],
  },
};

// Soft, distinguishable cell colours (light / dark variants).
const CELL_COLORS = [
  ['#dff0e4', '#1c3a28'], ['#dfeaf6', '#1b2f44'], ['#f6e6df', '#3a281c'],
  ['#efe2f6', '#2e1c3a'], ['#f6f1da', '#3a341a'], ['#daf2f0', '#173a36'],
  ['#f6dfe6', '#3a1c26'], ['#e4e9da', '#28301a'],
];

/* ---------- Nearby essentials (curated Dhaka landmarks) ----------
   Same normalised 0..1 map as the zones. Approximate positions for the
   "what's nearest" lookup — not survey coordinates. */
const AMENITY_CATS = [
  { key: 'police',   label: 'Police station',  icon: '🚓', color: '#1e63d6', phone: '999' },
  { key: 'metro',    label: 'Metro (MRT-6)',   icon: '🚇', color: '#0b8a6a' },
  { key: 'fuel',     label: 'Fuel / CNG',      icon: '⛽', color: '#c77700' },
  { key: 'hospital', label: 'Hospital',        icon: '🏥', color: '#d62b3a' },
  { key: 'fire',     label: 'Fire station',    icon: '🚒', color: '#e0552b', phone: '102' },
];

const AMENITIES = {
  police: [
    { n: 'Uttara West PS', a: 'Uttara', x: 0.50, y: 0.05 },
    { n: 'Uttara East PS', a: 'Uttara', x: 0.58, y: 0.07 },
    { n: 'Pallabi PS', a: 'Pallabi', x: 0.33, y: 0.20 },
    { n: 'Mirpur PS', a: 'Mirpur', x: 0.29, y: 0.27 },
    { n: 'Kafrul PS', a: 'Kafrul', x: 0.45, y: 0.25 },
    { n: 'Gulshan PS', a: 'Gulshan', x: 0.63, y: 0.31 },
    { n: 'Badda PS', a: 'Badda', x: 0.72, y: 0.40 },
    { n: 'Tejgaon PS', a: 'Tejgaon', x: 0.50, y: 0.40 },
    { n: 'Mohammadpur PS', a: 'Mohammadpur', x: 0.26, y: 0.43 },
    { n: 'Dhanmondi PS', a: 'Dhanmondi', x: 0.36, y: 0.47 },
    { n: 'Ramna PS', a: 'Ramna', x: 0.48, y: 0.53 },
    { n: 'Shahbagh PS', a: 'Shahbagh', x: 0.45, y: 0.55 },
    { n: 'Motijheel PS', a: 'Motijheel', x: 0.50, y: 0.62 },
    { n: 'Lalbagh PS', a: 'Lalbagh', x: 0.36, y: 0.66 },
    { n: 'Kotwali PS', a: 'Old Dhaka', x: 0.45, y: 0.70 },
    { n: 'Wari PS', a: 'Wari', x: 0.52, y: 0.69 },
    { n: 'Jatrabari PS', a: 'Jatrabari', x: 0.62, y: 0.74 },
  ],
  metro: [
    { n: 'Uttara North', a: 'MRT-6', x: 0.52, y: 0.04 },
    { n: 'Uttara Center', a: 'MRT-6', x: 0.51, y: 0.08 },
    { n: 'Uttara South', a: 'MRT-6', x: 0.50, y: 0.12 },
    { n: 'Pallabi', a: 'MRT-6', x: 0.45, y: 0.18 },
    { n: 'Mirpur 11', a: 'MRT-6', x: 0.43, y: 0.22 },
    { n: 'Mirpur 10', a: 'MRT-6', x: 0.42, y: 0.26 },
    { n: 'Kazipara', a: 'MRT-6', x: 0.44, y: 0.30 },
    { n: 'Shewrapara', a: 'MRT-6', x: 0.45, y: 0.34 },
    { n: 'Agargaon', a: 'MRT-6', x: 0.44, y: 0.38 },
    { n: 'Bijoy Sarani', a: 'MRT-6', x: 0.47, y: 0.41 },
    { n: 'Farmgate', a: 'MRT-6', x: 0.47, y: 0.45 },
    { n: 'Karwan Bazar', a: 'MRT-6', x: 0.48, y: 0.49 },
    { n: 'Shahbagh', a: 'MRT-6', x: 0.47, y: 0.53 },
    { n: 'Dhaka University', a: 'MRT-6', x: 0.46, y: 0.57 },
    { n: 'Bangladesh Secretariat', a: 'MRT-6', x: 0.49, y: 0.61 },
    { n: 'Motijheel', a: 'MRT-6', x: 0.50, y: 0.64 },
    { n: 'Kamalapur', a: 'MRT-6', x: 0.52, y: 0.67 },
  ],
  fuel: [
    { n: 'Uttara Filling Station', a: 'Uttara', x: 0.55, y: 0.10 },
    { n: 'Mirpur CNG & Fuel', a: 'Mirpur', x: 0.32, y: 0.28 },
    { n: 'Gulshan Filling Station', a: 'Gulshan', x: 0.62, y: 0.34 },
    { n: 'Mohakhali Petrol Pump', a: 'Mohakhali', x: 0.52, y: 0.36 },
    { n: 'Tejgaon Fuel Station', a: 'Tejgaon', x: 0.50, y: 0.43 },
    { n: 'Mohammadpur CNG', a: 'Mohammadpur', x: 0.27, y: 0.45 },
    { n: 'Dhanmondi Filling Station', a: 'Dhanmondi', x: 0.36, y: 0.49 },
    { n: 'Motijheel Petrol Pump', a: 'Motijheel', x: 0.51, y: 0.62 },
    { n: 'Jatrabari Fuel & CNG', a: 'Jatrabari', x: 0.60, y: 0.73 },
  ],
  hospital: [
    { n: 'Kuwait-Bangladesh Friendship', a: 'Uttara', x: 0.54, y: 0.08 },
    { n: 'National Heart Foundation', a: 'Mirpur', x: 0.36, y: 0.27 },
    { n: 'United Hospital', a: 'Gulshan', x: 0.66, y: 0.33 },
    { n: 'Shaheed Suhrawardy (ShSMCH)', a: 'Sher-e-Bangla Nagar', x: 0.42, y: 0.37 },
    { n: 'Square Hospital', a: 'Panthapath', x: 0.43, y: 0.46 },
    { n: 'Labaid Hospital', a: 'Dhanmondi', x: 0.37, y: 0.48 },
    { n: 'BIRDEM General', a: 'Shahbagh', x: 0.46, y: 0.54 },
    { n: 'Dhaka Medical College (DMCH)', a: 'Shahbagh', x: 0.44, y: 0.58 },
    { n: 'Sir Salimullah (Mitford)', a: 'Old Dhaka', x: 0.43, y: 0.70 },
  ],
  fire: [
    { n: 'Uttara Fire Station', a: 'Uttara', x: 0.53, y: 0.07 },
    { n: 'Mirpur Fire Station', a: 'Mirpur', x: 0.31, y: 0.26 },
    { n: 'Mohakhali Fire Station', a: 'Mohakhali', x: 0.53, y: 0.35 },
    { n: 'Tejgaon Fire Station', a: 'Tejgaon', x: 0.49, y: 0.42 },
    { n: 'Hazaribagh Fire Station', a: 'Hazaribagh', x: 0.36, y: 0.62 },
    { n: 'Sadarghat Fire Station', a: 'Old Dhaka', x: 0.46, y: 0.73 },
    { n: 'Postagola Fire Station', a: 'Postagola', x: 0.50, y: 0.76 },
  ],
};

// Approximate real-world span of the schematic map, for rough distances.
const MAP_KM = { w: 16, h: 28 };

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

/* ---------- Zones (Voronoi service-area map) ---------- */
let zoneService = 'electricity';
let zoneSel = null;       // selected center index
let zoneTap = null;       // {x,y} tap point in normalised 0..1 coords
let zoneNearby = [];      // [{cat, item, km}] nearest amenity per category

function isDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function renderZones() {
  const svc = (key) => `
    <button class="svc ${key === zoneService ? 'is-active' : ''}" data-zsvc="${key}" type="button">
      ${svcIcon(key, 26)}<span>${SVC_META[key].label}</span>
    </button>`;

  const centers = ZONES[zoneService].centers;
  const legend = centers.map((c, i) => {
    const dark = isDark();
    const col = CELL_COLORS[i % CELL_COLORS.length][dark ? 1 : 0];
    return `
      <li data-zi="${i}" class="${i === zoneSel ? 'is-sel' : ''}">
        <span class="swatch" style="background:${col}"></span>
        <span class="l-name">${esc(c.n)} <span class="l-area">· ${esc(c.a)}</span></span>
        <a href="tel:${esc(c.p)}" class="contact-num" onclick="event.stopPropagation()">${esc(c.p)}</a>
      </li>`;
  }).join('');

  screen.innerHTML = `
    <section class="view">
      <div class="view-head">
        <h1>Service zones</h1>
        <p>Tap the map to find the utility office covering that area — each colour is one office's catchment.</p>
      </div>
      <div class="svc-grid">${svc('electricity')}${svc('water')}${svc('gas')}</div>
      <div class="card map-wrap">
        <canvas class="map-canvas" id="voronoi"></canvas>
        <p class="map-hint">Schematic map of Dhaka (north at top). Tap anywhere to locate your nearest center.</p>
      </div>
      <div class="card" id="nearestCard"></div>
      <div id="nearbyCard"></div>
      <div class="card" style="padding:6px 12px"><ul class="legend">${legend}</ul></div>
      <p class="note"><strong>Note:</strong> office and landmark positions are approximate, and the map shows the <em>nearest</em> point only — actual administrative service areas may differ. Always confirm with the hotline.</p>
    </section>`;

  // service chooser
  screen.querySelectorAll('.svc').forEach((b) =>
    b.addEventListener('click', () => { zoneService = b.dataset.zsvc; zoneSel = null; zoneTap = null; zoneNearby = []; renderZones(); }));

  // legend selection
  screen.querySelectorAll('.legend li').forEach((li) =>
    li.addEventListener('click', () => { zoneSel = +li.dataset.zi; zoneTap = null; zoneNearby = []; drawVoronoi(); updateNearest(); updateNearby(); }));

  const canvas = $('#voronoi');
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    zoneTap = { x: nx, y: ny };
    zoneSel = nearestCenter(nx, ny);
    zoneNearby = computeNearby(nx, ny);
    drawVoronoi();
    updateNearest();
    updateNearby();
  });

  requestAnimationFrame(() => { drawVoronoi(); updateNearest(); updateNearby(); });
}

function computeNearby(nx, ny) {
  return AMENITY_CATS.map((cat) => {
    let best = null, bd = Infinity;
    for (const item of AMENITIES[cat.key]) {
      const d = (item.x - nx) ** 2 + (item.y - ny) ** 2;
      if (d < bd) { bd = d; best = item; }
    }
    const dx = (best.x - nx) * MAP_KM.w, dy = (best.y - ny) * MAP_KM.h;
    return { cat, item: best, km: Math.sqrt(dx * dx + dy * dy) };
  });
}

function nearestCenter(nx, ny) {
  const centers = ZONES[zoneService].centers;
  let best = 0, bd = Infinity;
  centers.forEach((c, i) => {
    const d = (c.x - nx) ** 2 + (c.y - ny) ** 2;
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

function drawVoronoi() {
  const canvas = $('#voronoi');
  if (!canvas) return;
  const centers = ZONES[zoneService].centers;
  const dark = isDark();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || 320;
  const cssH = Math.round(cssW * 1.12);
  canvas.style.height = cssH + 'px';
  const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // site positions in device pixels
  const sx = centers.map((c) => c.x * W);
  const sy = centers.map((c) => c.y * H);

  // per-pixel nearest-site → owner grid
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const owner = new Int16Array(W * H);
  const pal = centers.map((_, i) => {
    const hex = CELL_COLORS[i % CELL_COLORS.length][dark ? 1 : 0];
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  });
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < centers.length; i++) {
        const d = (sx[i] - x) ** 2 + (sy[i] - y) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      const idx = y * W + x;
      owner[idx] = best;
      let c = pal[best];
      if (zoneSel === best) c = c.map((v) => dark ? Math.min(255, v + 26) : Math.max(0, v - 16));
      const o = idx * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  // edges: darken pixels where owner differs from neighbour
  const edge = dark ? [255, 255, 255] : [20, 50, 35];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const here = owner[idx];
      if ((x > 0 && owner[idx - 1] !== here) || (y > 0 && owner[idx - W] !== here)) {
        const o = idx * 4;
        data[o] = edge[0]; data[o + 1] = edge[1]; data[o + 2] = edge[2]; data[o + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  // site markers + labels
  ctx.textAlign = 'center';
  ctx.font = `${11 * dpr}px 'Plus Jakarta Sans', sans-serif`;
  centers.forEach((c, i) => {
    const x = sx[i], y = sy[i];
    const sel = zoneSel === i;
    ctx.beginPath();
    ctx.arc(x, y, (sel ? 7 : 5) * dpr, 0, Math.PI * 2);
    ctx.fillStyle = SVC_META[zoneService].color;
    ctx.strokeStyle = dark ? '#0a0f0c' : '#fff';
    ctx.lineWidth = 2.5 * dpr;
    ctx.fill(); ctx.stroke();
  });

  // nearest amenity markers + connector lines from the tapped point
  if (zoneTap && zoneNearby.length) {
    const tx = zoneTap.x * W, ty = zoneTap.y * H;
    zoneNearby.forEach(({ cat, item }) => {
      const x = item.x * W, y = item.y * H;
      ctx.beginPath();
      ctx.moveTo(tx, ty); ctx.lineTo(x, y);
      ctx.strokeStyle = cat.color + (dark ? '88' : '66');
      ctx.lineWidth = 1.5 * dpr;
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
    zoneNearby.forEach(({ cat, item }) => {
      const x = item.x * W, y = item.y * H;
      ctx.beginPath();
      ctx.arc(x, y, 5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = cat.color;
      ctx.strokeStyle = dark ? '#0a0f0c' : '#fff';
      ctx.lineWidth = 2 * dpr;
      ctx.fill(); ctx.stroke();
    });
  }

  // tap marker (a ring at the tapped point)
  if (zoneTap) {
    const x = zoneTap.x * W, y = zoneTap.y * H;
    ctx.beginPath();
    ctx.arc(x, y, 6 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = dark ? '#fff' : '#11201a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 11 * dpr, 0, Math.PI * 2);
    ctx.strokeStyle = dark ? '#fff' : '#11201a';
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();
  }
}

function updateNearest() {
  const card = $('#nearestCard');
  if (!card) return;
  if (zoneSel == null) {
    card.innerHTML = `<div class="empty" style="padding:14px 8px"><p>Tap the map or a zone below to see which office covers that area.</p></div>`;
    return;
  }
  const c = ZONES[zoneService].centers[zoneSel];
  const m = SVC_META[zoneService];
  card.innerHTML = `
    <div class="nearest">
      <span class="nearest-ic" style="background:${m.color}">${svcIcon(zoneService, 22)}</span>
      <span class="nearest-main">
        <span class="n-label">${zoneTap ? 'Covers this area' : 'Selected center'}</span>
        <span class="n-name">${esc(c.n)}</span>
        <span class="n-area">${esc(c.a)}</span>
      </span>
      <a class="nearest-call" href="tel:${esc(c.p)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>
        ${esc(c.p)}
      </a>
    </div>`;
}

function updateNearby() {
  const card = $('#nearbyCard');
  if (!card) return;
  if (!zoneNearby.length) { card.innerHTML = ''; return; }
  const rows = zoneNearby.map(({ cat, item, km }) => {
    const dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    const call = cat.phone
      ? `<a class="amen-call" href="tel:${esc(cat.phone)}" aria-label="Call ${esc(cat.label)}">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>
         </a>`
      : '';
    return `
      <div class="amen">
        <span class="amen-ic" style="color:${cat.color}">${cat.icon}</span>
        <span class="amen-main">
          <span class="a-name">${esc(item.n)}</span>
          <span class="a-meta">${esc(cat.label)} · ${esc(item.a)}</span>
        </span>
        <span class="amen-dist">≈ ${dist}</span>
        ${call}
      </div>`;
  }).join('');
  card.innerHTML = `
    <div class="card">
      <h2>Nearby essentials</h2>
      ${rows}
    </div>`;
}

// keep the map crisp on rotation / resize
window.addEventListener('resize', () => { if ($('#voronoi')) drawVoronoi(); });

/* ============================================================
   Router / tabs
   ============================================================ */
const VIEWS = { estimate: renderEstimate, bills: renderBills, zones: renderZones, directory: renderDirectory, tips: renderTips };

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
