'use strict';

/* ----------------------------------------------------------------------------
 * NEO//ROUTINE — class schedule data
 * Week index: 0 = Sun, 1 = Mon ... 6 = Sat
 * Times are 24h "HH:MM".
 * -------------------------------------------------------------------------- */

const COURSES = {
  ai:  { code: '00448', name: 'Artificial Intelligence & Expert System', short: 'AI & Expert System', sec: 'C', color: 'cyan' },
  web: { code: '01009', name: 'Web Technologies',                        short: 'Web Technologies',   sec: 'F', color: 'magenta' },
  num: { code: '01091', name: 'Numerical Methods for Sci. & Engineering', short: 'Numerical Methods',  sec: 'A', color: 'violet' },
  eth: { code: '01903', name: 'Engineering Ethics',                      short: 'Engineering Ethics', sec: 'I', color: 'amber' },
  sqt: { code: '00955', name: 'Software Quality & Testing',              short: 'Software QA & Testing', sec: 'A', color: 'green' },
};

const CLASSES = [
  // Sunday
  { c: 'sqt', day: 0, start: '08:00', end: '09:30', room: '3112',   type: 'Theory' },
  { c: 'web', day: 0, start: '10:20', end: '12:40', room: 'DS0206', type: 'Lab' },
  { c: 'num', day: 0, start: '13:00', end: '14:30', room: 'DN0610', type: 'Theory' },
  { c: 'eth', day: 0, start: '15:00', end: '17:00', room: '9406',   type: 'Theory' },
  // Monday
  { c: 'ai',  day: 1, start: '10:20', end: '12:40', room: 'DS0104', type: 'Lab' },
  // Tuesday
  { c: 'sqt', day: 2, start: '08:00', end: '09:30', room: '3112',   type: 'Theory' },
  { c: 'web', day: 2, start: '10:20', end: '12:20', room: '9307',   type: 'Theory' },
  { c: 'num', day: 2, start: '13:00', end: '14:30', room: 'DN0610', type: 'Theory' },
  // Wednesday
  { c: 'ai',  day: 3, start: '10:20', end: '12:20', room: '9203',   type: 'Theory' },
];

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ---------------------------- helpers ---------------------------- */

const $ = (id) => document.getElementById(id);
const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

function fmt12(hhmm) {
  let [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

function durLabel(start, end) {
  const d = mins(end) - mins(start);
  const h = Math.floor(d / 60), m = d % 60;
  return (h ? `${h}h` : '') + (m ? ` ${m}m` : '');
}

function classesFor(day) {
  return CLASSES.filter((x) => x.day === day).sort((a, b) => mins(a.start) - mins(b.start));
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

/* Find the next upcoming class from "now", scanning up to 7 days ahead. */
function findNext(now) {
  const nowDay = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 8; offset++) {
    const day = (nowDay + offset) % 7;
    const todays = classesFor(day);
    for (const cls of todays) {
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

let selectedDay = new Date().getDay();

/* ---------------------------- render ---------------------------- */

function renderTabs() {
  const wrap = $('dayTabs');
  const today = new Date().getDay();
  wrap.innerHTML = '';
  DAYS.forEach((d, i) => {
    const has = classesFor(i).length > 0;
    const btn = document.createElement('button');
    btn.className = 'day-tab';
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    if (i === selectedDay) btn.classList.add('is-active');
    if (i === today) btn.classList.add('is-today');
    if (!has) btn.classList.add('is-empty');
    btn.innerHTML = `<span class="dt-name">${d}</span><span class="dt-dot" aria-hidden="true"></span>`;
    btn.addEventListener('click', () => { selectedDay = i; render(); });
    wrap.appendChild(btn);
  });
}

function classCard(cls, now) {
  const co = COURSES[cls.c];
  const today = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isLive = cls.day === today && nowMin >= mins(cls.start) && nowMin < mins(cls.end);
  const isPast = cls.day === today && nowMin >= mins(cls.end);

  const card = document.createElement('article');
  card.className = `class-card tone-${co.color}` + (isLive ? ' is-live' : '') + (isPast ? ' is-past' : '');

  card.innerHTML = `
    <div class="cc-time">
      <span class="cc-start">${fmt12(cls.start).replace(' ', ' ')}</span>
      <span class="cc-end">${fmt12(cls.end).replace(' ', ' ')}</span>
      <span class="cc-dur">${durLabel(cls.start, cls.end)}</span>
    </div>
    <div class="cc-rail" aria-hidden="true"></div>
    <div class="cc-body">
      <div class="cc-top">
        <span class="cc-name">${co.short}</span>
        <span class="cc-badge badge-${cls.type === 'Lab' ? 'lab' : 'theory'}">${cls.type.toUpperCase()}</span>
      </div>
      <div class="cc-sub">
        <span class="cc-room"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/></svg>${cls.room}</span>
        <span class="cc-code">${co.code} · SEC ${co.sec}</span>
      </div>
      ${isLive ? '<div class="cc-live"><span class="pulse"></span>IN SESSION NOW</div>' : ''}
    </div>
  `;
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
    empty.innerHTML = `<div class="empty-glyph">◇</div><div class="empty-text">No classes scheduled.<br><span>Enjoy the day off.</span></div>`;
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
  const co = COURSES[nxt.cls.c];
  box.className = `next tone-${co.color}` + (nxt.live ? ' is-live' : '');
  $('nextLabel').textContent = nxt.live ? 'IN SESSION' : 'NEXT UP';
  $('nextCourse').textContent = co.short;
  const dayTag = nxt.cls.day === now.getDay() ? 'Today' : DAY_LONG[nxt.cls.day];
  $('nextMeta').innerHTML = `${nxt.cls.type} · Room ${nxt.cls.room} · ${dayTag} ${fmt12(nxt.cls.start)}`;
  $('nextCount').textContent = nxt.live
    ? `ends ${countdownText(nxt.endsIn)}`
    : countdownText(nxt.deltaMin);
}

function renderFoot(now) {
  const total = CLASSES.length;
  const courses = Object.keys(COURSES).length;
  const stamp = now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  $('footStat').textContent = `${courses} courses · ${total} sessions/week · ${stamp}`;
}

function render() {
  const now = new Date();
  renderTabs();
  renderNext(now);
  renderBoard(now);
  renderFoot(now);
}

/* ---------------------------- wire up ---------------------------- */

$('todayBtn').addEventListener('click', () => { selectedDay = new Date().getDay(); render(); });

render();
// keep the countdown + live state fresh
setInterval(() => {
  renderNext(new Date());
  if (selectedDay === new Date().getDay()) renderBoard(new Date());
  renderFoot(new Date());
}, 30000);

// re-sync when app returns to foreground (iOS standalone)
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
