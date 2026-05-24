/* ============================================================
 * NEO//CALC — futuristic calculator PWA  v2.0
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
    mode:     LS.get('mode', 'std'),
    expr:     '',
    result:   '0',
    justEvaluated: false,
    angle:    LS.get('angle', 'DEG'),
    inv:      false,
    memory:   LS.get('memory', 0),
    history:  LS.get('history', []),
    // programmer
    progValue: 0,
    progBase:  LS.get('progBase', 10),
    progExpr:  '',
    // converter
    convCat:  LS.get('convCat', 'length'),
    convFrom: LS.get('convFrom', {}),
    convTo:   LS.get('convTo', {}),
    convInput: '1',
    rates:    LS.get('rates', null),
    // settings
    sound:    LS.get('sound', false),
    haptics:  LS.get('haptics', true),
    anim:     LS.get('anim', true),
    theme:    LS.get('theme', 'cyber'),
    numFmt:   LS.get('numFmt', 'auto'),
    precision: LS.get('precision', 8),
  };

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
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

  const haptic = (ms = 8) => {
    if (state.haptics && navigator.vibrate) navigator.vibrate(ms);
  };

  // ---------- audio ----------
  let _audioCtx = null;
  function audioCtx() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _audioCtx;
  }
  function playTone(freq, type, dur, vol, delay = 0) {
    if (!state.sound) return;
    try {
      const ctx = audioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = type;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.01);
    } catch {}
  }
  const snd = {
    click()  { playTone(900, 'sine', 0.04, 0.05); },
    equals() { [440,660,880].forEach((f, i) => playTone(f, 'sine', 0.12, 0.04, i * 0.07)); },
    error()  { playTone(180, 'sawtooth', 0.22, 0.06); },
    copy()   { [800,1200].forEach((f, i) => playTone(f, 'sine', 0.08, 0.04, i * 0.05)); },
    clear()  { playTone(320, 'square', 0.08, 0.04); },
    mode()   { playTone(600, 'sine', 0.1, 0.04); },
  };

  // ---------- toast ----------
  let _toastTimer = {};
  function toast(msg, type = '', dur = 1800) {
    const stack = $('#toastStack');
    const id = Date.now();
    const t = el('div', { class: 'toast' + (type ? ' ' + type : '') }, [msg]);
    stack.appendChild(t);
    _toastTimer[id] = setTimeout(() => {
      t.classList.add('toast-exit');
      setTimeout(() => t.remove(), 220);
    }, dur);
  }

  // ---------- theme ----------
  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    state.theme = name; LS.set('theme', name);
    $$('.theme-swatch').forEach(s => s.classList.toggle('is-active', s.dataset.theme === name));
  }

  // ---------- number formatting ----------
  function fmtNum(x) {
    if (x === '' || x == null || Number.isNaN(x)) return '0';
    if (typeof x === 'string') return x;
    if (!Number.isFinite(x)) return x > 0 ? '∞' : '-∞';
    if (state.numFmt === 'sci') return x.toExponential(state.precision);
    const abs = Math.abs(x);
    if (state.numFmt === 'auto') {
      if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return x.toExponential(state.precision).replace(/\.?0+e/, 'e');
    }
    if (state.numFmt === 'fixed') return x.toFixed(state.precision);
    // auto: round at 12 sig figs
    const rounded = parseFloat(x.toPrecision(12));
    let s = String(rounded);
    if (s.includes('e')) return s;
    const [intP, decP] = s.split('.');
    const sign = intP.startsWith('-') ? '-' : '';
    const intAbs = sign ? intP.slice(1) : intP;
    const grouped = intAbs.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sign + grouped + (decP ? '.' + decP : '');
  }

  // ============================================================
  // EXPRESSION ENGINE
  // ============================================================
  const OPS = {
    '+':  { p:1, a:'L', fn:(a,b)=>a+b, ar:2 },
    '-':  { p:1, a:'L', fn:(a,b)=>a-b, ar:2 },
    '*':  { p:2, a:'L', fn:(a,b)=>a*b, ar:2 },
    '/':  { p:2, a:'L', fn:(a,b)=>a/b, ar:2 },
    '%':  { p:2, a:'L', fn:(a,b)=>a-Math.floor(a/b)*b, ar:2 },
    '^':  { p:4, a:'R', fn:(a,b)=>Math.pow(a,b), ar:2 },
    'u-': { p:3, a:'R', fn:(a)=>-a, ar:1 },
    '!':  { p:5, a:'L', fn:(a)=>factorial(a), ar:1 },
  };

  function factorial(n) {
    if (n < 0 || n !== Math.floor(n)) return NaN;
    if (n > 170) return Infinity;
    let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
  }

  const FUNCS = {
    sin:   (x) => Math.sin(toRad(x)),
    cos:   (x) => Math.cos(toRad(x)),
    tan:   (x) => Math.tan(toRad(x)),
    asin:  (x) => fromRad(Math.asin(x)),
    acos:  (x) => fromRad(Math.acos(x)),
    atan:  (x) => fromRad(Math.atan(x)),
    sinh:  Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    ln:    Math.log,
    log:   Math.log10,
    log2:  Math.log2,
    sqrt:  Math.sqrt,
    cbrt:  Math.cbrt,
    exp:   Math.exp,
    abs:   Math.abs,
    floor: Math.floor, ceil: Math.ceil, round: Math.round,
    sign:  Math.sign,
  };

  const CONSTS = { 'π':Math.PI, 'pi':Math.PI, 'e':Math.E, 'φ':(1+Math.sqrt(5))/2 };

  function toRad(x)   { return state.angle === 'DEG' ? x * Math.PI / 180 : x; }
  function fromRad(x) { return state.angle === 'DEG' ? x * 180 / Math.PI : x; }

  function tokenize(input) {
    const tokens = [];
    const s = input.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-')
                   .replace(/√/g,'sqrt').replace(/π/g,'π').replace(/φ/g,'φ');
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i, sawDot = false, sawE = false;
        while (j < s.length) {
          const ch = s[j];
          if (/[0-9]/.test(ch)) { j++; continue; }
          if (ch === '.' && !sawDot && !sawE) { sawDot = true; j++; continue; }
          if ((ch === 'e' || ch === 'E') && !sawE) { sawE = true; j++; if (s[j]==='+' || s[j]==='-') j++; continue; }
          break;
        }
        const num = parseFloat(s.slice(i,j));
        if (Number.isNaN(num)) throw new Error('bad number');
        tokens.push({ t:'num', v:num }); i = j; continue;
      }
      if (/[a-zπφ]/i.test(c)) {
        let j = i;
        while (j < s.length && /[a-z0-9πφ]/i.test(s[j])) j++;
        const id = s.slice(i,j);
        if (id in FUNCS) tokens.push({ t:'fn', v:id });
        else if (id in CONSTS) tokens.push({ t:'num', v:CONSTS[id] });
        else throw new Error('unknown ' + id);
        i = j; continue;
      }
      if (c==='(' || c===')') { tokens.push({ t:c }); i++; continue; }
      if (c===',') { tokens.push({ t:',' }); i++; continue; }
      if (c in OPS || c==='!') {
        const prev = tokens[tokens.length-1];
        if (c==='-' && (!prev || prev.t==='op' || prev.t==='(' || prev.t===',' || prev.t==='fn')) {
          tokens.push({ t:'op', v:'u-' });
        } else if (c==='!') {
          tokens.push({ t:'op', v:'!' });
        } else {
          tokens.push({ t:'op', v:c });
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
      if (tk.t==='num') out.push(tk);
      else if (tk.t==='fn') stack.push(tk);
      else if (tk.t==='op') {
        const op = OPS[tk.v];
        while (stack.length) {
          const top = stack[stack.length-1];
          if (top.t==='fn') { out.push(stack.pop()); continue; }
          if (top.t==='op') {
            const topOp = OPS[top.v];
            if ((op.a==='L' && topOp.p>=op.p)||(op.a==='R' && topOp.p>op.p)) { out.push(stack.pop()); continue; }
          }
          break;
        }
        stack.push(tk);
      }
      else if (tk.t==='(') stack.push(tk);
      else if (tk.t===')') {
        while (stack.length && stack[stack.length-1].t!=='(') out.push(stack.pop());
        if (!stack.length) throw new Error('mismatched )');
        stack.pop();
        if (stack.length && stack[stack.length-1].t==='fn') out.push(stack.pop());
      }
    }
    while (stack.length) {
      const top = stack.pop();
      if (top.t==='(') throw new Error('mismatched (');
      out.push(top);
    }
    return out;
  }

  function evalRPN(rpn) {
    const st = [];
    for (const tk of rpn) {
      if (tk.t==='num') st.push(tk.v);
      else if (tk.t==='fn') {
        if (!st.length) throw new Error('arity');
        st.push(FUNCS[tk.v](st.pop()));
      }
      else if (tk.t==='op') {
        const op = OPS[tk.v];
        if (op.ar===1) { if (!st.length) throw new Error('arity'); st.push(op.fn(st.pop())); }
        else { if (st.length<2) throw new Error('arity'); const b=st.pop(),a=st.pop(); st.push(op.fn(a,b)); }
      }
    }
    if (st.length!==1) throw new Error('bad expr');
    return st[0];
  }

  function evaluate(expr) {
    if (!expr || !expr.trim()) return null;
    let s = expr;
    const opens = (s.match(/\(/g)||[]).length, closes = (s.match(/\)/g)||[]).length;
    if (opens > closes) s += ')'.repeat(opens - closes);
    s = s.replace(/[+\-*/^×÷−]\s*$/, '').replace(/[a-z]+\($/i, '');
    if (!s.trim()) return null;
    const tokens = tokenize(s);
    if (!tokens.length) return null;
    return evalRPN(toRPN(tokens));
  }

  // ============================================================
  // CALCULATOR INPUT (std + sci)
  // ============================================================
  function press(key) {
    haptic();
    snd.click();
    if (key.type==='digit'||key.type==='dot'||key.type==='const'||key.type==='fn'||key.type==='open') {
      if (state.justEvaluated) { state.expr=''; state.justEvaluated=false; }
    } else if (key.type==='op'||key.type==='close'||key.type==='postfix') {
      if (state.justEvaluated) { state.expr=String(toRawNumber(state.result)); state.justEvaluated=false; }
    }
    switch (key.type) {
      case 'digit':   state.expr += key.v; break;
      case 'dot':
        if (currentNumberHasDot()) break;
        if (state.expr==='' || /[^\d.]$/.test(state.expr)) state.expr += '0';
        state.expr += '.'; break;
      case 'op':
        if (/[+\-*/^×÷−]$/.test(state.expr)) state.expr = state.expr.slice(0,-1);
        if (state.expr==='' && key.v!=='-') break;
        state.expr += key.v; break;
      case 'fn':      state.expr += key.v + '('; break;
      case 'const':   state.expr += key.v; break;
      case 'open':    state.expr += '('; break;
      case 'close':   state.expr += ')'; break;
      case 'postfix': state.expr += key.v; break;
      case 'sign':    toggleSign(); break;
      case 'percent': applyPercent(); break;
      case 'recipinv': wrapResult(v=>1/v, '1/(', ')'); break;
      case 'square':  wrapResult(v=>v*v, '(', ')^2'); break;
      case 'back':    state.expr = state.expr.slice(0,-1); break;
      case 'clear':   snd.clear(); state.expr=''; state.result='0'; state.justEvaluated=false; break;
      case 'equals':  doEquals(); return;
      case 'mem':     memAction(key.v); return;
      case 'invtog':  state.inv = !state.inv; renderPad(); return;
      case 'angle':   state.angle = state.angle==='DEG'?'RAD':'DEG'; LS.set('angle', state.angle); break;
    }
    refreshDisplay();
  }

  function currentNumberHasDot() {
    const m = state.expr.match(/(\d+\.\d*|\.\d+|\d+)$/);
    return m && m[0].includes('.');
  }

  function toggleSign() {
    const m = state.expr.match(/(-?\d*\.?\d+(?:e[+-]?\d+)?)$/i);
    if (m) {
      const start = state.expr.length - m[0].length;
      let num = m[0];
      num = num.startsWith('-') ? num.slice(1) : '-' + num;
      state.expr = state.expr.slice(0, start) + num;
    } else if (state.justEvaluated || state.expr==='') {
      state.expr = String(-toRawNumber(state.result));
      state.justEvaluated = false;
    }
  }

  function applyPercent() {
    const m = state.expr.match(/(-?\d*\.?\d+(?:e[+-]?\d+)?)$/i);
    if (m) {
      const start = state.expr.length - m[0].length;
      state.expr = state.expr.slice(0,start) + '(' + m[0] + '/100)';
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
      const m = state.expr.match(/(-?\d*\.?\d+(?:e[+-]?\d+)?|\)[^)]*)$/);
      if (m) {
        const start = state.expr.length - m[0].length;
        state.expr = state.expr.slice(0,start) + pre + m[0] + post;
      } else {
        state.expr += pre;
      }
    }
  }

  function toRawNumber(s) {
    if (typeof s==='number') return s;
    return parseFloat(String(s).replace(/,/g,''));
  }

  function doEquals() {
    if (!state.expr.trim()) return;
    try {
      const tokens = tokenize(state.expr);
      const v = evalRPN(toRPN(tokens));
      if (!Number.isFinite(v) && v!==Infinity && v!==-Infinity) throw new Error('NaN');
      addHistory(state.expr, v);
      state.result = fmtNum(v);
      state.expr = state.result;
      state.justEvaluated = true;
      snd.equals();
      if (state.anim) flashDisplay();
      animateResult();
    } catch {
      snd.error();
      showError();
    }
    refreshDisplay();
  }

  function memAction(action) {
    const cur = toRawNumber(state.result) || 0;
    switch (action) {
      case 'MC': state.memory=0; toast('Memory cleared'); break;
      case 'MR':
        if (state.justEvaluated) { state.expr=''; state.justEvaluated=false; }
        state.expr += String(state.memory); break;
      case 'M+': state.memory += cur; toast('M + ' + fmtNum(cur)); break;
      case 'M-': state.memory -= cur; toast('M − ' + fmtNum(cur)); break;
      case 'MS': state.memory = cur; toast('Stored ' + fmtNum(cur)); break;
    }
    LS.set('memory', state.memory);
    refreshStatus();
    refreshDisplay();
  }

  // ============================================================
  // HISTORY
  // ============================================================
  function addHistory(expr, val) {
    state.history.unshift({ expr, val:fmtNum(val), t:Date.now() });
    if (state.history.length > 100) state.history.length = 100;
    LS.set('history', state.history);
    renderHistory();
  }

  function relTime(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5)   return 'just now';
    if (s < 60)  return s + 's ago';
    if (s < 3600) return Math.floor(s/60) + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago';
    return Math.floor(s/86400) + 'd ago';
  }

  function renderHistory(filter = '') {
    const list = $('#historyList');
    const stats = $('#historyStats');
    list.innerHTML = '';
    const items = filter
      ? state.history.filter(h => h.expr.toLowerCase().includes(filter) || h.val.includes(filter))
      : state.history;

    if (!items.length) {
      list.appendChild(el('li', { class:'empty' }, [filter ? 'NO MATCHES FOUND' : 'NO RECORDS // TYPE TO BEGIN']));
      stats.innerHTML = '';
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const h = items[i];
      const origIdx = state.history.indexOf(h);
      const li = el('li');
      const delBtn = el('button', { class:'h-del', type:'button', 'aria-label':'Delete' }, ['✕']);
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.history.splice(origIdx, 1);
        LS.set('history', state.history);
        li.style.transition = 'opacity .2s, transform .2s';
        li.style.opacity = '0'; li.style.transform = 'translateX(20px)';
        setTimeout(() => renderHistory($('#historySearch').value.toLowerCase()), 210);
      });
      li.appendChild(el('div', { class:'h-expr' }, [h.expr]));
      li.appendChild(el('div', { class:'h-res'  }, ['= ' + h.val]));
      li.appendChild(el('div', { class:'h-time' }, [relTime(h.t)]));
      li.appendChild(delBtn);
      li.addEventListener('click', () => {
        state.expr = h.val.replace(/,/g,'');
        state.justEvaluated = true;
        state.result = h.val;
        $('#history').classList.remove('is-open');
        refreshDisplay();
        toast('Loaded: ' + h.val);
      });
      list.appendChild(li);
    }

    // stats
    const nums = items.map(h => parseFloat(h.val.replace(/,/g,''))).filter(v => !isNaN(v));
    if (nums.length > 1) {
      const sum = nums.reduce((a,b)=>a+b,0);
      const avg = sum / nums.length;
      stats.innerHTML = `<span>${items.length} entries</span><span>Σ <b>${fmtNum(sum)}</b></span><span>avg <b>${fmtNum(avg)}</b></span>`;
    } else {
      stats.innerHTML = `<span>${items.length} entr${items.length===1?'y':'ies'}</span>`;
    }
  }

  // ============================================================
  // PROGRAMMER MODE
  // ============================================================
  const PROG = {
    BASE_CHARS: { 2:'01', 8:'01234567', 10:'0123456789', 16:'0123456789ABCDEF' },
    parse(s, base) {
      if (!s) return 0;
      const neg = s.startsWith('-'); const body = neg ? s.slice(1) : s;
      if (body==='') return 0;
      const v = parseInt(body, base);
      if (Number.isNaN(v)) return null;
      return neg ? -v : v;
    },
    fmt(v, base) {
      if (v==null || Number.isNaN(v)) return '—';
      const sign = v<0 ? '-' : '';
      let n = Math.abs(Math.trunc(v));
      let s = n.toString(base).toUpperCase();
      if (base===2)  s = s.replace(/(\d{4})(?=(\d{4})+$)/g,'$1 ');
      else if (base===16) s = s.replace(/(.{4})(?=(.{4})+$)/g,'$1 ');
      return sign + s;
    },
  };

  let progBuf = '';
  let progAcc = null;
  let progOp  = null;

  function progPress(key) {
    haptic(); snd.click();
    switch (key.type) {
      case 'pdigit':
        if (state.justEvaluated) { progBuf=''; state.justEvaluated=false; }
        if (!PROG.BASE_CHARS[state.progBase].includes(key.v)) return;
        progBuf += key.v; break;
      case 'pbase':
        if (progBuf) { const v = PROG.parse(progBuf, state.progBase); state.progBase=key.v; progBuf=PROG.fmt(v,key.v).replace(/\s/g,''); }
        else { state.progBase=key.v; }
        LS.set('progBase', state.progBase); refreshStatus(); renderPad(); return;
      case 'pop': {
        const v = PROG.parse(progBuf, state.progBase);
        if (v!=null) { if (progAcc==null) progAcc=v; else if (progOp) progAcc=progApply(progAcc,v,progOp); }
        progOp=key.v; progBuf=''; state.justEvaluated=false; break;
      }
      case 'pnot': {
        let v = PROG.parse(progBuf, state.progBase);
        if (v==null && progAcc!=null) v=progAcc;
        if (v==null) v=0;
        v = ~v;
        progBuf = PROG.fmt(v, state.progBase).replace(/\s/g,'');
        state.justEvaluated=true; break;
      }
      case 'pequals': {
        const v = PROG.parse(progBuf, state.progBase);
        if (v!=null) {
          let r=v;
          if (progAcc!=null && progOp) r=progApply(progAcc,v,progOp);
          else if (progAcc!=null && !progOp) r=progAcc;
          addHistory(progFmtExpr(progAcc,progOp,v), r);
          progBuf=PROG.fmt(r,state.progBase).replace(/\s/g,'');
          progAcc=null; progOp=null; state.justEvaluated=true;
          snd.equals(); if (state.anim) flashDisplay();
        }
        break;
      }
      case 'pback': progBuf=progBuf.slice(0,-1); state.justEvaluated=false; break;
      case 'pclear': snd.clear(); progBuf=''; progAcc=null; progOp=null; state.justEvaluated=false; break;
      case 'pneg':
        if (progBuf.startsWith('-')) progBuf=progBuf.slice(1); else if (progBuf) progBuf='-'+progBuf; break;
    }
    refreshDisplay();
    updateBitGrid();
  }

  function progApply(a, b, op) {
    a|=0; b|=0;
    switch (op) {
      case '+':   return (a+b)|0;
      case '-':   return (a-b)|0;
      case '*':   return Math.imul(a,b);
      case '/':   return b===0 ? 0 : (a/b)|0;
      case '%':   return b===0 ? 0 : (a%b)|0;
      case 'AND': return a&b;
      case 'OR':  return a|b;
      case 'XOR': return a^b;
      case '<<':  return a<<(b&31);
      case '>>':  return a>>(b&31);
    }
    return 0;
  }

  function progFmtExpr(a, op, b) {
    const ar = a==null ? '' : PROG.fmt(a,state.progBase);
    const br = PROG.fmt(b,state.progBase);
    if (!op) return br;
    return `${ar} ${op} ${br}`;
  }

  // bit grid
  let _bitGrid = null;
  function buildBitGrid() {
    const wrap = el('div', { class:'bit-grid-wrap' });
    const labelRow = el('div', { class:'bit-grid-label' }, [
      el('span', {}, ['BIT VIEW']),
      el('span', {}, ['click to toggle']),
    ]);
    wrap.appendChild(labelRow);
    const grid = el('div', { class:'bit-grid' });
    for (let i = 31; i >= 0; i--) {
      const cell = el('div', { class:'bit-cell', dataset:{ bit:i } }, ['0']);
      cell.addEventListener('click', () => toggleBit(i));
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    _bitGrid = wrap;
    return wrap;
  }

  function toggleBit(bit) {
    haptic(5);
    const cur = PROG.parse(progBuf, state.progBase) ?? 0;
    const toggled = cur ^ (1 << bit);
    progBuf = PROG.fmt(toggled, state.progBase).replace(/\s/g,'');
    refreshDisplay();
    updateBitGrid();
  }

  function updateBitGrid() {
    if (!_bitGrid) return;
    const cur = PROG.parse(progBuf, state.progBase) ?? 0;
    const cells = _bitGrid.querySelectorAll('.bit-cell');
    cells.forEach(cell => {
      const bit = parseInt(cell.dataset.bit);
      const isOn = !!(cur & (1 << bit));
      cell.textContent = isOn ? '1' : '0';
      cell.classList.toggle('on', isOn);
    });
  }

  // ============================================================
  // CONVERTER MODE
  // ============================================================
  const UNITS = {
    length: { base:'m', units:{ mm:0.001, cm:0.01, m:1, km:1000, in:0.0254, ft:0.3048, yd:0.9144, mi:1609.344, nmi:1852 }},
    mass:   { base:'kg', units:{ mg:1e-6, g:0.001, kg:1, t:1000, oz:0.028349523125, lb:0.45359237, st:6.35029318 }},
    temperature: { base:'C', units:{ C:1, F:1, K:1 }, custom:true },
    volume: { base:'L', units:{
      mL:0.001, L:1, 'm³':1000,
      'tsp(US)':0.00492892159375, 'tbsp(US)':0.01478676478125,
      'floz(US)':0.0295735295625, 'cup(US)':0.2365882365,
      'pt(US)':0.473176473, 'qt(US)':0.946352946,
      'gal(US)':3.785411784, 'gal(UK)':4.54609,
    }},
    area: { base:'m²', units:{
      'mm²':1e-6, 'cm²':1e-4, 'm²':1, 'ha':10000, 'km²':1e6,
      'in²':0.00064516, 'ft²':0.09290304, 'yd²':0.83612736, 'ac':4046.8564224, 'mi²':2589988.110336,
    }},
    speed: { base:'m/s', units:{ 'm/s':1, 'km/h':1/3.6, 'mph':0.44704, 'ft/s':0.3048, 'knot':0.514444444 }},
    time:  { base:'s', units:{ ms:0.001, s:1, min:60, h:3600, day:86400, week:604800, month:2629800, year:31557600 }},
    data:  { base:'B', units:{ bit:0.125, B:1, KB:1024, MB:1048576, GB:1073741824, TB:1099511627776 }},
    angle: { base:'deg', units:{ deg:1, rad:180/Math.PI, grad:0.9, turn:360 }},
    pressure: { base:'Pa', units:{ Pa:1, kPa:1000, MPa:1e6, bar:100000, atm:101325, psi:6894.757, mmHg:133.322 }},
    energy: { base:'J', units:{ J:1, kJ:1000, cal:4.184, kcal:4184, Wh:3600, kWh:3600000, BTU:1055.06, eV:1.60218e-19 }},
    currency: { base:'USD', units:{
      USD:1, EUR:0.92, GBP:0.79, JPY:156, CNY:7.2, INR:83.5,
      BDT:110, AUD:1.53, CAD:1.37, CHF:0.89, HKD:7.82, SGD:1.34,
      NZD:1.66, KRW:1380, BRL:5.05, MXN:17, ZAR:18.4, AED:3.67,
      SAR:3.75, TRY:32.3, IDR:16000, MYR:4.72, THB:36.5,
      PHP:58.5, VND:25400, PKR:278, SEK:10.6, NOK:10.7, DKK:6.87,
    }, dynamic:true },
  };

  function tempConvert(v, from, to) {
    let c;
    if (from==='C') c=v; else if (from==='F') c=(v-32)*5/9; else if (from==='K') c=v-273.15;
    if (to==='C') return c; if (to==='F') return c*9/5+32; if (to==='K') return c+273.15;
  }

  function convertValue(v, cat, from, to) {
    if (cat==='temperature') return tempConvert(v, from, to);
    const u = UNITS[cat].units;
    if (!(from in u) || !(to in u)) return NaN;
    return v * u[from] / u[to];
  }

  async function refreshRates(force) {
    const FRESH = 1000 * 60 * 60 * 12;
    const now = Date.now();
    if (!force && state.rates && (now-state.rates.fetchedAt)<FRESH) return;
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/USD', { cache:'no-store' });
      const j = await r.json();
      if (j && j.rates) {
        state.rates = { base:'USD', rates:j.rates, fetchedAt:now };
        LS.set('rates', state.rates);
        Object.assign(UNITS.currency.units, j.rates);
        UNITS.currency.units.USD = 1;
        refreshStatus();
        if (state.mode==='conv' && state.convCat==='currency') renderConverter();
        toast('Exchange rates updated', 'success');
      }
    } catch { if (force) toast('Rate fetch failed — using cached', 'error'); }
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
    _bitGrid = null;
    if (state.anim) pad.classList.add('pad-enter');

    if (state.mode==='conv') { renderConverter(); return; }
    if (state.mode==='prog') { renderProgrammer(); return; }

    const stdRows = [
      [['AC','clear','danger'],['⌫','back','fn'],['%','percent','fn'],['÷','op','op','/']],
      [['7','digit',''],['8','digit',''],['9','digit',''],['×','op','op','*']],
      [['4','digit',''],['5','digit',''],['6','digit',''],['−','op','op','-']],
      [['1','digit',''],['2','digit',''],['3','digit',''],['+','op','op','+']],
      [['±','sign','fn'],['0','digit'],  ['.','dot'],    ['=','equals','eq']],
    ];

    const sciTop = [
      [
        [state.inv?'INV·':'INV','invtog','toggle'+(state.inv?' on':''),''],
        ['MC','mem','acc','MC'],['MR','mem','acc','MR'],['M+','mem','acc','M+'],['M−','mem','acc','M-'],
      ],
      [
        [state.inv?'sin⁻¹':'sin',  'fn','fn', state.inv?'asin':'sin'],
        [state.inv?'cos⁻¹':'cos',  'fn','fn', state.inv?'acos':'cos'],
        [state.inv?'tan⁻¹':'tan',  'fn','fn', state.inv?'atan':'tan'],
        [state.inv?'10ˣ':'log',    'fn','fn', state.inv?'pow10':'log'],
        [state.inv?'eˣ':'ln',      'fn','fn', state.inv?'exp':'ln'],
      ],
      [
        ['π','const','fn','π'],
        ['e','const','fn','e'],
        ['φ','const','fn','φ'],
        ['√','fn','fn','sqrt'],
        ['∛','fn','fn','cbrt'],
      ],
      [
        ['(','open','fn',''],
        [')','close','fn',''],
        ['n!','postfix','fn','!'],
        ['1/x','recipinv','fn',''],
        ['xʸ','op','fn','^'],
      ],
      [
        ['log₂','fn','fn muted','log2'],
        ['x²','square','fn',''],
        ['|x|','fn','fn','abs'],
        ['EE','digit','fn','e'],
        ['MS','mem','acc muted','MS'],
      ],
    ];

    if (state.inv) { FUNCS.pow10 = (x) => Math.pow(10,x); }

    const rows = state.mode==='sci' ? [...sciTop, ...stdRows] : stdRows;
    const cols = state.mode==='sci' ? 5 : 4;
    if (cols===5) pad.classList.add('cols-5');

    rows.forEach(row => {
      const rowEl = el('div', { class:'row' });
      row.forEach(([label, type, klass='', value]) => {
        const btn = makeKey(label, type, klass, value||label);
        rowEl.appendChild(btn);
      });
      pad.appendChild(rowEl);
    });
  }

  function makeKey(label, type, klass, value) {
    const btn = el('button', { class:'key '+(klass||''), type:'button' }, [label]);
    // ripple origin tracking
    btn.addEventListener('pointerdown', (e) => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--rx', ((e.clientX-rect.left)/rect.width*100)+'%');
      btn.style.setProperty('--ry', ((e.clientY-rect.top)/rect.height*100)+'%');
    });
    // long press on backspace = clear all
    let longPressTimer = null;
    if (type==='back') {
      btn.addEventListener('pointerdown', () => {
        longPressTimer = setTimeout(() => {
          haptic(20); snd.clear();
          state.expr=''; state.result='0'; state.justEvaluated=false;
          refreshDisplay();
          toast('Cleared');
        }, 600);
      });
      btn.addEventListener('pointerup',    () => clearTimeout(longPressTimer));
      btn.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
    }
    if (type==='pclear') {
      btn.addEventListener('pointerdown', () => {
        longPressTimer = setTimeout(() => {
          haptic(20); snd.clear();
          progBuf=''; progAcc=null; progOp=null; state.justEvaluated=false;
          refreshDisplay(); updateBitGrid(); toast('Cleared');
        }, 600);
      });
      btn.addEventListener('pointerup',    () => clearTimeout(longPressTimer));
      btn.addEventListener('pointerleave', () => clearTimeout(longPressTimer));
    }
    if (state.mode==='prog') {
      btn.addEventListener('click', () => progPress({ type, v:value||label }));
    } else {
      btn.addEventListener('click', () => press({ type, v:value||label }));
    }
    return btn;
  }

  function renderConverter() {
    const pad = $('#pad');
    pad.innerHTML = '';
    pad.className = 'pad';
    if (state.anim) pad.classList.add('pad-enter');

    const cat = state.convCat;
    const units = Object.keys(UNITS[cat].units);
    if (!state.convFrom[cat]||!units.includes(state.convFrom[cat])) state.convFrom[cat]=units[0];
    if (!state.convTo[cat]  ||!units.includes(state.convTo[cat]))   state.convTo[cat]=units[1]||units[0];

    const pane = el('div', { class:'conv-pane' });

    // category selector
    const catSel = el('select', { class:'select' });
    Object.keys(UNITS).forEach(k => {
      const o = el('option', { value:k }, [k[0].toUpperCase()+k.slice(1)]);
      if (k===cat) o.selected=true;
      catSel.appendChild(o);
    });
    catSel.addEventListener('change', () => {
      state.convCat=catSel.value; LS.set('convCat', state.convCat);
      renderConverter();
      if (state.convCat==='currency') refreshRates();
    });
    pane.appendChild(catSel);

    // FROM row
    const fromVal = el('input', { class:'text-input', type:'text', inputmode:'decimal', value:state.convInput });
    const fromSel = el('select', { class:'select' });
    units.forEach(u => { const o=el('option',{value:u},[u]); if(u===state.convFrom[cat]) o.selected=true; fromSel.appendChild(o); });
    pane.appendChild(el('div', { class:'field' }, [fromVal, fromSel]));

    // swap button
    const swap = el('button', { class:'swap-btn', type:'button' }, ['⇅  SWAP  ⇅']);
    pane.appendChild(swap);

    // TO row
    const toVal = el('input', { class:'text-input dest', type:'text' });
    toVal.readOnly = true;
    const toSel = el('select', { class:'select' });
    units.forEach(u => { const o=el('option',{value:u},[u]); if(u===state.convTo[cat]) o.selected=true; toSel.appendChild(o); });
    pane.appendChild(el('div', { class:'field' }, [toVal, toSel]));

    // currency rate info
    if (cat==='currency') {
      const ts = state.rates ? new Date(state.rates.fetchedAt).toLocaleString() : 'offline';
      const hint = el('div', { class:'aux' });
      hint.innerHTML = `<div class="row"><span>Rates updated</span><span>${ts}</span></div>`;
      const refreshBtn = el('button', { class:'swap-btn', type:'button' }, ['↻ REFRESH RATES']);
      refreshBtn.addEventListener('click', () => refreshRates(true));
      pane.appendChild(hint);
      pane.appendChild(refreshBtn);
    }

    // all-units table
    const allBtn = el('button', { class:'all-units-btn', type:'button' }, ['▾ SHOW ALL CONVERSIONS']);
    const allTable = el('div', { class:'all-units-table' });
    let allOpen = false;
    allBtn.addEventListener('click', () => {
      allOpen = !allOpen;
      allTable.classList.toggle('is-open', allOpen);
      allBtn.textContent = allOpen ? '▴ HIDE CONVERSIONS' : '▾ SHOW ALL CONVERSIONS';
      if (allOpen) buildAllUnitsTable();
    });

    const buildAllUnitsTable = () => {
      allTable.innerHTML = '';
      const v = parseFloat(fromVal.value);
      if (isNaN(v)) return;
      units.forEach(u => {
        const r = convertValue(v, cat, fromSel.value, u);
        const row = el('div', { class:'unit-row'+(u===toSel.value?' active':'') });
        row.appendChild(el('span', { class:'u-name' }, [u]));
        row.appendChild(el('span', { class:'u-val'  }, [fmtNum(r)]));
        row.addEventListener('click', () => {
          toSel.value = u;
          compute();
          allTable.querySelectorAll('.unit-row').forEach(r2 => r2.classList.remove('active'));
          row.classList.add('active');
        });
        allTable.appendChild(row);
      });
    };
    pane.appendChild(allBtn);
    pane.appendChild(allTable);

    pad.appendChild(pane);

    const compute = () => {
      state.convInput = fromVal.value;
      state.convFrom[cat] = fromSel.value;
      state.convTo[cat]   = toSel.value;
      LS.set('convFrom', state.convFrom);
      LS.set('convTo', state.convTo);
      const v = parseFloat(fromVal.value);
      if (isNaN(v)) { toVal.value=''; updateConvDisplay('',''); return; }
      const r = convertValue(v, cat, fromSel.value, toSel.value);
      toVal.value = fmtNum(r);
      updateConvDisplay(`${fmtNum(v)} ${fromSel.value}`, `${toVal.value} ${toSel.value}`);
      if (allOpen) buildAllUnitsTable();
    };
    fromVal.addEventListener('input',  compute);
    fromSel.addEventListener('change', compute);
    toSel.addEventListener('change',   compute);
    swap.addEventListener('click', () => {
      const a=fromSel.value, b=toSel.value;
      fromSel.value=b; toSel.value=a; compute();
    });
    // copy result on tap
    toVal.addEventListener('click', () => {
      if (toVal.value) copyToClipboard(toVal.value + ' ' + toSel.value);
    });
    compute();
  }

  function updateConvDisplay(expr, result) {
    $('#expr').textContent = expr || ' ';
    $('#result').textContent = result || '0';
  }

  function renderProgrammer() {
    const pad = $('#pad');
    pad.innerHTML = '';
    pad.className = 'pad';
    if (state.anim) pad.classList.add('pad-enter');
    _bitGrid = null;

    const pane = el('div', { class:'prog-pane' });

    // base bar
    const basebar = el('div', { class:'basebar' });
    [['HEX',16],['DEC',10],['OCT',8],['BIN',2]].forEach(([label,b]) => {
      const btn = makeKey(label, 'pbase', 'key tiny toggle'+(b===state.progBase?' on':''), b);
      basebar.appendChild(btn);
    });
    pane.appendChild(basebar);

    // bases readout
    const cur = PROG.parse(progBuf, state.progBase) ?? 0;
    const bases = el('div', { class:'bases' });
    [['HEX',16],['DEC',10],['OCT',8],['BIN',2]].forEach(([label,b]) => {
      const row = el('div', { class:'b'+(b===state.progBase?' active':'') }, [
        el('span', { class:'lbl' }, [label]),
        el('span', { class:'val' }, [PROG.fmt(cur, b)]),
      ]);
      bases.appendChild(row);
    });
    pane.appendChild(bases);

    // bit grid
    const bitWrap = buildBitGrid();
    pane.appendChild(bitWrap);
    updateBitGrid();

    // digit/op rows
    const allowed = PROG.BASE_CHARS[state.progBase];
    const rows = [
      [['AC','pclear','danger'],['⌫','pback','fn'],['NOT','pnot','op'],['MOD','pop','op','%']],
      [['AND','pop','op','AND'],['OR','pop','op','OR'],['XOR','pop','op','XOR'],['<<','pop','op','<<']],
      [['A','pdigit','fn'],['B','pdigit','fn'],['C','pdigit','fn'],['>>','pop','op','>>']],
      [['D','pdigit','fn'],['E','pdigit','fn'],['F','pdigit','fn'],['÷','pop','op','/']],
      [['7','pdigit'],['8','pdigit'],['9','pdigit'],['×','pop','op','*']],
      [['4','pdigit'],['5','pdigit'],['6','pdigit'],['−','pop','op','-']],
      [['1','pdigit'],['2','pdigit'],['3','pdigit'],['+','pop','op','+']],
      [['±','pneg','fn'],['0','pdigit'],['=','pequals','eq'],['','noop','disabled']],
    ];
    rows.forEach(row => {
      const rowEl = el('div', { class:'row cols-4' });
      row.forEach(([label,type,klass='',value]) => {
        const isDisabled = type==='pdigit' && !allowed.includes(value||label);
        const btn = makeKey(label, type, klass+(isDisabled?' disabled':''), value||label);
        if (isDisabled) btn.disabled = true;
        rowEl.appendChild(btn);
      });
      pane.appendChild(rowEl);
    });

    pad.appendChild(pane);
  }

  // ============================================================
  // DISPLAY REFRESH
  // ============================================================
  function refreshDisplay() {
    if (state.mode==='std'||state.mode==='sci') {
      $('#expr').textContent = state.expr || ' ';
      if (state.justEvaluated) {
        $('#result').textContent = state.result;
      } else if (!state.expr) {
        $('#result').textContent = '0';
      } else {
        try {
          const v = evaluate(state.expr);
          $('#result').textContent = v==null ? state.expr : fmtNum(v);
        } catch {
          $('#result').textContent = state.expr;
        }
      }
      $('#result').classList.remove('is-error');
      $('#aux').innerHTML = '';
      updateParenChip();
    } else if (state.mode==='prog') {
      const exprStr = (progAcc!=null?PROG.fmt(progAcc,state.progBase)+(progOp?' '+progOp:''):'')+
                      (progBuf?' '+progBuf:'');
      $('#expr').textContent = exprStr.trim() || ' ';
      const cur = PROG.parse(progBuf, state.progBase) ?? 0;
      $('#result').textContent = PROG.fmt(cur, state.progBase);
      $('#aux').innerHTML = '';
      updateBitGrid();
    }
    refreshStatus();
  }

  function updateParenChip() {
    const opens  = (state.expr.match(/\(/g)||[]).length;
    const closes = (state.expr.match(/\)/g)||[]).length;
    const diff = opens - closes;
    const chip = $('#parenChip');
    chip.hidden = diff <= 0;
    if (diff > 0) chip.textContent = '( '.repeat(Math.min(diff,3)).trim() + (diff>3?` +${diff-3}`:'');
  }

  function refreshStatus() {
    const angleChip = $('#angleChip');
    const baseChip  = $('#baseChip');
    const memChip   = $('#memChip');
    const rateChip  = $('#rateChip');

    angleChip.hidden = state.mode !== 'sci';
    angleChip.textContent = state.angle;

    baseChip.hidden = state.mode !== 'prog';
    baseChip.textContent = ({2:'BIN',8:'OCT',10:'DEC',16:'HEX'})[state.progBase];

    memChip.hidden = !state.memory;
    memChip.textContent = 'M ' + fmtNum(state.memory);

    rateChip.hidden = !(state.mode==='conv' && state.convCat==='currency');
    rateChip.textContent = state.rates ? '↻ '+new Date(state.rates.fetchedAt).toLocaleDateString() : 'static';
  }

  function flashDisplay() {
    const d = $('#display');
    d.classList.remove('flash');
    void d.offsetWidth;
    d.classList.add('flash');
  }

  function animateResult() {
    const r = $('#result');
    r.classList.remove('pop');
    void r.offsetWidth;
    r.classList.add('pop');
  }

  function showError() {
    const r = $('#result');
    r.textContent = 'ERR';
    r.classList.add('is-error','glitch');
    $('#errChip').hidden = false;
    setTimeout(() => { r.classList.remove('glitch'); $('#errChip').hidden=true; }, 700);
    refreshStatus();
  }

  // ============================================================
  // COPY TO CLIPBOARD
  // ============================================================
  function copyToClipboard(text) {
    text = text || $('#result').textContent;
    if (!text || text==='0' || text==='ERR') return;
    const raw = text.replace(/,/g,'');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(raw).then(() => {
        snd.copy(); haptic(5);
        toast('Copied: ' + raw, 'success');
        animateCopyFlash();
      }).catch(() => fallbackCopy(raw));
    } else {
      fallbackCopy(raw);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); snd.copy(); toast('Copied: '+text,'success'); animateCopyFlash(); }
    catch  { toast('Copy failed','error'); }
    document.body.removeChild(ta);
  }

  function animateCopyFlash() {
    const d = $('#display');
    d.classList.remove('flash');
    void d.offsetWidth;
    d.classList.add('flash');
  }

  // ============================================================
  // MODE SWITCHING
  // ============================================================
  function setMode(m) {
    state.mode = m;
    LS.set('mode', m);
    snd.mode();
    $$('.mode-tab').forEach(t => {
      t.classList.toggle('is-active', t.dataset.mode===m);
      t.setAttribute('aria-selected', String(t.dataset.mode===m));
    });
    renderPad();
    refreshDisplay();
    if (m==='conv' && state.convCat==='currency') refreshRates();
  }

  // ============================================================
  // SWIPE GESTURES
  // ============================================================
  function bindSwipe() {
    const MODES = ['std','sci','conv','prog'];
    let sx = null, sy = null;
    document.addEventListener('touchstart', e => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive:true });
    document.addEventListener('touchend', e => {
      if (sx===null) return;
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 55) {
        // don't trigger if history/settings panel is open
        if ($('#history').classList.contains('is-open')) return;
        if ($('#settingsPanel').classList.contains('is-open')) return;
        const idx = MODES.indexOf(state.mode);
        if (dx < 0 && idx < MODES.length-1) setMode(MODES[idx+1]);
        else if (dx > 0 && idx > 0)         setMode(MODES[idx-1]);
      }
      sx = null;
    }, { passive:true });
  }

  // ============================================================
  // KEYBOARD
  // ============================================================
  function bindKeyboard() {
    window.addEventListener('keydown', e => {
      // don't capture when typing in search/input
      if (e.target.tagName==='INPUT' || e.target.tagName==='SELECT' || e.target.tagName==='TEXTAREA') return;

      // global: ? = shortcuts, Tab = mode switch
      if (e.key==='?') { e.preventDefault(); openShortcuts(); return; }
      if (e.key==='Tab') {
        e.preventDefault();
        const modes=['std','sci','conv','prog'], idx=modes.indexOf(state.mode);
        if (e.shiftKey) { if(idx>0) setMode(modes[idx-1]); }
        else { if(idx<modes.length-1) setMode(modes[idx+1]); }
        return;
      }

      if (state.mode==='conv') {
        if (e.key==='Escape') { e.preventDefault(); if($('#settingsPanel').classList.contains('is-open')) closePanels(); }
        return;
      }
      if (state.mode==='prog') {
        const k = e.key.toUpperCase();
        if (/^[0-9A-F]$/.test(k)) { e.preventDefault(); progPress({ type:'pdigit', v:k }); return; }
        if (k==='ENTER'||k==='=')  { e.preventDefault(); progPress({ type:'pequals' }); return; }
        if (k==='BACKSPACE')       { e.preventDefault(); progPress({ type:'pback'   }); return; }
        if (k==='ESCAPE')          { e.preventDefault(); progPress({ type:'pclear'  }); return; }
        if (['+','-','*','/'].includes(e.key)) { e.preventDefault(); progPress({ type:'pop', v:e.key }); return; }
        return;
      }
      const k = e.key;
      if (/^[0-9]$/.test(k))             { e.preventDefault(); press({ type:'digit', v:k }); return; }
      if (k==='.')                        { e.preventDefault(); press({ type:'dot' }); return; }
      if (['+','-','*','/','^','%'].includes(k)) { e.preventDefault(); press({ type:'op', v:k }); return; }
      if (k==='(')                        { e.preventDefault(); press({ type:'open' }); return; }
      if (k===')')                        { e.preventDefault(); press({ type:'close' }); return; }
      if (k==='Enter'||k==='=')          { e.preventDefault(); press({ type:'equals' }); return; }
      if (k==='Backspace')               { e.preventDefault(); press({ type:'back' }); return; }
      if (k==='Escape')                  { e.preventDefault(); press({ type:'clear' }); return; }
    });
  }

  // ============================================================
  // SETTINGS PANEL
  // ============================================================
  function openSettings() {
    $('#settingsPanel').classList.add('is-open');
    $('#settingsPanel').setAttribute('aria-hidden','false');
  }
  function closeSettings() {
    $('#settingsPanel').classList.remove('is-open');
    $('#settingsPanel').setAttribute('aria-hidden','true');
  }
  function closePanels() {
    closeSettings();
    $('#history').classList.remove('is-open');
  }

  function openShortcuts() {
    $('#shortcutsOverlay').classList.add('is-open');
    $('#shortcutsOverlay').setAttribute('aria-hidden','false');
  }
  function closeShortcuts() {
    $('#shortcutsOverlay').classList.remove('is-open');
    $('#shortcutsOverlay').setAttribute('aria-hidden','true');
  }

  function bindSettings() {
    $('#settingsBtn').addEventListener('click', () => openSettings());
    $('#settingsClose').addEventListener('click', () => closeSettings());

    // theme swatches
    $$('.theme-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        applyTheme(sw.dataset.theme);
        toast('Theme: ' + sw.dataset.theme.toUpperCase());
      });
    });

    // toggles
    function bindToggle(id, key, onCb) {
      const btn = $('#' + id);
      btn.setAttribute('aria-checked', String(state[key]));
      btn.addEventListener('click', () => {
        state[key] = !state[key];
        LS.set(key, state[key]);
        btn.setAttribute('aria-checked', String(state[key]));
        if (onCb) onCb(state[key]);
      });
    }
    bindToggle('soundToggle', 'sound', v => v && snd.click());
    bindToggle('hapticToggle','haptics');
    bindToggle('animToggle',  'anim');

    // number format
    $$('#formatSeg .seg-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.fmt===state.numFmt);
      btn.addEventListener('click', () => {
        state.numFmt = btn.dataset.fmt;
        LS.set('numFmt', state.numFmt);
        $$('#formatSeg .seg-btn').forEach(b => b.classList.toggle('is-active', b===btn));
        refreshDisplay();
        toast('Format: ' + btn.dataset.fmt.toUpperCase());
      });
    });

    // precision
    $$('#precSeg .seg-btn').forEach(btn => {
      btn.classList.toggle('is-active', parseInt(btn.dataset.prec)===state.precision);
      btn.addEventListener('click', () => {
        state.precision = parseInt(btn.dataset.prec);
        LS.set('precision', state.precision);
        $$('#precSeg .seg-btn').forEach(b => b.classList.toggle('is-active', b===btn));
        refreshDisplay();
      });
    });

    // shortcuts
    $('#showShortcuts').addEventListener('click', () => { closeSettings(); openShortcuts(); });
    $('#shortcutsClose').addEventListener('click', closeShortcuts);
    $('#shortcutsOverlay').addEventListener('click', e => { if (e.target===$('#shortcutsOverlay')) closeShortcuts(); });

    // clear all
    $('#clearAll').addEventListener('click', () => {
      if (!confirm('Clear all data including history, memory, and settings?')) return;
      localStorage.clear();
      toast('All data cleared', 'error');
      setTimeout(() => location.reload(), 800);
    });

    // outside click
    document.addEventListener('click', e => {
      const sp = $('#settingsPanel');
      if (sp.classList.contains('is-open') && !sp.contains(e.target) && !$('#settingsBtn').contains(e.target)) closeSettings();
      const h = $('#history');
      if (h.classList.contains('is-open') && !h.contains(e.target) && !$('#historyBtn').contains(e.target)) h.classList.remove('is-open');
    });
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    applyCachedRates();
    applyTheme(state.theme);

    // sync all toggle pills
    $('#soundToggle').setAttribute('aria-checked', String(state.sound));
    $('#hapticToggle').setAttribute('aria-checked', String(state.haptics));
    $('#animToggle').setAttribute('aria-checked', String(state.anim));

    // mode tabs
    $$('.mode-tab').forEach(t => t.addEventListener('click', () => setMode(t.dataset.mode)));

    // history
    $('#historyBtn').addEventListener('click', () => {
      const h = $('#history');
      h.classList.toggle('is-open');
      h.setAttribute('aria-hidden', String(!h.classList.contains('is-open')));
      if (h.classList.contains('is-open')) renderHistory();
    });
    $('#clearHistory').addEventListener('click', () => {
      state.history=[]; LS.set('history',[]); renderHistory();
      toast('History cleared');
    });
    $('#historySearch').addEventListener('input', e => renderHistory(e.target.value.toLowerCase()));

    // copy result on click
    $('#result').addEventListener('click', () => copyToClipboard());
    $('#result').addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') copyToClipboard(); });

    // status chip: angle toggle
    $('#angleChip').addEventListener('click', () => { if (state.mode==='sci') press({ type:'angle' }); });

    // settings & panels
    bindSettings();
    bindSwipe();
    bindKeyboard();

    setMode(state.mode);
    renderHistory();

    if (navigator.onLine) setTimeout(() => refreshRates(false), 1500);

    // update relative timestamps every 30s
    setInterval(() => {
      if ($('#history').classList.contains('is-open')) {
        renderHistory($('#historySearch').value.toLowerCase());
      }
    }, 30000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
