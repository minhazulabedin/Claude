'use strict';

/* ----------------------------------------------------------------------------
 * NEO//ROUTINE
 * Week index: 0 = Sun ... 6 = Sat. Times are 24h "HH:MM".
 * The schedule is editable and saved on this device (localStorage).
 * -------------------------------------------------------------------------- */

const STORE_KEY = 'neoroutine.classes.v1';
const LOG_KEY = 'neoroutine.errors.v1';
const LOG_MAX = 50;

/* ---------------------------- storage (never throws) ---------------------------- */

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch (_) {} },
};

/* ---------------------------- error log ---------------------------- */

function logError(kind, message, source) {
  const list = store.get(LOG_KEY, []);
  const entries = Array.isArray(list) ? list : [];
  entries.unshift({ t: Date.now(), kind, msg: String(message || 'Unknown error').slice(0, 300), src: String(source || '').slice(0, 80) });
  store.set(LOG_KEY, entries.slice(0, LOG_MAX));
}

window.addEventListener('error', (e) => {
  const file = (e.filename || '').split('/').pop();
  logError('error', e.message, file ? `${file}:${e.lineno || 0}` : '');
});
window.addEventListener('unhandledrejection', (e) => {
  logError('promise', (e.reason && e.reason.message) || e.reason, '');
});

/* ---------------------------- data ---------------------------- */

