/* ============================================================
 * NEO//CALC — futuristic calculator PWA
 * Modes: Standard, Scientific, Converter, Programmer
 * ============================================================ */

(() => {
  'use strict';

  // ---------- storage ----------
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  // ---------- state ----------
  const state = {
    mode: LS.get('mode', 'std'),
    expr: '',                    // expression being built
    result: '0',                 // currently-displayed result
    justEvaluated: false,        // last action was '='
    angle: LS.get('angle', 'DEG'),
    inv: false,                  // inverse trig toggle
    memory: LS.get('memory', 0),
    history: LS.get('history', []),
    // programmer
    progValue: 0,                // integer, signed BigInt-ish (we use Number bitwise within 32-bit)
    progBase: LS.get('progBase', 10),
    progExpr: '',
    // converter
    convCat: LS.get('convCat', 'length'),
    convFrom: LS.get('convFrom', {}),
    convTo: LS.get('convTo', {}),
    convInput: '1',
    // currency
    rates: LS.get('rates', null),  // { base, rates, fetchedAt }
  };

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, props = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const k in props) {
      if (k === 'class') n.className = props[k];
      else if (k === 'dataset') Object.assign(n.dataset, props[k]);
      else if (k in n) n[k] = props[k];
      else n.setAttribute(k, props[k]);
    }
    for (const c of kids) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  };
  const haptic = (ms = 8) => { if (navigator.vibrate) navigator.vibrate(ms); };

  // ---------- number formatting ----------
  function fmtNum(x) {
    if (x === '' || x == null || Number.isNaN(x)) return '0';
    if (typeof x === 'string') return x;
    if (!Number.isFinite(x)) return x > 0 ? '∞' : '-∞';
    const abs = Math.abs(x);
    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return x.toExponential(8).replace(/\.?0+e/, 'e');
    // round at 12 sig figs to avoid 0.1+0.2 weirdness
    const rounded = Math.round(x * 1e12) / 1e12;
    let s = String(rounded);
    if (s.includes('e')) return s;
    // grouping for integer part
    const [intP, decP] = s.split('.');
    const sign = intP.startsWith('-') ? '-' : '';
    const intAbs = sign ? intP.slice(1) : intP;
    const grouped = intAbs.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sign + grouped + (decP ? '.' + decP : '');
  }

  // ============================================================
  // EXPRESSION ENGINE — tokenize → shunting yard → evaluate
  // ============================================================
  const OPS = {
    '+': { p: 1, a: 'L', fn: (a, b) => a + b, ar: 2 },
    '-': { p: 1, a: 'L', fn: (a, b) => a - b, ar: 2 },
    '*': { p: 2, a: 'L', fn: (a, b) => a * b, ar: 2 },
    '/': { p: 2, a: 'L', fn: (a, b) => a / b, ar: 2 },
    '%': { p: 2, a: 'L', fn: (a, b) => a - Math.floor(a / b) * b, ar: 2 }, // mod
    '^': { p: 4, a: 'R', fn: (a, b) => Math.pow(a, b), ar: 2 },
    'u-': { p: 3, a: 'R', fn: (a) => -a, ar: 1 },
    '!': { p: 5, a: 'L', fn: (a) => factorial(a), ar: 1 },
  };

  function factorial(n) {
    if (n < 0 || n !== Math.floor(n)) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  const FUNCS = {
    sin: (x) => Math.sin(toRad(x)),
    cos: (x) => Math.cos(toRad(x)),
    tan: (x) => Math.tan(toRad(x)),
    asin: (x) => fromRad(Math.asin(x)),
    acos: (x) => fromRad(Math.acos(x)),
    atan: (x) => fromRad(Math.atan(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    ln: Math.log,
    log: Math.log10,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    exp: Math.exp,
    abs: Math.abs,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    sign: Math.sign,
  };

  const CONSTS = { 'π': Math.PI, 'pi': Math.PI, 'e': Math.E };

  function toRad(x) { return state.angle === 'DEG' ? x * Math.PI / 180 : x; }
  function fromRad(x) { return state.angle === 'DEG' ? x * 180 / Math.PI : x; }

  function tokenize(input) {
    const tokens = [];
    const s = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
                   .replace(/√/g, 'sqrt').replace(/π/g, 'π');
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      // number
      if (/[0-9.]/.test(c)) {
        let j = i, sawDot = false, sawE = false;
        while (j < s.length) {
          const ch = s[j];
          if (/[0-9]/.test(ch)) { j++; continue; }
          if (ch === '.' && !sawDot && !sawE) { sawDot = true; j++; continue; }
          if ((ch === 'e' || ch === 'E') && !sawE) { sawE = true; j++; if (s[j] === '+' || s[j] === '-') j++; continue; }
          break;
        }
        const num = parseFloat(s.slice(i, j));
        if (Number.isNaN(num)) throw new Error('bad number');
        tokens.push({ t: 'num', v: num });
        i = j; continue;
      }
      // identifier / function / constant
      if (/[a-zπ]/i.test(c)) {
        let j = i;
        while (j < s.length && /[a-z0-9π]/i.test(s[j])) j++;
        const id = s.slice(i, j);
        if (id in FUNCS) tokens.push({ t: 'fn', v: id });
        else if (id in CONSTS) tokens.push({ t: 'num', v: CONSTS[id] });
        else throw new Error('unknown ' + id);
        i = j; continue;
      }
      if (c === '(' || c === ')') { tokens.push({ t: c }); i++; continue; }
      if (c === ',') { tokens.push({ t: ',' }); i++; continue; }
      if (c in OPS || c === '!') {
        // unary minus detection
        const prev = tokens[tokens.length - 1];
        if (c === '-' && (!prev || prev.t === 'op' || prev.t === '(' || prev.t === ',' || prev.t === 'fn')) {
          tokens.push({ t: 'op', v: 'u-' });
        } else if (c === '!') {
          tokens.push({ t: 'op', v: '!' });
        } else {
          tokens.push({ t: 'op', v: c });
        }
        i++; continue;
      }
      throw new Error('bad char ' + c);
    }
    return tokens;
  }

  function toRPN(tokens) {
    const out = [], stack = [];
    for (const tk of tokens) {
      if (tk.t === 'num') out.push(tk);
      else if (tk.t === 'fn') stack.push(tk);
      else if (tk.t === 'op') {
        const op = OPS[tk.v];
        while (stack.length) {
          const top = stack[stack.length - 1];
          if (top.t === 'fn') { out.push(stack.pop()); continue; }
          if (top.t === 'op') {
            const topOp = OPS[top.v];
            if ((op.a === 'L' && topOp.p >= op.p) || (op.a === 'R' && topOp.p > op.p)) {
              out.push(stack.pop()); continue;
            }
          }
          break;
        }
        stack.push(tk);
      }
      else if (tk.t === '(') stack.push(tk);
      else if (tk.t === ')') {
        while (stack.length && stack[stack.length - 1].t !== '(') out.push(stack.pop());
        if (!stack.length) throw new Error('mismatched )');
        stack.pop(); // remove (
        if (stack.length && stack[stack.length - 1].t === 'fn') out.push(stack.pop());
      }
    }
    while (stack.length) {
      const top = stack.pop();
      if (top.t === '(') throw new Error('mismatched (');
      out.push(top);
    }
    return out;
  }

  function evalRPN(rpn) {
    const st = [];
    for (const tk of rpn) {
      if (tk.t === 'num') st.push(tk.v);
      else if (tk.t === 'fn') {
        if (!st.length) throw new Error('arity');
        const a = st.pop();
        st.push(FUNCS[tk.v](a));
      }
      else if (tk.t === 'op') {
        const op = OPS[tk.v];
        if (op.ar === 1) {
          if (!st.length) throw new Error('arity');
          st.push(op.fn(st.pop()));
        } else {
          if (st.length < 2) throw new Error('arity');
          const b = st.pop(), a = st.pop();
          st.push(op.fn(a, b));
        }
      }
    }
    if (st.length !== 1) throw new Error('bad expr');
    return st[0];
  }

  function evaluate(expr) {
    if (!expr || !expr.trim()) return null;
    // close any unclosed parens for live preview
    let s = expr;
    const opens = (s.match(/\(/g) || []).length, closes = (s.match(/\)/g) || []).length;
    if (opens > closes) s += ')'.repeat(opens - closes);
    // strip trailing operator for live preview
    s = s.replace(/[+\-*/^×÷−]\s*$/, '').replace(/[a-z]+\($/i, '');
    if (!s.trim()) return null;
    const tokens = tokenize(s);
    if (!tokens.length) return null;
    return evalRPN(toRPN(tokens));
  }

  // ============================================================
  // CALCULATOR INPUT (std + sci)
  // ============================================================
  // mapping of UI symbols → expression chars
  function press(key) {
    haptic();
    // after = → next digit resets, op continues
    if (key.type === 'digit' || key.type === 'dot' || key.type === 'const' || key.type === 'fn' || key.type === 'open') {
      if (state.justEvaluated) { state.expr = ''; state.justEvaluated = false; }
    } else if (key.type === 'op' || key.type === 'close' || key.type === 'postfix') {
      if (state.justEvaluated) {
        // continue from result
        state.expr = String(toRawNumber(state.result));
        state.justEvaluated = false;
      }
    }

    switch (key.type) {
      case 'digit':
        state.expr += key.v;
        break;
      case 'dot':
        // only one dot per current number
        if (!/(\d*\.\d*)$/.test(state.expr.split(/[^\d.]/).pop() || '')) {
          // need to be more careful — find current number token
        }
        if (currentNumberHasDot()) break;
        if (state.expr === '' || /[^\d.]$/.test(state.expr)) state.expr += '0';
        state.expr += '.';
        break;
      case 'op': {
        // replace trailing op
        if (/[+\-*/^×÷−]$/.test(state.expr)) state.expr = state.expr.slice(0, -1);
        if (state.expr === '' && key.v !== '-') {
          // allow leading - only
          break;
        }
        state.expr += key.v;
        break;
      }
      case 'fn':
        state.expr += key.v + '(';
        break;
      case 'const':
        state.expr += key.v;
        break;
      case 'open':
        state.expr += '(';
        break;
      case 'close':
        state.expr += ')';
        break;
      case 'postfix':
        state.expr += key.v;
        break;
      case 'sign':
        toggleSign();
        break;
      case 'percent':
        applyPercent();
        break;
      case 'recipinv':
        wrapResult((v) => 1 / v, '1/(', ')');
        break;
      case 'square':
        wrapResult((v) => v * v, '(', ')^2');
        break;
      case 'back':
        state.expr = state.expr.slice(0, -1);
        break;
      case 'clear':
        state.expr = '';
        state.result = '0';
        state.justEvaluated = false;
        break;
      case 'equals':
        doEquals();
        break;
      case 'mem':
        memAction(key.v);
        break;
      case 'invtog':
        state.inv = !state.inv;
        renderPad();
        return;
      case 'angle':
        state.angle = state.angle === 'DEG' ? 'RAD' : 'DEG';
        LS.set('angle', state.angle);
        break;
    }
    refreshDisplay();
  }

  function currentNumberHasDot() {
    const m = state.expr.match(/(\d+\.\d*|\.\d+|\d+)$/);
    return m && m[0].includes('.');
  }

  function toggleSign() {
    // negate last number in expression
    const m = state.expr.match(/(-?\d*\.?\d+(?:e[+-]?\d+)?)$/i);
    if (m) {
      const start = state.expr.length - m[0].length;
      let num = m[0];
      if (num.startsWith('-')) num = num.slice(1);
      else num = '-' + num;
      // wrap with parens if preceded by something
      if (start > 0) {
        const prev = state.expr[start - 1];
        if (/[\d)]/.test(prev)) {
          // can't directly negate; insert *(-1)? rare. just prefix.
        }
      }
      state.expr = state.expr.slice(0, start) + num;
    } else if (state.justEvaluated || state.expr === '') {
      const cur = toRawNumber(state.result);
      state.expr = String(-cur);
      state.justEvaluated = false;
    }
  }

  function applyPercent() {
    // x% → x/100
    const m = state.expr.match(/(-?\d*\.?\d+(?:e[+-]?\d+)?)$/i);
    if (m) {
      const start = state.expr.length - m[0].length;
      state.expr = state.expr.slice(0, start) + '(' + m[0] + '/100)';
    } else if (state.justEvaluated) {
      state.expr = '(' + toRawNumber(state.result) + '/100)';
      state.justEvaluated = false;
    }
  }

  function wrapResult(fn, pre, post) {
    if (state.justEvaluated) {
      state.expr = pre + toRawNumber(state.result) + post;
      state.justEvaluated = false;
    } else {
      // wrap trailing number
      const m = state.expr.match(/(-?\d*\.?\d+(?:e[+-]?\d+)?|\)[^)]*)$/);
      if (m) {
        const start = state.expr.length - m[0].length;
        state.expr = state.expr.slice(0, start) + pre + m[0] + post;
      } else {
        state.expr += pre;
      }
    }
  }

  function toRawNumber(s) {
    if (typeof s === 'number') return s;
    return parseFloat(String(s).replace(/,/g, ''));
  }

  function doEquals() {
    if (!state.expr.trim()) return;
    try {
      const tokens = tokenize(state.expr);
      const v = evalRPN(toRPN(tokens));
      if (!Number.isFinite(v) && v !== Infinity && v !== -Infinity) throw new Error('NaN');
      addHistory(state.expr, v);
      state.result = fmtNum(v);
      state.expr = state.result;
      state.justEvaluated = true;
      flashDisplay();
    } catch (err) {
      showError();
    }
  }

  function memAction(action) {
    const cur = toRawNumber(state.result) || 0;
    switch (action) {
      case 'MC': state.memory = 0; break;
      case 'MR':
        if (state.justEvaluated) { state.expr = ''; state.justEvaluated = false; }
        state.expr += String(state.memory);
        break;
      case 'M+': state.memory += cur; break;
      case 'M-': state.memory -= cur; break;
      case 'MS': state.memory = cur; break;
    }
    LS.set('memory', state.memory);
    refreshStatus();
  }

  // ============================================================
  // HISTORY
  // ============================================================
  function addHistory(expr, val) {
    state.history.unshift({ expr, val: fmtNum(val), t: Date.now() });
    if (state.history.length > 100) state.history.length = 100;
    LS.set('history', state.history);
    renderHistory();
  }

  function renderHistory() {
    const list = $('#historyList');
    list.innerHTML = '';
    if (!state.history.length) {
      list.appendChild(el('li', { class: 'empty' }, ['NO RECORDS // TYPE TO BEGIN']));
      return;
    }
    for (const h of state.history) {
      const li = el('li', {}, [
        el('div', { class: 'h-expr' }, [h.expr]),
        el('div', { class: 'h-res' }, ['= ' + h.val]),
      ]);
      li.addEventListener('click', () => {
        state.expr = h.val.replace(/,/g, '');
        state.justEvaluated = true;
        state.result = h.val;
        $('#history').classList.remove('is-open');
        refreshDisplay();
      });
      list.appendChild(li);
    }
  }

  // ============================================================
  // PROGRAMMER MODE
  // ============================================================
  const PROG = {
    BASE_CHARS: { 2: '01', 8: '01234567', 10: '0123456789', 16: '0123456789ABCDEF' },
    parse(s, base) {
      if (!s) return 0;
      const neg = s.startsWith('-');
      const body = neg ? s.slice(1) : s;
      if (body === '') return 0;
      const v = parseInt(body, base);
      if (Number.isNaN(v)) return null;
      return neg ? -v : v;
    },
    fmt(v, base) {
      if (v == null || Number.isNaN(v)) return '—';
      const sign = v < 0 ? '-' : '';
      let n = Math.abs(Math.trunc(v));
      let s = n.toString(base).toUpperCase();
      if (base === 2) s = s.replace(/(\d{4})(?=(\d{4})+$)/g, '$1 ');
      else if (base === 16) s = s.replace(/(.{4})(?=(.{4})+$)/g, '$1 ');
      return sign + s;
    },
  };

  let progBuf = '';  // current input in current base
  let progAcc = null; // accumulated value
  let progOp = null;  // pending op

  function progPress(key) {
    haptic();
    switch (key.type) {
      case 'pdigit': {
        if (state.justEvaluated) { progBuf = ''; state.justEvaluated = false; }
        if (!PROG.BASE_CHARS[state.progBase].includes(key.v)) return;
        progBuf += key.v;
        break;
      }
      case 'pbase':
        // convert buf to int, switch base, redisplay
        if (progBuf) {
          const v = PROG.parse(progBuf, state.progBase);
          state.progBase = key.v;
          progBuf = PROG.fmt(v, key.v).replace(/\s/g, '');
        } else {
          state.progBase = key.v;
        }
        LS.set('progBase', state.progBase);
        refreshStatus();
        renderPad();
        break;
      case 'pop': {
        const v = PROG.parse(progBuf, state.progBase);
        if (v != null) {
          if (progAcc == null) progAcc = v;
          else if (progOp) progAcc = progApply(progAcc, v, progOp);
        }
        progOp = key.v;
        progBuf = '';
        state.justEvaluated = false;
        break;
      }
      case 'pnot': {
        let v = PROG.parse(progBuf, state.progBase);
        if (v == null && progAcc != null) v = progAcc;
        if (v == null) v = 0;
        v = ~v;
        progBuf = PROG.fmt(v, state.progBase).replace(/\s/g, '');
        state.justEvaluated = true;
        break;
      }
      case 'pequals': {
        const v = PROG.parse(progBuf, state.progBase);
        if (v != null) {
          let r = v;
          if (progAcc != null && progOp) r = progApply(progAcc, v, progOp);
          else if (progAcc != null && !progOp) r = progAcc;
          addHistory(progFmtExpr(progAcc, progOp, v), r);
          progBuf = PROG.fmt(r, state.progBase).replace(/\s/g, '');
          progAcc = null; progOp = null;
          state.justEvaluated = true;
          flashDisplay();
        }
        break;
      }
      case 'pback':
        progBuf = progBuf.slice(0, -1);
        state.justEvaluated = false;
        break;
      case 'pclear':
        progBuf = ''; progAcc = null; progOp = null; state.justEvaluated = false;
        break;
      case 'pneg': {
        if (progBuf.startsWith('-')) progBuf = progBuf.slice(1);
        else if (progBuf) progBuf = '-' + progBuf;
        break;
      }
    }
    refreshDisplay();
  }

  function progApply(a, b, op) {
    a |= 0; b |= 0;
    switch (op) {
      case '+': return (a + b) | 0;
      case '-': return (a - b) | 0;
      case '*': return Math.imul(a, b);
      case '/': return b === 0 ? 0 : (a / b) | 0;
      case '%': return b === 0 ? 0 : (a % b) | 0;
      case 'AND': return a & b;
      case 'OR': return a | b;
      case 'XOR': return a ^ b;
      case '<<': return a << (b & 31);
      case '>>': return a >> (b & 31);
    }
    return 0;
  }

  function progFmtExpr(a, op, b) {
    const ar = a == null ? '' : PROG.fmt(a, state.progBase);
    const br = PROG.fmt(b, state.progBase);
    if (!op) return br;
    return `${ar} ${op} ${br}`;
  }

  // ============================================================
  // CONVERTER MODE
  // ============================================================
  // factor = "value in base unit"
  const UNITS = {
    length: { base: 'm', units: {
      mm: 0.001, cm: 0.01, m: 1, km: 1000,
      in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852,
    }},
    mass: { base: 'kg', units: {
      mg: 1e-6, g: 0.001, kg: 1, t: 1000,
      oz: 0.028349523125, lb: 0.45359237, st: 6.35029318,
    }},
    temperature: { base: 'C', units: { C: 1, F: 1, K: 1 }, custom: true },
    volume: { base: 'L', units: {
      mL: 0.001, L: 1, 'm³': 1000,
      'tsp(US)': 0.00492892159375, 'tbsp(US)': 0.01478676478125,
      'floz(US)': 0.0295735295625, 'cup(US)': 0.2365882365,
      'pt(US)': 0.473176473, 'qt(US)': 0.946352946,
      'gal(US)': 3.785411784, 'gal(UK)': 4.54609,
    }},
    area: { base: 'm²', units: {
      'mm²': 1e-6, 'cm²': 1e-4, 'm²': 1, 'ha': 10000, 'km²': 1e6,
      'in²': 0.00064516, 'ft²': 0.09290304, 'yd²': 0.83612736,
      'ac': 4046.8564224, 'mi²': 2589988.110336,
    }},
    speed: { base: 'm/s', units: {
      'm/s': 1, 'km/h': 1 / 3.6, 'mph': 0.44704, 'ft/s': 0.3048, 'knot': 0.514444444,
    }},
    time: { base: 's', units: {
      ms: 0.001, s: 1, min: 60, h: 3600, day: 86400, week: 604800,
      month: 2629800, year: 31557600,
    }},
    data: { base: 'B', units: {
      bit: 0.125, B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776,
    }},
    currency: { base: 'USD', units: {
      USD: 1, EUR: 0.92, GBP: 0.79, JPY: 156, CNY: 7.2, INR: 83.5,
      BDT: 110, AUD: 1.53, CAD: 1.37, CHF: 0.89, HKD: 7.82, SGD: 1.34,
      NZD: 1.66, KRW: 1380, BRL: 5.05, MXN: 17, ZAR: 18.4, RUB: 92,
      AED: 3.67, SAR: 3.75, TRY: 32.3, IDR: 16000, MYR: 4.72, THB: 36.5,
      PHP: 58.5, VND: 25400, PKR: 278, EGP: 49, NGN: 1500, SEK: 10.6,
      NOK: 10.7, DKK: 6.87, PLN: 3.95, CZK: 22.8, HUF: 358, ILS: 3.72,
    }, dynamic: true },
  };

  function tempConvert(v, from, to) {
    let c;
    if (from === 'C') c = v;
    else if (from === 'F') c = (v - 32) * 5 / 9;
    else if (from === 'K') c = v - 273.15;
    if (to === 'C') return c;
    if (to === 'F') return c * 9 / 5 + 32;
    if (to === 'K') return c + 273.15;
  }

  function convertValue(v, cat, from, to) {
    if (cat === 'temperature') return tempConvert(v, from, to);
    const u = UNITS[cat].units;
    if (!(from in u) || !(to in u)) return NaN;
    return v * u[from] / u[to];
  }

  function defaultUnits(cat) {
    const keys = Object.keys(UNITS[cat].units);
    return { from: keys[0], to: keys[1] || keys[0] };
  }

  // currency fetching
  async function refreshRates(force) {
    const FRESH = 1000 * 60 * 60 * 12; // 12h
    const now = Date.now();
    if (!force && state.rates && (now - state.rates.fetchedAt) < FRESH) return;
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
      const j = await r.json();
      if (j && j.rates) {
        state.rates = { base: 'USD', rates: j.rates, fetchedAt: now };
        LS.set('rates', state.rates);
        // merge into UNITS.currency.units
        Object.assign(UNITS.currency.units, j.rates);
        UNITS.currency.units.USD = 1;
        refreshStatus();
        if (state.mode === 'conv' && state.convCat === 'currency') renderConverter();
      }
    } catch {}
  }

  function applyCachedRates() {
    if (state.rates && state.rates.rates) {
      Object.assign(UNITS.currency.units, state.rates.rates);
      UNITS.currency.units.USD = 1;
    }
  }

  // ============================================================
  // UI RENDERING
  // ============================================================
  function renderPad() {
    const pad = $('#pad');
    pad.innerHTML = '';
    pad.className = 'pad';

    if (state.mode === 'conv') {
      renderConverter();
      return;
    }
    if (state.mode === 'prog') {
      renderProgrammer();
      return;
    }

    // STD + SCI share the bottom rows
    const stdRows = [
      [
        ['AC', 'clear', 'danger'],
        ['⌫', 'back', 'fn'],
        ['%', 'percent', 'fn'],
        ['÷', 'op', 'op', '/'],
      ],
      [['7','digit','',''],['8','digit','',''],['9','digit','',''],['×','op','op','*']],
      [['4','digit','',''],['5','digit','',''],['6','digit','',''],['−','op','op','-']],
      [['1','digit','',''],['2','digit','',''],['3','digit','',''],['+','op','op','+']],
      [['±','sign','fn',''],['0','digit','',''],['.','dot','',''],['=','equals','eq','']],
    ];

    const sciTop = [
      [
        [state.inv ? 'INV·' : 'INV', 'invtog', 'toggle' + (state.inv ? ' on' : ''), ''],
        ['MC', 'mem', 'acc', 'MC'],
        ['MR', 'mem', 'acc', 'MR'],
        ['M+', 'mem', 'acc', 'M+'],
        ['M−', 'mem', 'acc', 'M-'],
      ],
      [
        [state.inv ? 'sin⁻¹' : 'sin', 'fn', 'fn', state.inv ? 'asin' : 'sin'],
        [state.inv ? 'cos⁻¹' : 'cos', 'fn', 'fn', state.inv ? 'acos' : 'cos'],
        [state.inv ? 'tan⁻¹' : 'tan', 'fn', 'fn', state.inv ? 'atan' : 'tan'],
        [state.inv ? '10^' : 'log', state.inv ? 'fn' : 'fn', 'fn', state.inv ? 'pow10' : 'log'],
        [state.inv ? 'eˣ' : 'ln', state.inv ? 'fn' : 'fn', 'fn', state.inv ? 'exp' : 'ln'],
      ],
      [
        ['π', 'const', 'fn', 'π'],
        ['e', 'const', 'fn', 'e'],
        ['√', 'fn', 'fn', 'sqrt'],
        ['x²', 'square', 'fn', ''],
        ['x^y', 'op', 'fn', '^'],
      ],
      [
        ['(', 'open', 'fn', ''],
        [')', 'close', 'fn', ''],
        ['n!', 'postfix', 'fn', '!'],
        ['1/x', 'recipinv', 'fn', ''],
        ['EE', 'digit', 'fn', 'e'],
      ],
    ];

    // pow10 / exp special — define them by mapping to fn names
    if (state.inv) {
      FUNCS.pow10 = (x) => Math.pow(10, x);
    }

    const rows = state.mode === 'sci' ? [...sciTop, ...stdRows] : stdRows;

    rows.forEach((row) => {
      const cols = row.length;
      const rowEl = el('div', { class: 'row cols-' + cols });
      row.forEach(([label, type, klass, value]) => {
        const btn = el('button', { class: 'key ' + (klass || ''), type: 'button' }, [label]);
        btn.addEventListener('click', () => {
          press({ type, v: value || label });
        });
        rowEl.appendChild(btn);
      });
      pad.appendChild(rowEl);
    });
  }

  function renderConverter() {
    const pad = $('#pad');
    pad.innerHTML = '';
    pad.className = 'pad';

    const cat = state.convCat;
    const units = Object.keys(UNITS[cat].units);
    if (!state.convFrom[cat] || !units.includes(state.convFrom[cat])) state.convFrom[cat] = units[0];
    if (!state.convTo[cat] || !units.includes(state.convTo[cat])) state.convTo[cat] = units[1] || units[0];

    const pane = el('div', { class: 'conv-pane' });

    // category selector
    const catSel = el('select', { class: 'select' });
    Object.keys(UNITS).forEach((k) => {
      const o = el('option', { value: k }, [k[0].toUpperCase() + k.slice(1)]);
      if (k === cat) o.selected = true;
      catSel.appendChild(o);
    });
    catSel.addEventListener('change', () => {
      state.convCat = catSel.value; LS.set('convCat', state.convCat);
      renderConverter();
      if (state.convCat === 'currency') refreshRates();
    });
    pane.appendChild(catSel);

    // FROM row
    const fromVal = el('input', { class: 'text-input', type: 'text', inputmode: 'decimal', value: state.convInput });
    const fromSel = el('select', { class: 'select' });
    units.forEach((u) => {
      const o = el('option', { value: u }, [u]);
      if (u === state.convFrom[cat]) o.selected = true;
      fromSel.appendChild(o);
    });
    const fromRow = el('div', { class: 'field' }, [fromVal, fromSel]);
    pane.appendChild(fromRow);

    // swap
    const swap = el('button', { class: 'swap-btn', type: 'button' }, ['⇅  SWAP  ⇅']);
    pane.appendChild(swap);

    // TO row
    const toVal = el('input', { class: 'text-input dest', type: 'text', readonly: true });
    const toSel = el('select', { class: 'select' });
    units.forEach((u) => {
      const o = el('option', { value: u }, [u]);
      if (u === state.convTo[cat]) o.selected = true;
      toSel.appendChild(o);
    });
    const toRow = el('div', { class: 'field' }, [toVal, toSel]);
    pane.appendChild(toRow);

    // hint (e.g. currency timestamp)
    if (cat === 'currency') {
      const ts = state.rates ? new Date(state.rates.fetchedAt).toLocaleString() : 'offline (static)';
      const refresh = el('button', { class: 'swap-btn', type: 'button' }, ['↻ REFRESH RATES']);
      refresh.addEventListener('click', () => refreshRates(true));
      const hint = el('div', { class: 'aux' }, []);
      hint.innerHTML = `<div class="row"><span>Rates</span><span>${ts}</span></div>`;
      pane.appendChild(hint);
      pane.appendChild(refresh);
    }

    pad.appendChild(pane);

    const compute = () => {
      state.convInput = fromVal.value;
      state.convFrom[cat] = fromSel.value;
      state.convTo[cat] = toSel.value;
      LS.set('convFrom', state.convFrom);
      LS.set('convTo', state.convTo);
      const v = parseFloat(fromVal.value);
      if (Number.isNaN(v)) { toVal.value = ''; updateConvDisplay('', ''); return; }
      const r = convertValue(v, cat, fromSel.value, toSel.value);
      toVal.value = fmtNum(r);
      updateConvDisplay(`${fmtNum(v)} ${fromSel.value}`, `${toVal.value} ${toSel.value}`);
    };
    fromVal.addEventListener('input', compute);
    fromSel.addEventListener('change', compute);
    toSel.addEventListener('change', compute);
    swap.addEventListener('click', () => {
      const a = fromSel.value, b = toSel.value;
      fromSel.value = b; toSel.value = a;
      compute();
    });
    compute();
  }

  function updateConvDisplay(expr, result) {
    $('#expr').textContent = expr || ' ';
    $('#result').textContent = result || '0';
  }

  function renderProgrammer() {
    const pad = $('#pad');
    pad.innerHTML = '';
    pad.className = 'pad';

    const allowed = PROG.BASE_CHARS[state.progBase];

    // base selector
    const basebar = el('div', { class: 'basebar' });
    [['HEX',16],['DEC',10],['OCT',8],['BIN',2]].forEach(([label, b]) => {
      const btn = el('button', { class: 'key tiny toggle ' + (b === state.progBase ? 'on' : ''), type: 'button' }, [label]);
      btn.addEventListener('click', () => progPress({ type: 'pbase', v: b }));
      basebar.appendChild(btn);
    });
    pad.appendChild(basebar);

    // bases readout
    const cur = PROG.parse(progBuf, state.progBase) ?? 0;
    const bases = el('div', { class: 'bases' });
    [['HEX',16],['DEC',10],['OCT',8],['BIN',2]].forEach(([label, b]) => {
      const row = el('div', { class: 'b' + (b === state.progBase ? ' active' : '') }, [
        el('span', { class: 'lbl' }, [label]),
        el('span', { class: 'val' }, [PROG.fmt(cur, b)]),
      ]);
      bases.appendChild(row);
    });
    pad.appendChild(bases);

    const rows = [
      [['AC','pclear','danger',''],['⌫','pback','fn',''],['NOT','pnot','op',''],['MOD','pop','op','%']],
      [['AND','pop','op','AND'],['OR','pop','op','OR'],['XOR','pop','op','XOR'],['<<','pop','op','<<']],
      [['A','pdigit','fn','A'],['B','pdigit','fn','B'],['C','pdigit','fn','C'],['>>','pop','op','>>']],
      [['D','pdigit','fn','D'],['E','pdigit','fn','E'],['F','pdigit','fn','F'],['÷','pop','op','/']],
      [['7','pdigit','','7'],['8','pdigit','','8'],['9','pdigit','','9'],['×','pop','op','*']],
      [['4','pdigit','','4'],['5','pdigit','','5'],['6','pdigit','','6'],['−','pop','op','-']],
      [['1','pdigit','','1'],['2','pdigit','','2'],['3','pdigit','','3'],['+','pop','op','+']],
      [['±','pneg','fn',''],['0','pdigit','','0'],['=','pequals','eq',''],['','noop','disabled','']],
    ];

    rows.forEach((row) => {
      const rowEl = el('div', { class: 'row cols-4' });
      row.forEach(([label, type, klass, value]) => {
        const isDigitDisabled = type === 'pdigit' && !allowed.includes(value);
        const btn = el('button', { class: 'key ' + (klass || '') + (isDigitDisabled ? ' disabled' : ''), type: 'button' }, [label]);
        btn.addEventListener('click', () => progPress({ type, v: value || label }));
        rowEl.appendChild(btn);
      });
      pad.appendChild(rowEl);
    });
  }

  // ============================================================
  // DISPLAY REFRESH
  // ============================================================
  function refreshDisplay() {
    if (state.mode === 'std' || state.mode === 'sci') {
      $('#expr').textContent = state.expr || ' ';
      if (state.justEvaluated) {
        $('#result').textContent = state.result;
      } else if (!state.expr) {
        $('#result').textContent = '0';
      } else {
        try {
          const v = evaluate(state.expr);
          $('#result').textContent = v == null ? state.expr : fmtNum(v);
        } catch {
          $('#result').textContent = state.expr;
        }
      }
      $('#result').classList.remove('is-error');
      $('#aux').innerHTML = '';
    } else if (state.mode === 'prog') {
      const exprStr = (progAcc != null ? PROG.fmt(progAcc, state.progBase) + (progOp ? ' ' + progOp : '') : '') + (progBuf ? ' ' + progBuf : '');
      $('#expr').textContent = exprStr.trim() || ' ';
      const cur = PROG.parse(progBuf, state.progBase) ?? 0;
      $('#result').textContent = PROG.fmt(cur, state.progBase);
      $('#aux').innerHTML = '';
    }
    refreshStatus();
  }

  function refreshStatus() {
    const angleChip = $('#angleChip');
    const baseChip = $('#baseChip');
    const memChip = $('#memChip');
    const rateChip = $('#rateChip');

    angleChip.hidden = state.mode !== 'sci';
    angleChip.textContent = state.angle;

    baseChip.hidden = state.mode !== 'prog';
    baseChip.textContent = ({2:'BIN',8:'OCT',10:'DEC',16:'HEX'})[state.progBase];

    memChip.hidden = !state.memory;
    memChip.textContent = 'M ' + fmtNum(state.memory);

    rateChip.hidden = !(state.mode === 'conv' && state.convCat === 'currency');
    rateChip.textContent = state.rates ? '↻ ' + new Date(state.rates.fetchedAt).toLocaleDateString() : 'static';
  }

  function flashDisplay() {
    const d = $('#display');
    d.classList.remove('flash');
    void d.offsetWidth;
    d.classList.add('flash');
  }
  function showError() {
    const r = $('#result');
    r.textContent = 'ERR';
    r.classList.add('is-error', 'glitch');
    $('#errChip').hidden = false;
    setTimeout(() => { r.classList.remove('glitch'); $('#errChip').hidden = true; }, 700);
  }

  // ============================================================
  // MODE SWITCHING
  // ============================================================
  function setMode(m) {
    state.mode = m;
    LS.set('mode', m);
    document.querySelectorAll('.mode-tab').forEach((t) => {
      t.classList.toggle('is-active', t.dataset.mode === m);
    });
    renderPad();
    refreshDisplay();
    if (m === 'conv' && state.convCat === 'currency') refreshRates();
  }

  // ============================================================
  // KEYBOARD
  // ============================================================
  function bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (state.mode === 'conv') return;
      if (state.mode === 'prog') {
        const k = e.key.toUpperCase();
        if (/^[0-9A-F]$/.test(k)) { e.preventDefault(); progPress({ type: 'pdigit', v: k }); return; }
        if (k === 'ENTER' || k === '=') { e.preventDefault(); progPress({ type: 'pequals' }); return; }
        if (k === 'BACKSPACE') { e.preventDefault(); progPress({ type: 'pback' }); return; }
        if (k === 'ESCAPE') { e.preventDefault(); progPress({ type: 'pclear' }); return; }
        if (['+','-','*','/'].includes(e.key)) { e.preventDefault(); progPress({ type: 'pop', v: e.key }); return; }
        return;
      }
      const k = e.key;
      if (/^[0-9]$/.test(k)) { press({ type: 'digit', v: k }); e.preventDefault(); return; }
      if (k === '.') { press({ type: 'dot' }); e.preventDefault(); return; }
      if (['+','-','*','/','^','%'].includes(k)) { press({ type: 'op', v: k }); e.preventDefault(); return; }
      if (k === '(') { press({ type: 'open' }); e.preventDefault(); return; }
      if (k === ')') { press({ type: 'close' }); e.preventDefault(); return; }
      if (k === 'Enter' || k === '=') { press({ type: 'equals' }); e.preventDefault(); return; }
      if (k === 'Backspace') { press({ type: 'back' }); e.preventDefault(); return; }
      if (k === 'Escape') { press({ type: 'clear' }); e.preventDefault(); return; }
    });
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    applyCachedRates();
    // tabs
    document.querySelectorAll('.mode-tab').forEach((t) => {
      t.addEventListener('click', () => setMode(t.dataset.mode));
    });
    // history toggle
    $('#historyBtn').addEventListener('click', () => {
      $('#history').classList.toggle('is-open');
    });
    $('#clearHistory').addEventListener('click', () => {
      state.history = []; LS.set('history', []); renderHistory();
    });
    // status chip click → toggle angle in sci
    $('#angleChip').addEventListener('click', () => {
      if (state.mode === 'sci') press({ type: 'angle' });
    });
    // outside click closes history
    document.addEventListener('click', (e) => {
      const h = $('#history');
      if (!h.classList.contains('is-open')) return;
      if (h.contains(e.target) || $('#historyBtn').contains(e.target)) return;
      h.classList.remove('is-open');
    });

    setMode(state.mode);
    renderHistory();
    bindKeyboard();

    // try refresh currency in background after a beat
    if (navigator.onLine) setTimeout(() => refreshRates(false), 1500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
