/* Flux unit conversions */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const EASE_IO = 'cubic-bezier(.65, 0, .35, 1)';
  const EASE_OUT = 'cubic-bezier(.2, .7, .2, 1)';

  // ---------- Constants ----------
  // Conventional standard atomic weights (IUPAC 2007), the values behind the SwissFluxNet sequences.
  const AW = { C: 12.0107, H: 1.00794, N: 14.0067, O: 15.9994 };
  const MW = {
    CO2: AW.C + 2 * AW.O,
    CH4: AW.C + 4 * AW.H,
    N2O: 2 * AW.N + AW.O,
    H2O: 2 * AW.H + AW.O,
  };
  // IPCC AR6 WG1 Table 7.15, GWP over 100 years (CH4: non-fossil origin).
  const GWP = { CH4: 27.0, N2O: 273 };

  const SPECIES = {
    co2: {
      formula: 'CO₂', name: 'Carbon dioxide', color: '--c-co2', M: MW.CO2, atoms: ['C', 'O'],
      sign: ['net emission, surface to atmosphere', 'net uptake, atmosphere to surface'],
      bases: {
        mol: { label: 'CO₂', atom: 'CO₂', hint: 'molecule', M: MW.CO2, n: 1 },
        el: { label: 'C', atom: 'C', hint: 'carbon content (CO₂-C)', M: AW.C, n: 1 },
      },
    },
    ch4: {
      formula: 'CH₄', name: 'Methane', color: '--c-ch4', M: MW.CH4, atoms: ['C', 'H'],
      sign: ['emission, surface to atmosphere', 'uptake, atmosphere to surface'],
      bases: {
        mol: { label: 'CH₄', atom: 'CH₄', hint: 'molecule', M: MW.CH4, n: 1 },
        el: { label: 'CH₄-C', atom: 'C', hint: 'carbon content', M: AW.C, n: 1 },
        eq: { label: 'CO₂-eq', hint: `AR6 GWP₁₀₀ = ${GWP.CH4} (non-fossil) · mass only`, gwp: GWP.CH4 },
      },
    },
    n2o: {
      formula: 'N₂O', name: 'Nitrous oxide', color: '--c-n2o', M: MW.N2O, atoms: ['N', 'O'],
      sign: ['emission, surface to atmosphere', 'uptake, atmosphere to surface'],
      bases: {
        mol: { label: 'N₂O', atom: 'N₂O', hint: 'molecule', M: MW.N2O, n: 1 },
        el: { label: 'N₂O-N', atom: 'N', hint: 'nitrogen content, 2 N per N₂O', M: AW.N, n: 2 },
        eq: { label: 'CO₂-eq', hint: `AR6 GWP₁₀₀ = ${GWP.N2O} · mass only`, gwp: GWP.N2O },
      },
    },
    h2o: {
      formula: 'H₂O', name: 'Water vapour', color: '--c-h2o', M: MW.H2O, atoms: ['O', 'H'],
      sign: ['evapotranspiration', 'condensation (dew)'],
      bases: {
        mol: { label: 'H₂O', atom: 'H₂O', hint: 'molecule', M: MW.H2O, n: 1 },
      },
    },
  };

  const PREFIX = {
    pmol: { label: 'pmol', kind: 'n', e: -12 },
    nmol: { label: 'nmol', kind: 'n', e: -9 },
    umol: { label: 'µmol', kind: 'n', e: -6 },
    mmol: { label: 'mmol', kind: 'n', e: -3 },
    mol: { label: 'mol', kind: 'n', e: 0 },
    ng: { label: 'ng', kind: 'm', e: -9 },
    ug: { label: 'µg', kind: 'm', e: -6 },
    mg: { label: 'mg', kind: 'm', e: -3 },
    g: { label: 'g', kind: 'm', e: 0 },
    kg: { label: 'kg', kind: 'm', e: 3 },
    t: { label: 't', kind: 'm', e: 6, hint: 'tonne · 10⁶ g' },
  };
  const MOLAR = ['pmol', 'nmol', 'umol', 'mmol', 'mol'];
  const MASS = ['ng', 'ug', 'mg', 'g', 'kg', 't'];

  const AREA = {
    m2: { label: 'm²', inv: 'm⁻²', m2: 1, hint: 'square metre' },
    ha: { label: 'ha', inv: 'ha⁻¹', m2: 1e4, hint: 'hectare · 10⁴ m²' },
    km2: { label: 'km²', inv: 'km⁻²', m2: 1e6, hint: '10⁶ m²' },
  };
  const TIME = {
    s: { label: 's', inv: 's⁻¹', s: 1, name: 'second', hint: '1 s' },
    min: { label: 'min', inv: 'min⁻¹', s: 60, name: 'minute', hint: '60 s' },
    '30min': { label: '30 min', inv: '(30 min)⁻¹', s: 1800, name: 'half-hour', hint: '1 800 s · EC averaging period' },
    h: { label: 'h', inv: 'h⁻¹', s: 3600, name: 'hour', hint: '3 600 s' },
    d: { label: 'd', inv: 'd⁻¹', s: 86400, name: 'day', hint: '86 400 s' },
    yr: { label: 'yr', inv: 'yr⁻¹', s: 31536000, name: 'year', hint: '365 d' },
  };

  const FIELDS = ['prefix', 'basis', 'area', 'time'];
  const FIELD_NAMES = { prefix: 'Amount', basis: 'Basis', area: 'Area', time: 'Time' };
  const KIND_NAMES = {
    time: 'Time', area: 'Area', prefix: 'Amount prefix', molar: 'Molar mass',
    stoich: 'Stoichiometry', ratio: 'Mass ratio', gwp: 'GWP₁₀₀',
  };
  const ALL_CHIPS = ['from', 'to'].flatMap(s => FIELDS.map(f => `${s}.${f}`));

  const PRESETS = [
    { src: 'ref', sp: 'co2', from: 'umol.mol.m2.s', to: 'g.mol.m2.30min', ref: 0.0792171 },
    { src: 'ref', sp: 'co2', from: 'umol.mol.m2.s', to: 'g.el.m2.30min', ref: 0.02161926 },
    { src: 'ref', sp: 'n2o', from: 'nmol.mol.m2.s', to: 'kg.el.ha.30min', ref: 0.00050424109632 },
    { src: 'ref', sp: 'n2o', from: 'umol.mol.m2.s', to: 'g.mol.m2.30min', ref: 0.07922304 },
    { src: 'ref', sp: 'n2o', from: 'nmol.mol.m2.s', to: 'g.mol.m2.30min', ref: 0.00007922304 },
    { src: 'ref', sp: 'ch4', from: 'umol.mol.m2.s', to: 'g.mol.m2.30min', ref: 0.0288765 },
    { src: 'ref', sp: 'ch4', from: 'nmol.mol.m2.s', to: 'kg.el.ha.30min', ref: 0.000216198 },
    { src: 'extra', sp: 'co2', from: 'umol.mol.m2.s', to: 'g.el.m2.d' },
    { src: 'extra', sp: 'co2', from: 'umol.mol.m2.s', to: 't.el.ha.yr' },
    { src: 'extra', sp: 'ch4', from: 'nmol.mol.m2.s', to: 'g.eq.m2.yr' },
    { src: 'extra', sp: 'n2o', from: 'nmol.mol.m2.s', to: 'kg.eq.ha.yr' },
    { src: 'extra', sp: 'h2o', from: 'mmol.mol.m2.s', to: 'kg.mol.m2.30min', note: '1 kg H₂O m⁻² corresponds to 1 mm water depth' },
  ];

  // ---------- State ----------
  const parseUnit = s => {
    const [prefix, basis, area, time] = String(s || '').split('.');
    return { prefix, basis, area, time };
  };
  const unitKey = u => `${u.prefix}.${u.basis}.${u.area}.${u.time}`;

  const state = {
    species: 'co2',
    from: parseUnit('umol.mol.m2.s'),
    to: parseUnit('g.el.m2.30min'),
    sig: 6,
  };

  // Only own keys are valid; values such as "constructor" from a pasted link must not pass.
  const has = (table, k) => Object.hasOwn(table, k);
  function normalize() {
    if (!has(SPECIES, state.species)) state.species = 'co2';
    const sp = SPECIES[state.species];
    for (const side of ['from', 'to']) {
      const u = state[side];
      if (!has(PREFIX, u.prefix)) u.prefix = side === 'from' ? 'umol' : 'g';
      if (!has(sp.bases, u.basis)) u.basis = 'mol';
      if (!has(AREA, u.area)) u.area = 'm2';
      if (!has(TIME, u.time)) u.time = side === 'from' ? 's' : '30min';
      if (u.basis === 'eq' && PREFIX[u.prefix].kind === 'n') u.prefix = 'g';
    }
    state.sig = Math.min(10, Math.max(3, state.sig | 0 || 6));
  }

  // ---------- Formatting ----------
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = n => String(n).replace(/[-0-9]/g, c => SUP[c]);
  const minus = s => String(s).replace(/-/g, '−');
  const thin = s => s.replace(/,/g, '\u202f');
  const nfCache = new Map();
  const nf = (sig, group) => {
    const k = `${sig}${group ? 'g' : 'p'}`;
    if (!nfCache.has(k)) nfCache.set(k, new Intl.NumberFormat('en-US', { maximumSignificantDigits: sig, useGrouping: group }));
    return nfCache.get(k);
  };
  const num = (x, sig = 8) => thin(nf(sig, true).format(x));

  // Round once (as fmtRaw does), so the displayed and the copied value always agree.
  function parts(x, sig) {
    if (!Number.isFinite(x)) return null;
    if (x === 0) return { m: '0', e: null };
    const [mm, ee] = x.toExponential(sig - 1).split('e');
    const e = +ee;
    if (e >= -3 && e < 6) return { m: minus(thin(nf(sig, true).format(Number(x.toPrecision(sig))))), e: null };
    return { m: minus(nf(sig, false).format(+mm)), e };
  }
  function fmtHTML(x, sig) {
    const p = parts(x, sig);
    if (!p) return '—';
    return p.e === null ? p.m : `${p.m}<span class="x">×</span>10<sup>${minus(p.e)}</sup>`;
  }
  function fmtText(x, sig) {
    const p = parts(x, sig);
    if (!p) return '—';
    return p.e === null ? p.m : `${p.m} × 10${sup(p.e)}`;
  }
  const fmtRaw = (x, sig) => String(Number(x.toPrecision(sig)));

  // The web fonts have no subscript or superscript digits; render them as <sub>/<sup> markup.
  const SUB_D = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9 };
  const SUP_D = { '⁻': '−', '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
  const chem = s => String(s)
    .replace(/[₀-₉]+/g, m => `<sub>${[...m].map(c => SUB_D[c]).join('')}</sub>`)
    .replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, m => `<sup>${[...m].map(c => SUP_D[c]).join('')}</sup>`);
  const ARROW = '<svg class="arr" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5h13m-4-4 4 4-4 4"/></svg>';
  const pow10Text = e => (e === 0 ? '1' : `10${sup(e)}`);

  const clean = s => String(s).trim().replace(/[\s  ']/g, '').replace(/−/g, '-');
  // One comma between digits is a decimal comma; commas as thousands separators need groups of three
  // (two or more groups, or one group followed by a decimal point). Anything else with a comma is rejected.
  const DEC = /^[-+]?\d+,\d+(e[-+]?\d+)?$/i;
  const THOU = /^[-+]?\d{1,3}(,\d{3}){2,}(\.\d*)?(e[-+]?\d+)?$|^[-+]?\d{1,3},\d{3}\.\d*(e[-+]?\d+)?$/i;
  function parseNum(s) {
    let c = clean(s);
    if (!c) return null;
    if (DEC.test(c)) c = c.replace(',', '.');
    else if (THOU.test(c)) c = c.replace(/,/g, '');
    else if (c.includes(',')) return null;
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(c)) return null;
    const v = Number(c);
    return Number.isFinite(v) ? v : null;
  }

  const unitText = (sp, u) => `${PREFIX[u.prefix].label} ${sp.bases[u.basis].label} ${AREA[u.area].inv} ${TIME[u.time].inv}`;
  const unitParts = (amt, cmp, area, time, changed = null) => [['amt', amt], ['cmp', cmp], ['area', area], ['time', time]]
    .map(([k, v]) => `<span class="u-${k}${changed === k ? ' is-changed' : ''}">${chem(v)}</span>`).join(' ');
  const unitHTML = (sp, u) => unitParts(PREFIX[u.prefix].label, sp.bases[u.basis].label, AREA[u.area].inv, TIME[u.time].inv);
  const PART = { prefix: 'amt', basis: 'cmp', area: 'area', time: 'time' };
  const KIND_PART = { time: 'time', area: 'area', prefix: 'amt', molar: 'cmp', stoich: 'cmp', ratio: 'cmp', gwp: 'cmp' };

  // ---------- Conversion engine ----------
  function pow10Of(f) {
    const k = Math.round(Math.log10(f));
    return Math.abs(f / 10 ** k - 1) < 1e-9 ? k : null;
  }

  // Each step records which unit parts cause it (fields) and the unit of the running value after it.
  function buildChain(st) {
    const sp = SPECIES[st.species];
    const A = st.from, B = st.to;
    const pA = PREFIX[A.prefix], pB = PREFIX[B.prefix];
    const bA = sp.bases[A.basis], bB = sp.bases[B.basis];
    const base = k => (k === 'n' ? 'mol' : 'g');
    const lbl = (k, b) => `${base(k)} ${sp.bases[b].label}`;
    const cur = { amt: pA.label, basis: A.basis, area: AREA[A.area].inv, time: TIME[A.time].inv };
    const curText = part => unitParts(cur.amt, sp.bases[cur.basis].label, cur.area, cur.time, part);
    const steps = [];
    let relabel = null; // a ×1 stoichiometry step is folded into whichever step follows it
    const add = (kind, f, from, to, note, { div = false, fields = [], set = {} } = {}) => {
      Object.assign(cur, set);
      if (Math.abs(f - 1) < 1e-12) return;
      if (relabel) {
        from = relabel.from;
        note = `${relabel.note} · ${note}`;
        fields = [...new Set([...relabel.fields, ...fields])];
        relabel = null;
      }
      steps.push({ kind, f, from, to, note, div, fields, unit: curText(KIND_PART[kind]) });
    };

    // 1 · time
    const tA = TIME[A.time], tB = TIME[B.time];
    if (tA !== tB) {
      const big = tA.s > tB.s ? tA : tB, small = big === tA ? tB : tA;
      const r = big.s / small.s;
      const smallTxt = small === TIME['30min'] ? `${num(r)} × 30 min` : `${num(r)} ${small.label}`;
      add('time', tB.s / tA.s, tA.inv, tB.inv, `1 ${big.name} = ${smallTxt}`,
        { div: tB.s < tA.s, fields: ['from.time', 'to.time'], set: { time: tB.inv } });
    }

    // 2 · area
    const aA = AREA[A.area], aB = AREA[B.area];
    if (aA !== aB) {
      const big = aA.m2 > aB.m2 ? aA : aB, small = big === aA ? aB : aA;
      add('area', aB.m2 / aA.m2, aA.inv, aB.inv, `1 ${big.label} = ${pow10Text(Math.round(Math.log10(big.m2 / small.m2)))} ${small.label}`,
        { fields: ['from.area', 'to.area'], set: { area: aB.inv } });
    }

    // 3 · input prefix to base unit
    add('prefix', 10 ** pA.e, `${pA.label} ${bA.label}`, lbl(pA.kind, A.basis), `1 ${pA.label} = ${pow10Text(pA.e)} ${base(pA.kind)}`,
      { fields: ['from.prefix'], set: { amt: base(pA.kind) } });

    // 4 · chemistry
    let kind = pA.kind, basis = A.basis;
    if (!(kind === pB.kind && basis === B.basis)) {
      const target = B.basis === 'eq' ? 'mol' : B.basis;

      if (kind === 'm') {
        if (basis === 'eq') {
          add('gwp', 1 / bA.gwp, lbl('m', 'eq'), lbl('m', 'mol'), `GWP₁₀₀ of ${sp.formula} = ${bA.gwp} (IPCC AR6)`,
            { div: true, fields: ['from.basis'], set: { basis: 'mol' } });
          basis = 'mol';
        }
        if (pB.kind === 'm') {
          if (basis !== target) {
            const X = sp.bases[basis], Y = sp.bases[target];
            const term = b => (b.n > 1 ? `(${b.n} × ${num(b.M)})` : num(b.M));
            add('ratio', (Y.n * Y.M) / (X.n * X.M), lbl('m', basis), lbl('m', target), `${term(Y)} / ${term(X)} g g⁻¹`,
              { fields: ['from.basis', 'to.basis'], set: { basis: target } });
            basis = target;
          }
        } else {
          const X = sp.bases[basis];
          add('molar', 1 / X.M, lbl('m', basis), lbl('n', basis), `M(${X.atom}) = ${num(X.M)} g mol⁻¹`,
            { div: true, fields: ['from.prefix', 'to.prefix', 'from.basis'], set: { amt: 'mol' } });
          kind = 'n';
        }
      }

      if (kind === 'n') {
        const X = sp.bases[basis], Y = sp.bases[target];
        if (basis !== target) {
          const elem = basis === 'mol' ? Y : X;
          const holds = `1 mol ${sp.formula} contains ${elem.n} mol ${elem.atom}`;
          if (X.n !== Y.n) {
            add('stoich', Y.n / X.n, lbl('n', basis), lbl('n', target), holds,
              { fields: ['from.basis', 'to.basis'], set: { basis: target } });
          } else {
            relabel = { from: lbl('n', basis), note: holds, fields: ['from.basis', 'to.basis'] };
            cur.basis = target;
          }
          basis = target;
        }
        if (pB.kind === 'm') {
          add('molar', Y.M, lbl('n', target), lbl('m', target), `M(${Y.atom}) = ${num(Y.M)} g mol⁻¹`,
            { fields: ['from.prefix', 'to.prefix', 'to.basis'], set: { amt: 'g', basis: target } });
          kind = 'm';
        }
      }

      if (B.basis === 'eq') {
        add('gwp', bB.gwp, lbl('m', 'mol'), lbl('m', 'eq'), `GWP₁₀₀ of ${sp.formula} = ${bB.gwp} (IPCC AR6)`,
          { fields: ['to.basis'], set: { basis: 'eq' } });
      }
    }

    // 5 · base unit to output prefix
    add('prefix', 10 ** -pB.e, lbl(pB.kind, B.basis), `${pB.label} ${bB.label}`, `1 ${pB.label} = ${pow10Text(pB.e)} ${base(pB.kind)}`,
      { fields: ['to.prefix'], set: { amt: pB.label } });

    // A pending ×1 relabel (e.g. mol CO₂ → mol C) with no following step is shown as its own step.
    if (relabel) {
      steps.push({ kind: 'stoich', f: 1, from: relabel.from, to: `${pB.label} ${bB.label}`, note: relabel.note,
        div: false, fields: relabel.fields, unit: curText('cmp') });
    }
    return steps;
  }
  const chainFactor = steps => steps.reduce((p, s) => p * s.f, 1);

  function op(s) {
    if (s.f === 1) return { html: '<i>×</i>1', text: '× 1' };
    const k = pow10Of(s.f);
    if (k !== null) {
      if (k >= 1 && k <= 3) return { html: `<i>×</i>${num(10 ** k)}`, text: `× ${num(10 ** k)}` };
      if (k <= -1 && k >= -2) return { html: `<i>÷</i>${10 ** -k}`, text: `÷ ${10 ** -k}` };
      return { html: `<i>×</i>10<sup>${minus(k)}</sup>`, text: `× 10${sup(k)}` };
    }
    if (s.div) { const v = num(1 / s.f); return { html: `<i>÷</i>${v}`, text: `÷ ${v}` }; }
    const v = num(s.f, 7);
    return { html: `<i>×</i>${v}`, text: `× ${v}` };
  }

  // ---------- DOM ----------
  const el = {
    converter: $('#converter'),
    species: $('#species'),
    ind: $('.species-ind'),
    paneFrom: $('.pane-from'),
    input: $('#valueIn'),
    output: $('#valueOut'),
    delta: $('#delta'),
    unitFrom: $('#unitFrom'),
    unitTo: $('#unitTo'),
    hint: $('#inputHint'),
    factor: $('#factor'),
    sigVal: $('#sigVal'),
    sigUp: $('#sigUp'),
    sigDown: $('#sigDown'),
    chain: $('#chain'),
    equation: $('#equation'),
    presetsRef: $('#presetsRef'),
    presetsExtra: $('#presetsExtra'),
    batchIn: $('#batchIn'),
    batchOut: $('#batchOut'),
    batchUnits: $('#batchUnits'),
    batchCount: $('#batchCount'),
    keepMissing: $('#keepMissing'),
    pop: $('#popover'),
    scrim: $('#popScrim'),
    toast: $('#toast'),
    resultLive: $('#resultLive'),
    statusLive: $('#statusLive'),
    swap: $('#swapBtn'),
  };

  const CARET = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.8 5 6.8l3-3"/></svg>';
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7"/></svg>';

  let steps = [];
  let factor = 1;
  let prevFactor = null;
  let result = NaN;
  let lastValid = NaN;

  const restart = (node, cls) => { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };

  // ---------- Species switcher ----------
  el.species.insertAdjacentHTML('beforeend', Object.entries(SPECIES).map(([k, s]) => `
    <button type="button" class="sp-btn" role="radio" data-species="${k}" aria-checked="false" style="--sp: var(${s.color})">
      <span class="sp-dot"></span><span class="sp-f">${chem(s.formula)}</span><span class="sp-n">${s.name}</span>
    </button>`).join(''));

  function renderSpecies() {
    for (const b of $$('.sp-btn', el.species)) {
      const on = b.dataset.species === state.species;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    moveIndicator();
  }
  function moveIndicator() {
    const b = $(`.sp-btn[data-species="${state.species}"]`, el.species);
    if (!b) return;
    el.ind.style.width = `${b.offsetWidth}px`;
    el.ind.style.transform = `translateX(${b.offsetLeft}px)`;
  }

  el.species.addEventListener('click', e => {
    const b = e.target.closest('.sp-btn');
    if (!b || b.dataset.species === state.species) return;
    setSpecies(b.dataset.species);
  });
  el.species.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const keys = Object.keys(SPECIES);
    const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
    const next = keys[(keys.indexOf(state.species) + dir + keys.length) % keys.length];
    setSpecies(next);
    $(`.sp-btn[data-species="${next}"]`, el.species).focus();
  });

  function setSpecies(k) {
    const sp = SPECIES[k], prev = SPECIES[state.species];
    const sides = ['from', 'to'].filter(s => !has(sp.bases, state[s].basis));
    const labels = [...new Set(sides.map(s => prev.bases[state[s].basis].label))];
    state.species = k;
    update({ changed: ['from.basis', 'to.basis'], coerced: sides.map(s => `${s}.basis`) });
    if (labels.length) toast(`${labels.join(' and ')} basis is not defined for ${sp.formula}; basis set to ${sp.formula}`);
  }

  // ---------- Unit chips ----------
  function renderUnits(changed = [], coerced = []) {
    const sp = SPECIES[state.species];
    let k = 0;
    for (const side of ['from', 'to']) {
      const u = state[side];
      const labels = {
        prefix: PREFIX[u.prefix].label,
        basis: sp.bases[u.basis].label,
        area: AREA[u.area].inv,
        time: TIME[u.time].inv,
      };
      (side === 'from' ? el.unitFrom : el.unitTo).innerHTML = FIELDS.map(f => {
        const key = `${side}.${f}`;
        const single = f === 'basis' && Object.keys(sp.bases).length === 1;
        const cls = ['chip', single && 'is-static', changed.includes(key) && 'changed', coerced.includes(key) && 'coerced'].filter(Boolean).join(' ');
        const attrs = single ? 'aria-disabled="true"' : 'aria-haspopup="listbox" aria-expanded="false" aria-controls="popover"';
        return `<button type="button" class="${cls}" data-side="${side}" data-field="${f}" ${attrs} title="${FIELD_NAMES[f]}" style="--k:${k++}" aria-label="${side === 'from' ? 'From' : 'To'} unit, ${FIELD_NAMES[f].toLowerCase()}: ${labels[f]}"><span class="chip-label">${chem(labels[f])}</span>${single ? '' : CARET}</button>`;
      }).join('');
    }
  }

  function optionsFor(side, field) {
    const sp = SPECIES[state.species];
    if (field === 'prefix') {
      const eq = state[side].basis === 'eq';
      return [
        { group: 'Molar amount' },
        ...MOLAR.map(k => ({ key: k, label: PREFIX[k].label, hint: eq ? 'not with CO₂-eq' : `${pow10Text(PREFIX[k].e)} mol`, disabled: eq })),
        { group: 'Mass' },
        ...MASS.map(k => ({ key: k, label: PREFIX[k].label, hint: PREFIX[k].hint || `${pow10Text(PREFIX[k].e)} g` })),
      ];
    }
    if (field === 'basis') return Object.entries(sp.bases).map(([k, b]) => ({ key: k, label: b.label, hint: b.hint }));
    if (field === 'area') return Object.entries(AREA).map(([k, a]) => ({ key: k, label: a.inv, hint: a.hint }));
    return Object.entries(TIME).map(([k, t]) => ({ key: k, label: t.inv, hint: t.hint }));
  }

  // ---------- Popover ----------
  const narrow = matchMedia('(max-width: 640px)');
  let pop = null;
  function openPop(chip) {
    closePop(false);
    // On phones the menu is a bottom sheet; move the chip to the top so it stays visible above it.
    if (narrow.matches) chip.scrollIntoView({ block: 'start', behavior: 'instant' });
    const { side, field } = chip.dataset;
    const current = state[side][field];
    let i = 0;
    const title = `${side === 'from' ? 'From' : 'To'} · ${FIELD_NAMES[field]}`;
    let html = `<div class="pop-title" aria-hidden="true">${title}</div>`, inGroup = false, g = 0;
    for (const o of optionsFor(side, field)) {
      if (o.group) {
        html += `${inGroup ? '</div>' : ''}<div role="group" aria-labelledby="popg${g}"><div class="pop-group" id="popg${g++}">${o.group}</div>`;
        inGroup = true;
        continue;
      }
      html += `<button type="button" class="opt" role="option" data-key="${o.key}" aria-selected="${o.key === current}"${o.disabled ? ' aria-disabled="true"' : ''} tabindex="-1" style="--i:${i++}"><span class="opt-label">${chem(o.label)}</span><span class="opt-hint">${chem(o.hint || '')}</span></button>`;
    }
    el.pop.innerHTML = html + (inGroup ? '</div>' : '');
    el.pop.setAttribute('aria-label', title);
    el.pop.dataset.part = PART[field];
    el.pop.hidden = false;
    el.pop.classList.remove('open', 'above');
    pop = { chip, side, field };
    chip.setAttribute('aria-expanded', 'true');
    placePop();
    requestAnimationFrame(() => el.pop.classList.add('open'));
    const sel = $('.opt[aria-selected="true"]', el.pop) || $('.opt', el.pop);
    sel.focus({ preventScroll: true });
    sel.scrollIntoView({ block: 'nearest' });
  }
  function placePop() {
    el.pop.style.maxHeight = '';
    if (narrow.matches) {
      el.pop.classList.add('sheet');
      el.pop.style.left = el.pop.style.top = '';
      el.scrim.hidden = false;
      return;
    }
    el.pop.classList.remove('sheet');
    el.scrim.hidden = true;
    const r = pop.chip.getBoundingClientRect();
    const w = el.pop.offsetWidth;
    let h = el.pop.offsetHeight;
    const below = innerHeight - r.bottom - 20, above = r.top - 20;
    const up = h > below && above > below;
    const room = up ? above : below;
    if (h > room) { el.pop.style.maxHeight = `${Math.max(160, room)}px`; h = el.pop.offsetHeight; }
    el.pop.classList.toggle('above', up);
    el.pop.style.left = `${Math.min(Math.max(12, r.left), innerWidth - w - 12)}px`;
    el.pop.style.top = `${up ? r.top - h - 8 : r.bottom + 8}px`;
  }
  function closePop(refocus = true) {
    if (!pop) return;
    const { chip } = pop;
    chip.setAttribute('aria-expanded', 'false');
    el.pop.classList.remove('open');
    el.pop.hidden = true;
    el.scrim.hidden = true;
    pop = null;
    if (refocus) chip.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const chip = e.target.closest('.chip:not(.is-static)');
    if (chip) {
      if (pop && pop.chip === chip) closePop();
      else openPop(chip);
      return;
    }
    const opt = e.target.closest('.opt');
    if (opt && pop) {
      if (opt.getAttribute('aria-disabled') === 'true') { toast('Molar units cannot be combined with CO₂-eq, which is defined for mass'); return; }
      choose(pop.side, pop.field, opt.dataset.key);
      return;
    }
    if (pop && !el.pop.contains(e.target)) closePop(false);
  });
  // ArrowDown or ArrowUp on a chip opens its menu, as in a native select.
  document.addEventListener('keydown', e => {
    const chip = e.target.closest?.('.chip:not(.is-static)');
    if (!chip || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    e.preventDefault();
    openPop(chip);
  });
  el.pop.addEventListener('keydown', e => {
    const opts = $$('.opt', el.pop);
    const i = opts.indexOf(document.activeElement);
    const go = n => { e.preventDefault(); opts[(n + opts.length) % opts.length].focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(opts.length - 1);
    else if (e.key === 'Escape') { e.preventDefault(); closePop(); }
    else if (e.key === 'Tab') closePop();
  });
  let lastW = innerWidth;
  addEventListener('resize', () => {
    moveIndicator();
    if (!pop) return;
    // On phones the on-screen keyboard changes only the height; keep the menu open then.
    if (innerWidth !== lastW) closePop(false);
    else placePop();
    lastW = innerWidth;
  });
  addEventListener('scroll', () => {
    if (!pop || narrow.matches) return;
    const r = pop.chip.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) closePop(false);
    else placePop();
  }, { passive: true });

  function choose(s, f, key) {
    const u = state[s];
    const coerced = [];
    u[f] = key;
    if (f === 'basis' && key === 'eq' && PREFIX[u.prefix].kind === 'n') {
      u.prefix = 'g';
      coerced.push(`${s}.prefix`);
      toast('CO₂-eq is defined for mass units only; amount unit set to g');
    }
    closePop(false);
    update({ changed: [`${s}.${f}`, ...coerced], coerced });
    $(`.chip[data-side="${s}"][data-field="${f}"]`)?.focus({ preventScroll: true });
  }

  // ---------- Linked highlight: unit part ↔ sequence steps ----------
  let linkTarget = null;
  function applyLink(t) {
    let fields = null, fromNode = false;
    if (t?.classList.contains('chip')) fields = [`${t.dataset.side}.${t.dataset.field}`];
    else if (t?.dataset.fields) { fields = t.dataset.fields.split(' '); fromNode = true; }
    const on = !!fields;
    el.chain.classList.toggle('has-focus', on);
    el.equation.classList.toggle('has-focus', on);
    for (const n of $$('#chain [data-fields], #equation [data-fields]')) {
      n.classList.toggle('is-linked', on && n.dataset.fields.split(' ').some(f => fields.includes(f)));
    }
    for (const c of $$('.chip[data-field]')) {
      c.classList.toggle('is-linked', on && fromNode && fields.includes(`${c.dataset.side}.${c.dataset.field}`));
    }
  }
  const linkable = n => n?.closest?.('.chip[data-field]:not(.is-static), #chain .node[data-fields]') || null;
  document.addEventListener('pointerover', e => {
    const t = linkable(e.target);
    if (t !== linkTarget) { linkTarget = t; applyLink(t); }
  });
  document.addEventListener('focusin', e => {
    const t = linkable(e.target);
    if (t !== linkTarget) { linkTarget = t; applyLink(t); }
  });

  // ---------- Result ----------
  let shownParts = null;
  function sizeClass(node, len) {
    node.classList.toggle('long', len > 9 && len <= 13);
    node.classList.toggle('xlong', len > 13);
  }
  // Only the part that changed (mantissa or exponent) animates; typing paints instantly.
  function paintOut(v, animate) {
    const p = parts(v, state.sig);
    if (!p) { el.output.textContent = '—'; shownParts = null; return; }
    const prev = animate && !reduceMotion.matches ? shownParts : null;
    const tm = prev && prev.m !== p.m ? ' tick' : '';
    const te = prev && prev.e !== p.e ? ' tick' : '';
    el.output.innerHTML = p.e === null
      ? `<span class="m${tm}">${p.m}</span>`
      : `<span class="m${tm}">${p.m}</span><span class="x">×</span>10<sup class="e${te}">${minus(p.e)}</sup>`;
    sizeClass(el.output, fmtText(v, state.sig).length);
    shownParts = p;
  }

  function showDelta(r) {
    if (reduceMotion.matches || !Number.isFinite(r) || r === 1) return;
    el.delta.innerHTML = chem(op({ f: r, div: r < 1 }).text);
    el.delta.animate([
      { opacity: 0, transform: 'translateY(4px)' },
      { opacity: 1, transform: 'none', offset: .15 },
      { opacity: 1, transform: 'none', offset: .75 },
      { opacity: 0, transform: 'translateY(-4px)' },
    ], { duration: 1600, easing: EASE_OUT });
  }

  let errTimer = 0;
  function renderHint(raw, v) {
    const sp = SPECIES[state.species];
    const t = clean(raw);
    let mode = 'empty', text = '', down = false;
    if (t && v === null) {
      mode = 'error';
      text = 'Not a number. Examples: −12.8, 3.4e-3, 1.5';
    } else if (v === -9999) {
      mode = 'note';
      text = '−9999 is a common missing-value code; here it is converted as a number.';
    } else if (DEC.test(t)) {
      mode = 'note';
      text = `Read as ${fmtText(v, 12)}, with the comma as decimal separator.${/^[-+]?\d{1,3},\d{3}(e[-+]?\d+)?$/i.test(t) ? ' For thousands, omit the comma.' : ''}`;
    } else if (v) {
      mode = 'sign';
      down = v < 0;
      text = `${v > 0 ? 'Positive' : 'Negative'} sign: ${sp.sign[v > 0 ? 0 : 1]}`;
    }
    const apply = () => {
      el.hint.className = `hint ${mode}${down ? ' down' : ''}`;
      $('.txt', el.hint).textContent = text;
      el.input.setAttribute('aria-invalid', String(mode === 'error'));
      el.input.classList.toggle('invalid', mode === 'error');
      el.paneFrom.classList.toggle('has-error', mode === 'error');
      el.output.classList.toggle('stale', mode === 'error' && Number.isFinite(lastValid));
    };
    clearTimeout(errTimer);
    // Partly typed numbers such as "1e-" are briefly invalid; report the error only once typing pauses.
    if (mode === 'error') errTimer = setTimeout(apply, 600);
    else apply();
  }

  let liveTimer = 0;
  function announce() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      el.resultLive.textContent = Number.isFinite(result)
        ? `Result ${fmtText(result, state.sig).replace(/\u202f/g, '')} ${unitText(SPECIES[state.species], state.to)}`
        : '';
    }, 500);
  }

  // ---------- Conversion sequence ----------
  let chainSig = '';
  let firstChain = true;
  let chainVisible = true;
  let pulseTimer = 0;

  function pulseChain() {
    if (!chainVisible || reduceMotion.matches) return;
    restart(el.chain, 'pulse');
  }

  function renderChain(v, animate) {
    const sp = SPECIES[state.species];
    const sig = `${state.species}|${unitKey(state.from)}|${unitKey(state.to)}`;
    if (sig !== chainSig) {
      chainSig = sig;
      const before = new Map($$('.node[data-key]', el.chain).map(n => {
        const r = n.getBoundingClientRect();
        return [n.dataset.key, { x: r.left, y: r.top, sig: n.dataset.sig }];
      }));
      let i = 0;
      const link = () => `<span class="link" aria-hidden="true" style="--i:${i}"><span></span></span>`;
      const fromTxt = unitText(sp, state.from), toTxt = unitText(sp, state.to);
      let html = `<div class="seg"><div class="node node-start" data-key="start" data-sig="${fromTxt}" style="--i:${i++}">
          <div class="node-top"><span class="node-kind">Input</span></div>
          <div class="node-val" data-run></div>
          <div class="node-unit">${unitHTML(sp, state.from)}</div>
        </div></div>`;
      if (!steps.length) {
        html += `<div class="seg">${link()}<div class="node node-empty" style="--i:${i++}">Input and output units are identical (factor 1).</div></div>`;
      }
      const seen = {};
      steps.forEach((s, n) => {
        const o = op(s);
        seen[s.kind] = (seen[s.kind] || 0) + 1;
        html += `<div class="seg">${link()}<div class="node" data-part="${KIND_PART[s.kind]}" data-key="${s.kind}:${seen[s.kind]}" data-sig="${o.text}|${s.from}|${s.to}" data-fields="${s.fields.join(' ')}" style="--i:${i++}">
          <div class="node-top"><span class="node-kind">${chem(KIND_NAMES[s.kind])}</span><span class="node-idx">${n + 1}/${steps.length}</span></div>
          <div class="node-op">${o.html}</div>
          <div class="node-conv">${chem(s.from)} ${ARROW} ${chem(s.to)}</div>
          <div class="node-note">${chem(s.note)}</div>
          <div class="node-run"><span data-run></span><span class="node-unit">${s.unit}</span></div>
        </div></div>`;
      });
      html += `<div class="seg">${link()}<div class="node node-end" data-key="end" data-sig="${toTxt}" style="--i:${i++}">
          <div class="node-top"><span class="node-kind">Result</span></div>
          <div class="node-val" data-run></div>
          <div class="node-unit">${unitHTML(sp, state.to)}</div>
        </div></div>`;
      el.chain.innerHTML = html;
      el.chain.classList.toggle('intro', firstChain && !reduceMotion.matches);
      el.chain.classList.remove('pulse');

      // FLIP: steps that stay slide to their new place, changed steps get a ring, new steps fade in.
      if (!firstChain && animate && !reduceMotion.matches) {
        for (const n of $$('.node[data-key]', el.chain)) {
          const o = before.get(n.dataset.key);
          if (!o) { n.classList.add('step-new'); continue; }
          const r = n.getBoundingClientRect();
          const dx = o.x - r.left, dy = o.y - r.top;
          if (dx || dy) n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 320, easing: EASE_IO });
          if (o.sig !== n.dataset.sig) n.classList.add('step-changed');
        }
        clearTimeout(pulseTimer);
        pulseTimer = setTimeout(pulseChain, 360);
      }
      firstChain = false;
    }

    const runs = $$('[data-run]', el.chain);
    let cum = 1;
    runs.forEach((r, n) => {
      if (n > 0 && n <= steps.length) cum *= steps[n - 1].f;
      if (n === runs.length - 1) cum = factor;
      r.innerHTML = v === null ? '—' : fmtHTML(v * cum, state.sig);
    });

    const vTxt = v === null ? 'x' : fmtHTML(v, state.sig);
    const opsTxt = steps.map(s => `<span class="x" data-part="${KIND_PART[s.kind]}" data-fields="${s.fields.join(' ')}">${chem(op(s).text)}</span>`).join(' ');
    el.equation.innerHTML = `${vTxt} <span class="u">${unitHTML(sp, state.from)}</span> ${opsTxt || '<span class="x">× 1</span>'} = <b>${v === null ? `x × ${fmtHTML(factor, state.sig)}` : fmtHTML(v * factor, state.sig)}</b> <span class="u">${unitHTML(sp, state.to)}</span>`;
    if (linkTarget) applyLink(linkTarget.isConnected ? linkTarget : null);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { chainVisible = en.isIntersecting; }, { threshold: .25 }).observe(el.chain);
  }

  // ---------- Presets ----------
  const presetData = PRESETS.map(p => {
    const st = { species: p.sp, from: parseUnit(p.from), to: parseUnit(p.to) };
    const f = chainFactor(buildChain(st));
    return { ...p, st, f, ok: p.ref ? Math.abs(f / p.ref - 1) < 5e-5 : null };
  });
  const presetHTML = (p, i) => {
    const sp = SPECIES[p.sp];
    const check = p.ref
      ? (p.ok
        ? `<span class="ok" role="img" aria-label="Matches published factor ${p.ref}" title="Matches published factor ${p.ref}">${CHECK}</span>`
        : `<span class="ok bad">differs: published ${fmtHTML(p.ref, 6)}</span>`)
      : '';
    return `<button type="button" class="preset" data-i="${i}" aria-pressed="false" style="--sp: var(${sp.color})">
      <span class="preset-top"><span class="tag"><span class="sp-dot"></span><span>${chem(sp.formula)}</span></span></span>
      <span class="preset-from">${unitHTML(sp, p.st.from)}</span>
      <span class="preset-to">${ARROW}${unitHTML(sp, p.st.to)}</span>
      ${p.note ? `<span class="preset-note">${chem(p.note)}</span>` : ''}
      <span class="preset-foot"><span>× ${fmtHTML(p.f, 6)}</span>${check}</span>
    </button>`;
  };
  el.presetsRef.innerHTML = presetData.map((p, i) => (p.src === 'ref' ? presetHTML(p, i) : '')).join('');
  el.presetsExtra.innerHTML = presetData.map((p, i) => (p.src === 'extra' ? presetHTML(p, i) : '')).join('');

  function applyPreset(p) {
    state.species = p.sp;
    state.from = { ...p.st.from };
    state.to = { ...p.st.to };
    update({ changed: ALL_CHIPS });
    if (!reduceMotion.matches) restart(el.converter, 'landed');
  }
  // Scroll to the converter first, then apply, so the change is visible.
  $('#presets').addEventListener('click', e => {
    const b = e.target.closest('.preset');
    if (!b) return;
    const p = presetData[+b.dataset.i];
    const r = el.converter.getBoundingClientRect();
    if (r.top >= 64 && r.bottom <= innerHeight) { applyPreset(p); return; }
    if (reduceMotion.matches) {
      el.converter.scrollIntoView({ behavior: 'auto', block: 'start' });
      applyPreset(p);
      return;
    }
    el.converter.scrollIntoView({ behavior: 'smooth', block: 'start' });
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      removeEventListener('scrollend', go);
      applyPreset(p);
    };
    addEventListener('scrollend', go);
    setTimeout(go, 800);
  });
  function markPresets() {
    const a = unitKey(state.from), b = unitKey(state.to);
    $$('.preset').forEach(n => {
      const p = presetData[+n.dataset.i];
      n.setAttribute('aria-pressed', String(p.sp === state.species && p.from === a && p.to === b));
    });
  }

  // ---------- Batch ----------
  // A first row with text is a header. Columns named like time, date or stamp, and columns of 8+ digit
  // integers (e.g. TIMESTAMP_START 202401010000), are copied unchanged.
  function runBatch() {
    const sp = SPECIES[state.species];
    el.batchUnits.innerHTML = `${unitHTML(sp, state.from)} ${ARROW} ${unitHTML(sp, state.to)} · <b>× ${fmtHTML(factor, state.sig)}</b> <span class="muted">· ${state.sig} significant digits</span>`;
    const keep = el.keepMissing.checked;
    const rows = el.batchIn.value.split(/\r?\n/).map(line => line.split('\t'));
    const header = rows[0]?.some(c => c.trim() && parseNum(c) === null) ? rows[0] : null;
    const body = header ? rows.slice(1) : rows;
    const cols = Math.max(0, ...rows.map(r => r.length));
    const skip = new Set();
    for (let j = 0; j < cols; j++) {
      const cells = body.map(r => clean(r[j] ?? '')).filter(Boolean);
      if (/time|date|stamp/i.test(header?.[j] || '') || (cells.length && cells.every(c => /^\d{8,}$/.test(c)))) skip.add(j);
    }
    let n = 0, dec = 0;
    el.batchOut.value = rows.map((r, i) => r.map((cell, j) => {
      if ((header && i === 0) || skip.has(j)) return cell;
      const v = parseNum(cell);
      if (v === null) return cell;
      if (keep && v === -9999) return cell.trim();
      if (DEC.test(clean(cell))) dec++;
      n++;
      return fmtRaw(v * factor, state.sig);
    }).join('\t')).join('\n');
    const info = [];
    if (n) info.push(`${n} value${n === 1 ? '' : 's'}`);
    if (skip.size) info.push(`${skip.size} time column${skip.size === 1 ? '' : 's'} kept`);
    if (dec) info.push(`${dec} read with decimal comma`);
    el.batchCount.textContent = info.length ? `· ${info.join(' · ')}` : '';
  }
  let batchTimer = 0;
  el.batchIn.addEventListener('input', () => { clearTimeout(batchTimer); batchTimer = setTimeout(runBatch, 150); });
  el.keepMissing.addEventListener('change', runBatch);
  $('#batchClear').addEventListener('click', () => { el.batchIn.value = ''; runBatch(); el.batchIn.focus(); });
  $('#batchCopy').addEventListener('click', e => copy(el.batchOut.value, {
    btn: e.currentTarget, source: el.batchOut.parentNode, msg: 'Batch output copied',
  }));

  // ---------- Constants ----------
  const atomRows = Object.entries(AW).map(([k, v]) => `<dt>${k}</dt><dd>${num(v)}</dd>`).join('');
  const molRows = [['CO₂', MW.CO2], ['CH₄', MW.CH4], ['N₂O', MW.N2O], ['H₂O', MW.H2O]]
    .map(([k, v]) => `<dt>${k}</dt><dd>${num(v)}</dd>`).join('');
  $('#consts').innerHTML = chem(`
    <div class="const"><h3>Atomic weights<span class="u">g mol⁻¹</span></h3><dl>${atomRows}</dl>
      <p>Conventional standard atomic weights (IUPAC 2007). The SwissFluxNet sequences use the same values, in some cases rounded.</p></div>
    <div class="const"><h3>Molar masses<span class="u">g mol⁻¹</span></h3><dl>${molRows}</dl>
      <p>Computed from the atomic weights above. Element-based units count C or N atoms only: 1 C per CO₂ and CH₄, 2 N per N₂O.</p></div>
    <div class="const"><h3>GWP₁₀₀<span class="u">g CO₂-eq g⁻¹</span></h3><dl><dt>CO₂</dt><dd>1</dd><dt>CH₄</dt><dd>${GWP.CH4}</dd><dt>N₂O</dt><dd>${GWP.N2O}</dd></dl>
      <p>IPCC AR6 WG1, Table 7.15. The CH₄ value applies to non-fossil methane; the value for fossil methane is 29.8.</p></div>
    <div class="const"><h3>Time, area and sign</h3><dl><dt>30 min</dt><dd>1 800 s</dd><dt>d</dt><dd>86 400 s</dd><dt>yr</dt><dd>365 d</dd><dt>ha</dt><dd>10⁴ m²</dd></dl>
      <p>Positive fluxes are directed from the surface to the atmosphere (emission), negative fluxes towards the surface (uptake).</p></div>`);

  // ---------- 3D model ----------
  const molView = window.FluxMolecule ? window.FluxMolecule.mount($('#molCanvas')) : null;
  let molShown = '';
  function renderMolecule(animate) {
    if (molShown === state.species) return;
    molShown = state.species;
    const sp = SPECIES[state.species];
    molView?.set(state.species);
    const els = window.FluxMolecule?.elements || {};
    $('#molFormula').innerHTML = chem(sp.formula);
    $('#molName').textContent = sp.name;
    $('#molMass').innerHTML = chem(`${num(sp.M, 7)} g mol⁻¹`);
    $('#molAtoms').innerHTML = sp.atoms.map(a => `<span><i data-el="${a}" style="--c:${els[a]?.key || '#888'}"></i>${a}</span>`).join('');
    $('#molCanvas').setAttribute('aria-label', `3D model of ${sp.name.toLowerCase()} (${sp.formula})`);
    if (animate && !reduceMotion.matches) for (const n of $$('#molecule figcaption > *')) restart(n, 'tick');
  }

  // ---------- Update cycle ----------
  function compute({ animate = true, delta = true } = {}) {
    steps = buildChain(state);
    const old = prevFactor;
    factor = chainFactor(steps);
    prevFactor = factor;

    const raw = el.input.value;
    const v = parseNum(raw);
    if (v !== null) lastValid = v;
    sizeClass(el.input, raw.length);
    result = v === null ? NaN : v * factor;

    // While the input is invalid, keep the last valid result visible but dimmed.
    const shownV = v !== null ? v : (raw.trim() ? lastValid : NaN);
    paintOut(shownV * factor, animate);

    el.factor.innerHTML = `<span class="x">×</span>${fmtHTML(factor, state.sig)}`;
    renderHint(raw, v);
    renderChain(v, animate);
    announce();

    if (animate && old !== null && old !== factor && !reduceMotion.matches) {
      if (delta) showDelta(factor / old);
      restart(el.factor, 'recalc');
    }
  }

  function update({ changed = [], coerced = [], animate = true, delta = true } = {}) {
    normalize();
    document.documentElement.dataset.species = state.species;
    renderSpecies();
    renderMolecule(animate);
    renderUnits(animate ? changed : [], animate ? coerced : []);
    compute({ animate, delta });
    markPresets();
    runBatch();
    el.sigVal.textContent = state.sig;
    el.sigDown.disabled = state.sig <= 3;
    el.sigUp.disabled = state.sig >= 10;
    writeHash();
  }

  el.input.addEventListener('input', () => {
    compute({ animate: false });
    writeHash();
    clearTimeout(pulseTimer);
    pulseTimer = setTimeout(pulseChain, 450);
  });
  el.input.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const v = parseNum(el.input.value);
    if (v === null) return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    el.input.value = String(Number((v + (e.key === 'ArrowUp' ? step : -step)).toPrecision(12)));
    compute();
    writeHash();
  });
  $('#signBtn').addEventListener('click', () => {
    let s = el.input.value.trim();
    if (/^[-−]/.test(s)) s = s.slice(1);
    else if (s) s = `-${s.replace(/^\+/, '')}`;
    el.input.value = s;
    compute();
    writeHash();
  });

  // Swap: the two unit sets and values trade places.
  let turns = 0;
  el.swap.addEventListener('click', () => {
    const moving = [el.unitFrom, el.unitTo, el.input, el.output];
    const r0 = moving.map(n => n.getBoundingClientRect());
    [state.from, state.to] = [state.to, state.from];
    if (Number.isFinite(result)) el.input.value = fmtRaw(result, Math.max(state.sig, 8));
    shownParts = null;
    update({ delta: false });
    el.swap.style.transform = `rotate(${++turns * 180}deg)`;
    if (reduceMotion.matches) return;
    [[el.unitFrom, r0[1]], [el.unitTo, r0[0]], [el.input, r0[3]], [el.output, r0[2]]].forEach(([n, from]) => {
      const now = n.getBoundingClientRect();
      n.animate([
        { transform: `translate(${from.left - now.left}px, ${from.top - now.top}px)`, opacity: .5 },
        { transform: 'none', opacity: 1 },
      ], { duration: 380, easing: EASE_IO });
    });
  });

  el.sigUp.addEventListener('click', () => { state.sig++; update(); });
  el.sigDown.addEventListener('click', () => { state.sig--; update(); });

  $('#copyResult').addEventListener('click', e => {
    if (!Number.isFinite(result)) { toast('No valid input value to copy'); return; }
    copy(fmtRaw(result, state.sig), { btn: e.currentTarget, source: el.output, msg: `Copied ${fmtText(result, state.sig)}` });
  });
  $('#copyFactor').addEventListener('click', e => copy(fmtRaw(factor, state.sig), {
    btn: e.currentTarget, source: el.factor, msg: `Copied factor ${fmtText(factor, state.sig)}`,
  }));
  $('#copyLink').addEventListener('click', e => {
    writeHash(true);
    copy(location.href, { btn: e.currentTarget, msg: 'Link copied' });
  });

  // ---------- Hash state ----------
  let hashTimer = 0;
  function writeHash(now = false) {
    clearTimeout(hashTimer);
    const go = () => {
      const p = new URLSearchParams({
        gas: state.species, from: unitKey(state.from), to: unitKey(state.to), v: el.input.value.trim(),
      });
      if (state.sig !== 6) p.set('sig', state.sig);
      try { history.replaceState(null, '', `#${p}`); } catch { /* file:// in some browsers */ }
    };
    if (now) go(); else hashTimer = setTimeout(go, 250);
  }
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.species = 'co2';
    state.from = parseUnit('umol.mol.m2.s');
    state.to = parseUnit('g.el.m2.30min');
    state.sig = 6;
    if (p.has('gas')) state.species = p.get('gas');
    if (p.has('from')) state.from = parseUnit(p.get('from'));
    if (p.has('to')) state.to = parseUnit(p.get('to'));
    if (p.has('v')) el.input.value = p.get('v');
    if (p.has('sig')) state.sig = +p.get('sig');
  }

  // ---------- Feedback ----------
  let toastTimer = 0;
  function toast(msg) {
    el.toast.textContent = msg;
    el.statusLive.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 4000);
  }
  async function copy(text, { btn, source, msg }) {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.append(ta);
      ta.focus();
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      btn?.focus({ preventScroll: true });
    }
    if (!ok) { toast('Copy failed; select the value and press Ctrl+C'); return; }
    el.statusLive.textContent = msg;
    if (btn) {
      const label = $('.btn-label', btn);
      label.dataset.base ??= label.textContent;
      label.textContent = 'Copied';
      btn.classList.add('copied');
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.classList.remove('copied'); label.textContent = label.dataset.base; }, 1200);
    }
    if (source && !reduceMotion.matches) restart(source, 'flash');
  }

  // ---------- Theme ----------
  const root = document.documentElement;
  const themeBtn = $('#themeToggle');
  const syncThemeBtn = () => themeBtn.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
  syncThemeBtn();
  themeBtn.addEventListener('click', () => {
    const flip = () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      syncThemeBtn();
      try { localStorage.setItem('flux-units-theme', root.dataset.theme); } catch { /* storage blocked */ }
    };
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(flip);
    else flip();
  });

  // ---------- Reveal sections on scroll ----------
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        en.target.classList.remove('pre-view');
        en.target.classList.add('in-view');
        io.unobserve(en.target);
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.section-head, .presets, .batch, .consts').forEach(n => {
      if (n.getBoundingClientRect().top > innerHeight) { n.classList.add('pre-view'); io.observe(n); }
    });
  }

  // ---------- Build date ----------
  // No build step: the build time is the newest Last-Modified header of the site's files. Without that
  // header there is no reliable date, so nothing is shown.
  async function showBuild() {
    const files = ['index.html', 'styles.css', 'app.js', 'molecule.js'];
    const times = await Promise.all(files.map(f => fetch(f, { method: 'HEAD', cache: 'no-cache' })
      .then(r => Date.parse(r.headers.get('last-modified')))
      .catch(() => NaN)));
    const t = Math.max(...times.filter(Number.isFinite));
    if (!Number.isFinite(t)) return;
    const d = new Date(t);
    const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(d);
    const node = $('#build');
    node.textContent = `Updated ${date}, ${time}`;
    node.title = d.toISOString();
  }

  // ---------- Go ----------
  showBuild();
  readHash();
  update({ animate: false });
  addEventListener('hashchange', () => { readHash(); shownParts = null; update({ animate: false }); });
  document.fonts?.ready.then(moveIndicator);
})();