const COLORS = ['cyan', 'magenta', 'violet', 'amber', 'green'];
const TYPES = ['Theory', 'Lab'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_CLASSES = [
  { id: 'd1', name: 'Software QA & Testing', code: '00955', sec: 'A', color: 'green',   day: 0, start: '08:00', end: '09:30', room: '3112',   type: 'Theory' },
  { id: 'd2', name: 'Web Technologies',      code: '01009', sec: 'F', color: 'magenta', day: 0, start: '10:20', end: '12:40', room: 'DS0206', type: 'Lab' },
  { id: 'd3', name: 'Numerical Methods',     code: '01091', sec: 'A', color: 'violet',  day: 0, start: '13:00', end: '14:30', room: 'DN0610', type: 'Theory' },
  { id: 'd4', name: 'Engineering Ethics',    code: '01903', sec: 'I', color: 'amber',   day: 0, start: '15:00', end: '17:00', room: '9406',   type: 'Theory' },
  { id: 'd5', name: 'AI & Expert System',    code: '00448', sec: 'C', color: 'cyan',    day: 1, start: '10:20', end: '12:40', room: 'DS0104', type: 'Lab' },
  { id: 'd6', name: 'Software QA & Testing', code: '00955', sec: 'A', color: 'green',   day: 2, start: '08:00', end: '09:30', room: '3112',   type: 'Theory' },
  { id: 'd7', name: 'Web Technologies',      code: '01009', sec: 'F', color: 'magenta', day: 2, start: '10:20', end: '12:20', room: '9307',   type: 'Theory' },
  { id: 'd8', name: 'Numerical Methods',     code: '01091', sec: 'A', color: 'violet',  day: 2, start: '13:00', end: '14:30', room: 'DN0610', type: 'Theory' },
  { id: 'd9', name: 'AI & Expert System',    code: '00448', sec: 'C', color: 'cyan',    day: 3, start: '10:20', end: '12:20', room: '9203',   type: 'Theory' },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/* Returns a clean class record, or null if the input can't be one. */
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim().slice(0, 60);
  const day = Number(raw.day);
  const start = String(raw.start || '');
  const end = String(raw.end || '');
  if (!name || !Number.isInteger(day) || day < 0 || day > 6) return null;
  if (!TIME_RE.test(start) || !TIME_RE.test(end) || mins(end) <= mins(start)) return null;
  return {
    id: String(raw.id || newId()),
    name,
    code: String(raw.code || '').trim().slice(0, 12),
    sec: String(raw.sec || '').trim().slice(0, 6),
    color: COLORS.includes(raw.color) ? raw.color : 'cyan',
    day, start, end,
    room: String(raw.room || '').trim().slice(0, 16),
    type: TYPES.includes(raw.type) ? raw.type : 'Theory',
  };
}

function newId() {
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

function loadClasses() {
  const saved = store.get(STORE_KEY, null);
  if (!Array.isArray(saved)) return DEFAULT_CLASSES.map((c) => ({ ...c }));
  return saved.map(normalize).filter(Boolean);
}

/* ---------------------------- helpers ---------------------------- */

const $ = (id) => document.getElementById(id);
function mins(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ESC[ch]);

function fmt12(hhmm) {
  let [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

function durLabel(start, end) {
  const d = mins(end) - mins(start);
  const h = Math.floor(d / 60), m = d % 60;
  return ((h ? `${h}h` : '') + (m ? ` ${m}m` : '')).trim();
}

function classesFor(day) {
  return classes.filter((x) => x.day === day).sort((a, b) => mins(a.start) - mins(b.start));
}

function countdownText(deltaMin) {
  if (deltaMin <= 0) return 'now';
  const days = Math.floor(deltaMin / 1440);
  const h = Math.floor((deltaMin % 1440) / 60);
  const m = deltaMin % 60;
  if (days >= 1) return `in ${days}d ${h}h`;
  if (h >= 1) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

/* The class in session now, else the next one within the coming week. */
function findNext(now) {
  const nowDay = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 8; offset++) {
    const day = (nowDay + offset) % 7;
    for (const cls of classesFor(day)) {
      const startsIn = offset * 1440 + mins(cls.start) - nowMin;
      const endsIn = offset * 1440 + mins(cls.end) - nowMin;
      if (offset === 0 && nowMin >= mins(cls.start) && nowMin < mins(cls.end)) {
        return { cls, deltaMin: 0, live: true, endsIn };
      }
      if (startsIn > 0) return { cls, deltaMin: startsIn, live: false, endsIn };
    }
  }
  return null;
}

/* ---------------------------- state ---------------------------- */

let classes = loadClasses();
let selectedDay = new Date().getDay();
let editingId = null;

function saveClasses() {
  if (!store.set(STORE_KEY, classes)) toast('Could not save on this device');
}

/* ---------------------------- render ---------------------------- */

function renderTabs() {
  const wrap = $('dayTabs');
  const today = new Date().getDay();
  wrap.innerHTML = '';
  DAYS.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.className = 'day-tab';
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(i === selectedDay));
    if (i === selectedDay) btn.classList.add('is-active');
    if (i === today) btn.classList.add('is-today');
    if (!classesFor(i).length) btn.classList.add('is-empty');
    btn.innerHTML = `<span class="dt-name">${d}</span><span class="dt-dot" aria-hidden="true"></span>`;
    btn.addEventListener('click', () => { selectedDay = i; render(); });
    wrap.appendChild(btn);
  });
}

function classCard(cls, now) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = cls.day === now.getDay();
  const isLive = isToday && nowMin >= mins(cls.start) && nowMin < mins(cls.end);
  const isPast = isToday && nowMin >= mins(cls.end);
  const meta = [cls.code, cls.sec ? `SEC ${cls.sec}` : ''].filter(Boolean).join(' · ');

  const card = document.createElement('button');
  card.type = 'button';
  card.className = `class-card tone-${cls.color}` + (isLive ? ' is-live' : '') + (isPast ? ' is-past' : '');
  card.setAttribute('aria-label', `Edit ${cls.name}, ${fmt12(cls.start)}`);
  card.innerHTML = `
    <div class="cc-time">
      <span class="cc-start">${fmt12(cls.start)}</span>
      <span class="cc-end">${fmt12(cls.end)}</span>
      <span class="cc-dur">${durLabel(cls.start, cls.end)}</span>
    </div>
    <div class="cc-rail" aria-hidden="true"></div>
    <div class="cc-body">
      <div class="cc-top">
        <span class="cc-name">${esc(cls.name)}</span>
        <span class="cc-badge badge-${cls.type === 'Lab' ? 'lab' : 'theory'}">${cls.type.toUpperCase()}</span>
      </div>
      <div class="cc-sub">
        ${cls.room ? `<span class="cc-room"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/></svg>${esc(cls.room)}</span>` : ''}
        ${meta ? `<span class="cc-code">${esc(meta)}</span>` : ''}
      </div>
      ${isLive ? '<div class="cc-live"><span class="pulse"></span>IN SESSION NOW</div>' : ''}
    </div>`;
  card.addEventListener('click', () => openEditor(cls.id));
  return card;
}

