/* Flux unit converter · 3D ball-and-stick model of the selected gas, drawn on a 2D canvas */
(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // CPK-style element colours (light, base and dark tone for shading) and ball radii in Å.
  const ELEMENTS = {
    H: { r: .3, light: '#ffffff', base: '#e6e8eb', dark: '#9399a0', key: '#d9dce0' },
    C: { r: .42, light: '#8d949b', base: '#4a5157', dark: '#1d2124', key: '#4a5157' },
    N: { r: .41, light: '#a9c2ff', base: '#3f6fe0', dark: '#1b3786', key: '#3f6fe0' },
    O: { r: .4, light: '#ffa3a6', base: '#e5484d', dark: '#8c1c21', key: '#e5484d' },
  };
  const DARK = { C: { r: .42, light: '#c3c9ce', base: '#7d858c', dark: '#3a4045', key: '#9aa1a7' } };
  const isDark = () => document.documentElement.dataset.theme === 'dark';
  const element = sym => (isDark() && DARK[sym]) || ELEMENTS[sym];

  // Approximate equilibrium geometries (Å). Bonds: [atom i, atom j, bond order].
  const t = 1.09 / Math.sqrt(3);
  const MOLECULES = {
    co2: {
      atoms: [['C', 0, 0, 0], ['O', -1.16, 0, 0], ['O', 1.16, 0, 0]],
      bonds: [[0, 1, 2], [0, 2, 2]],
    },
    ch4: {
      atoms: [['C', 0, 0, 0], ['H', t, t, t], ['H', t, -t, -t], ['H', -t, t, -t], ['H', -t, -t, t]],
      bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
    },
    n2o: {
      atoms: [['N', -1.156, 0, 0], ['N', -.028, 0, 0], ['O', 1.156, 0, 0]],
      bonds: [[0, 1, 3], [1, 2, 1]],
    },
    h2o: {
      atoms: [['O', 0, .2, 0], ['H', .759, -.388, 0], ['H', -.759, -.388, 0]],
      bonds: [[0, 1, 1], [0, 2, 1]],
    },
  };
  for (const m of Object.values(MOLECULES)) {
    m.extent = Math.max(...m.atoms.map(([e, x, y, z]) => Math.hypot(x, y, z) + ELEMENTS[e].r));
  }

  const easeIn = x => x * x * x;
  const easeOutBack = x => { const c = 1.5; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

  function mount(canvas) {
    const ctx = canvas.getContext('2d');
    let mol = MOLECULES.co2;
    let current = 'co2';
    let yaw = .7, pitch = -.38, spin = 0;
    const TURN = Math.PI * 2;
    let autoLeft = TURN; // auto rotation stops after one full turn; a gas change or a drag restarts it
    let scale = 1;
    let trans = null;
    let drag = null;
    let w = 0, h = 0, dpr = 1;
    let raf = 0, last = 0, onScreen = true;

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      draw();
    }

    function project(x, y, z) {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const X = x * cy + z * sy;
      let Z = -x * sy + z * cy;
      const Y = y * cp - Z * sp;
      Z = y * sp + Z * cp;
      const f = 7 / (7 - Z);
      const k = (Math.min(w, h) * .4 / mol.extent) * scale;
      return { x: w / 2 + X * k * f, y: h * .46 - Y * k * f, z: Z, s: k * f };
    }

    function atom(p, e) {
      const r = e.r * p.s;
      if (r <= .2) return;
      const g = ctx.createRadialGradient(p.x - r * .35, p.y - r * .4, r * .05, p.x, p.y, r);
      g.addColorStop(0, e.light);
      g.addColorStop(.55, e.base);
      g.addColorStop(1, e.dark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      const hl = ctx.createRadialGradient(p.x - r * .38, p.y - r * .42, 0, p.x - r * .38, p.y - r * .42, r * .5);
      hl.addColorStop(0, 'rgba(255,255,255,.7)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Half of a bond, from atom A to the bond midpoint, in A's colour; multiple bonds as parallel sticks.
    function halfBond(A, B, order, e) {
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      const L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
      const nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L;
      const rad = A.s * (order === 1 ? .11 : .075);
      const gap = A.s * .2;
      const offs = order === 1 ? [0] : order === 2 ? [-gap / 2, gap / 2] : [-gap * .8, 0, gap * .8];
      for (const o of offs) {
        const ox = nx * o, oy = ny * o;
        const g = ctx.createLinearGradient(A.x + ox - nx * rad, A.y + oy - ny * rad, A.x + ox + nx * rad, A.y + oy + ny * rad);
        g.addColorStop(0, e.dark);
        g.addColorStop(.4, e.light);
        g.addColorStop(1, e.dark);
        ctx.strokeStyle = g;
        ctx.lineWidth = rad * 2;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(A.x + ox, A.y + oy);
        ctx.lineTo(mx + ox, my + oy);
        ctx.stroke();
      }
    }

    function draw() {
      if (!w) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // soft contact shadow
      const sx = w / 2, sy = h * .88, sr = Math.min(w, h) * .3 * Math.max(scale, 0);
      if (sr > 1) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(1, .22);
        const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
        sh.addColorStop(0, 'rgba(20,22,18,.22)');
        sh.addColorStop(1, 'rgba(20,22,18,0)');
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.arc(0, 0, sr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const P = mol.atoms.map(([, x, y, z]) => project(x, y, z));
      const items = mol.atoms.map((a, i) => ({ z: P[i].z, i }));
      for (const [i, j, o] of mol.bonds) {
        const mz = (P[i].z + P[j].z) / 2;
        items.push({ z: (P[i].z + mz) / 2 - .01, a: i, b: j, o });
        items.push({ z: (P[j].z + mz) / 2 - .01, a: j, b: i, o });
      }
      items.sort((p, q) => p.z - q.z);
      for (const it of items) {
        if (it.i !== undefined) atom(P[it.i], element(mol.atoms[it.i][0]));
        else halfBond(P[it.a], P[it.b], it.o, element(mol.atoms[it.a][0]));
      }
    }

    function frame(now) {
      const dt = Math.min(50, now - (last || now)) / 1000;
      last = now;
      if (!drag && !reduceMotion.matches) {
        const auto = autoLeft > 0 ? Math.min(autoLeft, .18 * dt) : 0;
        autoLeft -= auto;
        yaw += auto + spin * dt;
        spin = Math.abs(spin) < .01 ? 0 : spin * Math.pow(.04, dt);
      }
      if (trans) {
        const p = Math.min(1, (now - trans.t0) / trans.dur);
        if (trans.phase === 'out') {
          scale = trans.from * (1 - easeIn(p));
          if (p === 1) {
            mol = MOLECULES[trans.to];
            trans = { phase: 'in', t0: now, dur: 520 };
            spin = 1.2;
          }
        } else {
          scale = easeOutBack(p);
          if (p === 1) { scale = 1; trans = null; }
        }
      }
      draw();
      const moving = trans || drag || (!reduceMotion.matches && (autoLeft > 0 || spin !== 0));
      raf = onScreen && !document.hidden && moving ? requestAnimationFrame(frame) : 0;
    }
    const wake = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };

    function set(key) {
      if (!MOLECULES[key] || key === current) return;
      current = key;
      if (reduceMotion.matches || !w) { mol = MOLECULES[key]; scale = 1; trans = null; draw(); return; }
      autoLeft = TURN;
      if (trans?.phase === 'out') { trans.to = key; return; }
      trans = { phase: 'out', to: key, from: scale, t0: performance.now(), dur: 160 };
      wake();
    }

    // Drag (mouse, pen or touch) rotates the model.
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, vx: 0, t: performance.now() };
      canvas.classList.add('grabbing');
      wake();
    });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      const now = performance.now();
      yaw += dx * .012;
      pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * .01));
      drag.vx = dx / Math.max(1, now - drag.t) * 12;
      drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    });
    const release = () => {
      if (!drag) return;
      spin = Math.max(-6, Math.min(6, drag.vx));
      autoLeft = TURN;
      drag = null;
      canvas.classList.remove('grabbing');
      wake();
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    // Redraw when the theme changes (carbon uses lighter tones on dark).
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    new ResizeObserver(resize).observe(canvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; if (onScreen) wake(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    reduceMotion.addEventListener?.('change', wake);
    resize();
    wake();

    return { set };
  }

  window.FluxMolecule = { mount, elements: ELEMENTS, molecules: MOLECULES };
})();