function renderBoard(now) {
  const board = $('board');
  board.innerHTML = '';
  const list = classesFor(selectedDay);

  const head = document.createElement('div');
  head.className = 'board-head';
  head.innerHTML = `<span class="bh-day">${DAY_LONG[selectedDay]}</span>
    <span class="bh-count">${list.length ? `${list.length} class${list.length > 1 ? 'es' : ''}` : 'free day'}</span>`;
  board.appendChild(head);

  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = '<div class="empty-glyph">◇</div><div class="empty-text">No classes scheduled.<br><span>Tap + to add one.</span></div>';
    board.appendChild(empty);
    return;
  }
  list.forEach((cls) => board.appendChild(classCard(cls, now)));
}

function renderNext(now) {
  const box = $('next');
  const nxt = findNext(now);
  if (!nxt) { box.hidden = true; return; }
  box.hidden = false;
  box.className = `next tone-${nxt.cls.color}` + (nxt.live ? ' is-live' : '');
  $('nextLabel').textContent = nxt.live ? 'IN SESSION' : 'NEXT UP';
  $('nextCourse').textContent = nxt.cls.name;
  const dayTag = nxt.cls.day === now.getDay() && nxt.deltaMin < 1440 ? 'Today' : DAY_LONG[nxt.cls.day];
  const room = nxt.cls.room ? ` · Room ${nxt.cls.room}` : '';
  $('nextMeta').textContent = `${nxt.cls.type}${room} · ${dayTag} ${fmt12(nxt.cls.start)}`;
  $('nextCount').textContent = nxt.live ? `ends ${countdownText(nxt.endsIn)}` : countdownText(nxt.deltaMin);
}

function renderFoot(now) {
  const courses = new Set(classes.map((c) => c.name.toLowerCase())).size;
  const stamp = now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  $('footStat').textContent = `${courses} courses · ${classes.length} sessions/week · ${stamp}`;
}

function render() {
  const now = new Date();
  renderTabs();
  renderNext(now);
  renderBoard(now);
  renderFoot(now);
}

/* ---------------------------- toast ---------------------------- */

let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
}

/* ---------------------------- sheets ---------------------------- */

function openSheet(id) { $(id).hidden = false; document.body.classList.add('sheet-open'); }
function closeSheet(id) {
  $(id).hidden = true;
  if (!document.querySelector('.sheet:not([hidden])')) document.body.classList.remove('sheet-open');
}

/* ---------------------------- editor ---------------------------- */

function setColor(color) {
  document.querySelectorAll('#fColors .swatch').forEach((s) => {
    s.setAttribute('aria-checked', String(s.dataset.color === color));
  });
}
function getColor() {
  const on = document.querySelector('#fColors .swatch[aria-checked="true"]');
  return on ? on.dataset.color : 'cyan';
}

function openEditor(id) {
  editingId = id || null;
  const cls = id ? classes.find((c) => c.id === id) : null;
  $('editorTitle').textContent = cls ? 'EDIT CLASS' : 'NEW CLASS';
  $('fName').value = cls ? cls.name : '';
  $('fCode').value = cls ? cls.code : '';
  $('fSec').value = cls ? cls.sec : '';
  $('fDay').value = String(cls ? cls.day : selectedDay);
  $('fType').value = cls ? cls.type : 'Theory';
  $('fStart').value = cls ? cls.start : '09:00';
  $('fEnd').value = cls ? cls.end : '10:30';
  $('fRoom').value = cls ? cls.room : '';
  setColor(cls ? cls.color : COLORS[classes.length % COLORS.length]);
  $('fError').textContent = '';
  $('deleteBtn').hidden = !cls;
  openSheet('editor');
}

function submitEditor(e) {
  e.preventDefault();
  const start = $('fStart').value, end = $('fEnd').value;
  const name = $('fName').value.trim();
  let problem = '';
  if (!name) problem = 'Give the class a name.';
  else if (!TIME_RE.test(start) || !TIME_RE.test(end)) problem = 'Set a start and end time.';
  else if (mins(end) <= mins(start)) problem = 'End time must be after the start time.';
  if (problem) { $('fError').textContent = problem; return; }

  const record = normalize({
    id: editingId || newId(),
    name, code: $('fCode').value, sec: $('fSec').value,
    color: getColor(), day: Number($('fDay').value),
    start, end, room: $('fRoom').value, type: $('fType').value,
  });
  if (!record) { $('fError').textContent = 'Could not save that class. Check the fields.'; return; }

  const at = classes.findIndex((c) => c.id === editingId);
  if (at >= 0) classes[at] = record; else classes.push(record);
  saveClasses();
  selectedDay = record.day;
  closeSheet('editor');
  render();
  toast(at >= 0 ? 'Class updated' : 'Class added');
}

function deleteEditing() {
  const cls = classes.find((c) => c.id === editingId);
  if (!cls || !window.confirm(`Delete ${cls.name} on ${DAY_LONG[cls.day]}?`)) return;
  classes = classes.filter((c) => c.id !== editingId);
  saveClasses();
  closeSheet('editor');
  render();
  toast('Class deleted');
}

/* ---------------------------- system panel ---------------------------- */

function renderLog() {
  const list = store.get(LOG_KEY, []);
  const entries = Array.isArray(list) ? list : [];
  const box = $('logList');
  $('logCount').textContent = entries.length ? `${entries.length} recorded` : 'none recorded';
  box.innerHTML = '';
  entries.forEach((en) => {
    const li = document.createElement('li');
    const when = new Date(en.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    li.innerHTML = `<span class="log-when">${esc(when)}${en.src ? ` · ${esc(en.src)}` : ''}</span><span class="log-msg">${esc(en.msg)}</span>`;
    box.appendChild(li);
  });
}

function resetSchedule() {
  if (!window.confirm('Replace your schedule with the original one? Your edits will be lost.')) return;
  store.remove(STORE_KEY);
  classes = loadClasses();
  closeSheet('system');
  render();
  toast('Schedule reset');
}

/* ---------------------------- wire up ---------------------------- */

(function init() {
  $('fDay').innerHTML = DAY_LONG.map((d, i) => `<option value="${i}">${d}</option>`).join('');
  $('fColors').innerHTML = COLORS.map((c) =>
    `<button type="button" class="swatch tone-${c}" role="radio" aria-checked="false" aria-label="${c}" data-color="${c}"></button>`).join('');
  $('fColors').addEventListener('click', (e) => {
    const sw = e.target.closest('.swatch');
    if (sw) setColor(sw.dataset.color);
  });

  $('todayBtn').addEventListener('click', () => { selectedDay = new Date().getDay(); render(); });
  $('addBtn').addEventListener('click', () => openEditor(null));
  $('editorForm').addEventListener('submit', submitEditor);
  $('deleteBtn').addEventListener('click', deleteEditing);
  $('systemBtn').addEventListener('click', () => { renderLog(); openSheet('system'); });
  $('clearLogBtn').addEventListener('click', () => { store.remove(LOG_KEY); renderLog(); });
  $('resetBtn').addEventListener('click', resetSchedule);

  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => closeSheet(el.dataset.close));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.sheet:not([hidden])').forEach((s) => closeSheet(s.id));
  });

  render();

  // keep the countdown and live state fresh
  setInterval(() => {
    const now = new Date();
    renderNext(now);
    if (selectedDay === now.getDay()) renderBoard(now);
    renderFoot(now);
  }, 30000);

  // re-sync when the app returns to the foreground (iOS standalone)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
})();
