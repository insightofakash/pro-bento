/* 01Resolved — "What you unlock" isometric illustrations.
   Plain-JS ports of the four React components (TraderProfilesIso, NavHistoryIso,
   McpClaudeIso, WatchlistAlertsIso). Same geometry, physics and timing; the
   accent is retinted from lime to the 01Resolved tan, and type uses the page font.
   Each tile plays while hovered, exactly as the originals do. */
(() => {
  /* ------------------------------------------------------------------ */
  /* Tokens                                                              */
  /* ------------------------------------------------------------------ */
  const K = Math.cos(Math.PI / 6);
  const TEXT = "#161616";
  const EDGE = "#2B2B2A";
  const SIDE = "#55554F";
  const BODY = "#5E5E5B";
  const MUTED = "#9A9A96";
  const RULE = "#ECECEA";
  const FILL = "#F4F4F2";
  const lime = "#D4B596";     // accent (was #C8F06A)
  const limeDeep = "#A9865F"; // dots and lines on the accent (was #9CC63C)
  const R = 10, TH = 4, PAD = 10, RISE = 6;

  const EDGE_A = `stroke="${EDGE}" stroke-width="1.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;
  const FINE_A = `stroke="${EDGE}" stroke-width="0.9" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;

  const clamp01 = x => Math.min(1, Math.max(0, x));
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const f2 = n => Math.round(n * 100) / 100;
  const prefersReduced = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const Rise = (p, children) => {
    const e = easeOut(clamp01(p));
    if (e <= 0.001) return "";
    return `<g opacity="${f2(e)}" transform="translate(0 ${f2((1 - e) * RISE)})">${children}</g>`;
  };

  /* ------------------------------------------------------------------ */
  /* Shared pieces                                                       */
  /* ------------------------------------------------------------------ */
  let uid = 0;
  function Stage(el, label) {
    const id = `iso${++uid}`;
    const s = 14, w = 2 * K * s;
    el.classList.add("iso-stage");
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", label);
    const dots = [[0, 0], [w, 0], [0, s], [w, s], [w / 2, s / 2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.05" fill="#C8C8C5"/>`).join("");
    el.innerHTML = `
      <svg aria-hidden="true" width="100%" height="100%" class="iso-dots">
        <defs>
          <pattern id="${id}p" width="${w}" height="${s}" patternUnits="userSpaceOnUse">${dots}</pattern>
          <radialGradient id="${id}g" cx="50%" cy="55%" r="62%"><stop offset="0.35" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
          <mask id="${id}m"><rect width="100%" height="100%" fill="url(#${id}g)"/></mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#${id}p)" mask="url(#${id}m)"/>
      </svg>
      <div class="iso-inner"><svg class="iso-svg" width="100%" height="100%" aria-hidden="true"></svg></div>`;
    return el.querySelector(".iso-svg");
  }

  const GAP = 8, PILL = 12, PILL_GAP = 4;
  const RULE_Y = PAD + PILL + GAP;

  const ISO = { k: K, s: 0.5 };
  const FLAT = { k: Math.cos((22 * Math.PI) / 180), s: Math.sin((22 * Math.PI) / 180) };
  const planeM = (p, e = 0) => `matrix(${f2(p.k)} ${f2(p.s)} 0 1 ${f2(p.k * e)} ${f2(-p.s * e)})`;

  function Card(w, h, children, fill = "#fff", proj = ISO) {
    let out = "";
    for (const e of [4, 3, 2, 1]) out += `<rect width="${w}" height="${h}" rx="${R}" fill="${SIDE}" ${EDGE_A} transform="${planeM(proj, e)}"/>`;
    out += `<rect width="${w}" height="${h}" rx="${R}" fill="${fill}" ${EDGE_A} transform="${planeM(proj)}"/>`;
    out += `<g transform="${planeM(proj)}">${children}</g>`;
    return `<g>${out}</g>`;
  }

  function Pill(x, y, w, label, on = 1) {
    let out = "";
    if (on < 1) out += `<rect x="${x + 0.35}" y="${y + 0.35}" width="${w - 0.7}" height="${PILL - 0.7}" rx="${(PILL - 0.7) / 2}" fill="none" stroke="#C4C4C0" stroke-width="0.6" stroke-dasharray="1.4 1.4"/>`;
    out += `<rect x="${x}" y="${y}" width="${w}" height="${PILL}" rx="${PILL / 2}" fill="${lime}" opacity="${f2(on)}"/>`;
    out += `<text x="${x + w / 2}" y="${y + 8.1}" font-size="6" font-weight="600" text-anchor="middle" fill="${on > 0.5 ? TEXT : MUTED}">${label}</text>`;
    return `<g>${out}</g>`;
  }

  function CardHeader(w, title, pill) {
    return `<g>
      <text x="${PAD}" y="${PAD + 8.7}" font-size="7.5" font-weight="600" fill="${TEXT}">${title}</text>
      ${pill ? Pill(w - PAD - pill.w, PAD, pill.w, pill.label) : ""}
      <line x1="${PAD}" x2="${w - PAD}" y1="${RULE_Y}" y2="${RULE_Y}" stroke="${RULE}" stroke-width="0.7"/>
    </g>`;
  }

  /* A tiny driver: `effect(on)` mirrors the React useEffect([on]) of each component. */
  function mount(el, label, { initial, effect, render }) {
    const svg = Stage(el, label);
    const st = { on: false, f: initial, raf: 0 };
    const setF = f => { st.f = f; render(svg, f); };
    const run = () => { cancelAnimationFrame(st.raf); st.cleanup && st.cleanup(); st.cleanup = effect(st.on, setF, r => (st.raf = r)); };
    render(svg, st.f);
    run();
    return { setActive(v) { if (v === st.on) return; st.on = v; run(); } };
  }

  /* ------------------------------------------------------------------ */
  /* 1. Unlimited trader profiles                                        */
  /* ------------------------------------------------------------------ */
  const T_HEAD = 16;
  const T_RULE = PAD + T_HEAD + GAP;
  const T_CHART = T_RULE + GAP;
  const T_CHART_H = 22;
  const T_LABEL = T_CHART + T_CHART_H + GAP + 4;
  const T_VALUE = T_LABEL + 10;
  const WC = 128, HC = T_VALUE + PAD;
  const N = 6;
  const S0 = 18, S1 = 46;
  const FADE_A = 2.6, FADE_B = 4.8;
  const SPEED = 0.6;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hex3 = r => Math.floor(r() * 4096).toString(16).padStart(3, "0");

  const TRADERS = Array.from({ length: 12 }, (_, n) => {
    const r = rng(n * 7919 + 13);
    let v = 0.4;
    const raw = Array.from({ length: 12 }, () => (v += (r() - 0.36) * 0.22));
    const lo = Math.min(...raw), hi = Math.max(...raw);
    return {
      v: n % 3,
      handle: `0x${hex3(r)}…${hex3(r)}`,
      pnl: `+${(3 + r() * 32).toFixed(1)}%`,
      trades: String(60 + Math.floor(r() * 520)),
      win: `${Math.round(52 + r() * 28)}%`,
      held: `${Math.round(3 + r() * 40)}d`,
      spark: raw.map(x => (x - lo) / (hi - lo || 1)),
    };
  });
  const AVATARS = [{ bg: lime, fg: TEXT }, { bg: "#3A3A38", fg: "#fff" }, { bg: "#ECECEA", fg: "#55554F" }];

  const Avatar = (cx, cy, v) => {
    const c = AVATARS[v];
    return `<g transform="translate(${cx} ${cy})"><circle r="${T_HEAD / 2}" fill="${c.bg}"/><circle cy="-1.9" r="2.8" fill="${c.fg}"/><path d="M-4.8 5.4Q-4.8 1.8 0 1.8Q4.8 1.8 4.8 5.4Z" fill="${c.fg}"/></g>`;
  };

  const headerCache = new Map(), bodyCache = new Map();
  function TraderHeader(t) {
    if (headerCache.has(t)) return headerCache.get(t);
    const mid = PAD + T_HEAD / 2;
    const s = `<g>${Avatar(PAD + T_HEAD / 2, mid, t.v)}
      <text x="${PAD + T_HEAD + GAP}" y="${mid - 1}" font-size="7.5" font-weight="600" fill="${TEXT}">${t.handle}</text>
      <text x="${PAD + T_HEAD + GAP}" y="${mid + 7}" font-size="5.6" fill="${MUTED}">30D return</text>
      ${Pill(WC - PAD - 32, mid - PILL / 2, 32, t.pnl)}</g>`;
    headerCache.set(t, s);
    return s;
  }
  function TraderBody(t) {
    if (bodyCache.has(t)) return bodyCache.get(t);
    const x0 = PAD, w = WC - PAD * 2, y0 = T_CHART, h = T_CHART_H;
    const pts = t.spark.map((v, i) => [x0 + (i * w) / (t.spark.length - 1), y0 + (1 - v) * h]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
    const area = `${line}L${x0 + w} ${y0 + h}L${x0} ${y0 + h}Z`;
    const last = pts[pts.length - 1];
    const col = w / 3;
    const stats = [["Trades", t.trades], ["Win rate", t.win], ["Held", t.held]].map(([label, value], k) =>
      `<g><text x="${x0 + k * col}" y="${T_LABEL}" font-size="5.6" fill="${MUTED}">${label}</text><text x="${x0 + k * col}" y="${T_VALUE}" font-size="8" font-weight="600" fill="${TEXT}">${value}</text></g>`).join("");
    const s = `<g>
      <line x1="${PAD}" x2="${WC - PAD}" y1="${T_RULE}" y2="${T_RULE}" stroke="${RULE}" stroke-width="0.7"/>
      <line x1="${x0}" x2="${x0 + w}" y1="${y0 + h}" y2="${y0 + h}" stroke="${RULE}" stroke-width="0.7"/>
      <path d="${area}" fill="${lime}" opacity="0.45"/>
      <path d="${line}" fill="none" stroke="${TEXT}" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="2.3" fill="${limeDeep}"/>
      ${stats}</g>`;
    bodyCache.set(t, s);
    return s;
  }

  function TraderProfilesIso(el) {
    const sim = { h: 0, hv: 0, off: 0, ov: 0, snap: 0 };
    const DMAX = (FADE_B - 0.6) * S1, DMIN = -0.5 * S1, pad = 4;
    const vbX = K * DMIN - pad;
    const vbY = -0.5 * DMAX - TH - pad;
    const vbW = K * WC + K * (DMAX - DMIN) + K * TH + pad * 2;
    const vbH = 0.5 * WC + HC - 0.5 * DMIN + 0.5 * DMAX + TH + pad * 2;
    return mount(el, "Isometric stack of trader profile cards", {
      initial: { h: 0, off: 0 },
      effect(on, setF, setRaf) {
        const s = sim;
        const reduced = prefersReduced();
        const target = on ? 1 : 0;
        let last = performance.now();
        const tick = now => {
          const dt = Math.min(0.033, (now - last) / 1000);
          last = now;
          if (reduced) { s.h = target; s.hv = 0; } else { s.hv += (120 * (target - s.h) - 22 * s.hv) * dt; s.h += s.hv * dt; }
          if (on && !reduced) {
            s.ov += (SPEED - s.ov) * (1 - Math.exp(-dt * 2.5));
            s.off += s.ov * dt;
            s.snap = Math.ceil(s.off);
          } else {
            s.ov += (40 * (s.snap - s.off) - 12.6 * s.ov) * dt;
            s.off += s.ov * dt;
          }
          const done = reduced || (!on && Math.abs(s.h - target) < 0.002 && Math.abs(s.hv) < 0.02 && Math.abs(s.snap - s.off) < 0.002 && Math.abs(s.ov) < 0.02);
          if (done) {
            if (!on) s.off = s.snap;
            s.h = target; s.hv = 0; s.ov = 0;
            setF({ h: s.h, off: s.off });
            return;
          }
          setF({ h: s.h, off: s.off });
          setRaf(requestAnimationFrame(tick));
        };
        setRaf(requestAnimationFrame(tick));
      },
      render(svg, { h, off }) {
        const hc = clamp01(h);
        const spacing = S0 + (S1 - S0) * h;
        const recentre = (S1 - S0) * FADE_B * 0.5 * (1 - h);
        const cards = [];
        for (let i = 0; i < N; i++) {
          const k = Math.floor((i - off + 1) / N);
          const q = i - off - N * k;
          const op = q < 0 ? 1 + q : q > FADE_A ? Math.max(0, (FADE_B - q) / (FADE_B - FADE_A)) : 1;
          if (op > 0.01) cards.push({ i, q, id: i - N * k, op });
        }
        cards.sort((a, b) => b.q - a.q);
        svg.setAttribute("viewBox", `${f2(vbX)} ${f2(vbY)} ${f2(vbW)} ${f2(vbH)}`);
        svg.innerHTML = cards.map(({ q, id, op }) => {
          const t = TRADERS[((id % 12) + 12) % 12];
          const d = q * spacing + recentre;
          const shade = 255 - Math.round(Math.min(Math.max(q, 0), 4) * 3);
          const hdr = q <= 0 ? 1 : q < 1 ? 1 - (1 - hc) * q : hc;
          const body = q < 1 ? 1 - Math.max(q, 0) : 0;
          const inner = (hdr > 0.01 ? `<g opacity="${f2(hdr)}">${TraderHeader(t)}</g>` : "") + (body > 0.01 ? `<g opacity="${f2(body)}">${TraderBody(t)}</g>` : "");
          return `<g transform="translate(${f2(K * d)} ${f2(-0.5 * d)})" opacity="${f2(op)}">${Card(WC, HC, inner, `rgb(${shade},${shade},${Math.max(0, shade - 1)})`)}</g>`;
        }).join("");
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Full NAV/AS history                                              */
  /* ------------------------------------------------------------------ */
  const LT = 184;
  const NC = 10, PUB = 4, NPRO = NC - PUB;
  const CW = 8;
  const STEP = (LT - 2 * PAD - CW) / (NC - 1);
  const N_RULE = PAD + CW + PAD;
  const N_PILLS = N_RULE + PAD;
  const DC = N_PILLS + PILL + PAD;
  const MAXD = 0.9;
  const HEIGHTS = Array.from({ length: NC }, (_, j) => {
    const wob = [0, 4, -2, 5, -1, 4, -2, 3, -1, 0][j];
    return Math.round(14 + 54 * Math.pow(j / (NC - 1), 1.25) + wob);
  });
  const colX = j => PAD + j * STEP;
  const P = (u, v, z = 0) => [(u - v) * K, (u + v) / 2 - z];
  const pts = ps => ps.map(p => `${f2(p[0])},${f2(p[1])}`).join(" ");
  const TOP = (dz = 0) => `matrix(${K} -0.5 ${K} 0.5 ${f2(-K * LT)} ${f2(LT / 2 + dz)})`;

  function column(j, h) {
    const u0 = PAD, u1 = PAD + CW;
    const v1 = LT - colX(j), v0 = v1 - CW;
    return {
      top: pts([P(u0, v0, h), P(u1, v0, h), P(u1, v1, h), P(u0, v1, h)]),
      left: pts([P(u0, v1, h), P(u1, v1, h), P(u1, v1), P(u0, v1)]),
      right: pts([P(u1, v0, h), P(u1, v1, h), P(u1, v1), P(u1, v0)]),
    };
  }
  const SHADES = {
    pub: { top: "#FFFFFF", left: "#E2E2DF", right: "#CDCDC9" },
    now: { top: lime, left: "#E2E2DF", right: "#CDCDC9" },
    pro: { top: lime, left: "#6A6A66", right: "#55554F" },
  };
  const RANGES = ["1D", "1W", "1M", "3M", "All"];
  const RANGE_W = 20;
  const rangeX = k => LT - PAD - (RANGES.length - k) * RANGE_W - (RANGES.length - 1 - k) * PILL_GAP;

  const NAV_PLATE = `<g>
    ${[4, 3, 2, 1].map(k => `<rect x="0" y="0" width="${LT}" height="${DC}" rx="${R}" fill="${SIDE}" ${EDGE_A} transform="${TOP(k)}"/>`).join("")}
    <rect x="0" y="0" width="${LT}" height="${DC}" rx="${R}" fill="#fff" ${EDGE_A} transform="${TOP()}"/>
    <g transform="${TOP()}">
      <line x1="${PAD}" x2="${LT - PAD}" y1="${N_RULE}" y2="${N_RULE}" stroke="${RULE}" stroke-width="0.7"/>
      ${RANGES.slice(0, 3).map((r, k) => Pill(rangeX(k), N_PILLS, RANGE_W, r)).join("")}
    </g></g>`;

  function NavHistoryIso(el) {
    const sim = { t: 0, time: 0 };
    const pad = 4;
    const vbX = -K * LT - pad, vbW = K * DC + K * LT + pad * 2;
    const vbY = -(HEIGHTS[NC - 1] * 1.04) - pad, vbH = (DC + LT) / 2 + TH + pad + -vbY;
    let isOn = false;
    return mount(el, "Isometric column chart that extends back to launch", {
      initial: { t: 0, time: 0 },
      effect(on, setF, setRaf) {
        isOn = on;
        const s = sim;
        const reduced = prefersReduced();
        let last = performance.now();
        const tick = now => {
          const dt = Math.min(0.033, (now - last) / 1000);
          last = now;
          s.time += dt;
          s.t = reduced ? (on ? 1 : 0) : clamp01(s.t + (on ? dt / 1.6 : -dt / 0.7));
          setF({ t: s.t, time: s.time });
          if (reduced || (!on && s.t === 0)) return;
          setRaf(requestAnimationFrame(tick));
        };
        setRaf(requestAnimationFrame(tick));
      },
      render(svg, { t, time }) {
        const on = isOn;
        const tt = t * (1 + MAXD);
        const pr = seg(t, 0.05, 0.4);
        const cols = [];
        for (let j = NC - 1; j >= 0; j--) {
          const isPro = j < NPRO;
          let lp = 1, e = 1, wave = 1;
          if (isPro) {
            const order = NPRO - 1 - j;
            lp = clamp01(tt - (order * MAXD) / (NPRO - 1));
            e = easeOut(lp);
            wave = lp >= 1 && on ? 1 + 0.03 * Math.sin(time * 2.2 - j * 0.7) : 1;
          }
          cols.push({ j, isPro, lp, h: HEIGHTS[j] * e * wave });
        }
        svg.setAttribute("viewBox", `${f2(vbX)} ${f2(vbY)} ${f2(vbW)} ${f2(vbH)}`);
        svg.innerHTML = NAV_PLATE +
          `<g transform="${TOP()}">
            ${RANGES.slice(3).map((r, k) => Pill(rangeX(k + 3), N_PILLS, RANGE_W, r, pr)).join("")}
            ${Rise(pr, `<text x="${PAD}" y="${N_PILLS + 8.1}" font-size="6" font-weight="500" fill="${BODY}">Launch</text>`)}
            ${cols.filter(c => c.isPro && c.lp < 1).map(c => `<rect x="${colX(c.j) + 0.3}" y="${PAD + 0.3}" width="${CW - 0.6}" height="${CW - 0.6}" rx="1.5" fill="none" stroke="#C4C4C0" stroke-width="0.6" stroke-dasharray="1.4 1.4" opacity="${f2(1 - c.lp)}"/>`).join("")}
          </g>` +
          cols.map(c => {
            if (c.h < 0.6) return "";
            const b = column(c.j, c.h);
            const sh = c.isPro ? SHADES.pro : c.j === NC - 1 ? SHADES.now : SHADES.pub;
            return `<g><polygon points="${b.left}" fill="${sh.left}" ${FINE_A}/><polygon points="${b.right}" fill="${sh.right}" ${FINE_A}/><polygon points="${b.top}" fill="${sh.top}" ${FINE_A}/></g>`;
          }).join("");
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3. 01R MCP in Claude                                                */
  /* ------------------------------------------------------------------ */
  const MP = FLAT;
  const MW = 120;
  const DEPTH = MW + 4 * GAP;
  const BACK = [MP.k * DEPTH, -MP.s * DEPTH];
  const Q_Y = RULE_Y + GAP, Q_H = 16;
  const A_Y = Q_Y + Q_H + GAP, A_H = 34;
  const S_Y = A_Y + A_H + GAP;
  const MH = S_Y + PILL + PAD;
  const ROW_INSET = 3;
  const ROW_H = (MH - PAD - RULE_Y + ROW_INSET) / 4;
  const ROWS = [["Spot price", "$0.0412"], ["NAV/AS", "$0.0430"], ["Discount", "−4.2%"], ["Holders", "1,284"]];
  const LIT = 2;
  const CI = R * (1 - Math.SQRT1_2);
  const onPlane = ([x, y]) => [MP.k * x, MP.s * x + y];
  const FRONT = [[CI, CI], [MW - CI, CI], [MW - CI, MH - CI], [CI, MH - CI]].map(onPlane);
  const REAR = FRONT.map(([x, y]) => [x + BACK[0], y + BACK[1]]);
  const HULL = [FRONT[0], REAR[0], REAR[1], REAR[2], FRONT[2], FRONT[3]];
  const HULL_PTS = HULL.map(p => `${f2(p[0])},${f2(p[1])}`).join(" ");

  function McpClaudeIso(el) {
    const sim = { t: 1, time: 0, mode: "idle", hold: 0, clear: 0, c: 0, armed: false };
    const pad = 4;
    const vbX = -pad, vbY = BACK[1] - MP.s * TH - pad;
    const vbW = BACK[0] + MP.k * (MW + TH) + pad * 2, vbH = MP.s * MW + MH - vbY + pad;
    const qW = 72;
    return mount(el, "Claude answering a question about a listing from its record", {
      initial: { t: 1, time: 0, clear: 0, c: 0, armed: false },
      effect(on, setF, setRaf) {
        const s = sim;
        const reduced = prefersReduced();
        if (on && !reduced && s.mode === "idle") { s.mode = "clear"; s.armed = false; }
        if (!on && s.mode !== "idle") s.mode = s.t < 1 ? "finish" : "idle";
        if (reduced) { s.t = 1; s.c = on ? 1 : 0; s.armed = on; setF({ t: 1, time: s.time, clear: 0, c: s.c, armed: s.armed }); return; }
        let last = performance.now();
        const tick = now => {
          const dt = Math.min(0.033, (now - last) / 1000);
          last = now;
          s.time += dt;
          s.c = clamp01(s.c + (on ? dt : -dt) / 0.35);
          if (s.mode === "clear") { s.clear += dt / 0.45; if (s.clear >= 1) { s.clear = 0; s.t = 0; s.mode = "play"; s.armed = true; } }
          else if (s.mode === "play") { s.t += dt / 4; if (s.t >= 1) { s.t = 1; s.mode = "hold"; s.hold = 0; } }
          else if (s.mode === "hold") { s.hold += dt; if (s.hold > 1.8) s.mode = "clear"; }
          else if (s.mode === "finish") {
            s.clear = 0; s.t += dt / 0.6;
            if (s.t >= 1) { s.t = 1; s.mode = on ? "clear" : "idle"; if (on) s.armed = false; }
          }
          setF({ t: s.t, time: s.time, clear: s.mode === "clear" ? s.clear : 0, c: s.c, armed: s.armed });
          if (s.mode === "idle" && s.c === (on ? 1 : 0)) return;
          setRaf(requestAnimationFrame(tick));
        };
        setRaf(requestAnimationFrame(tick));
      },
      render(svg, { t, time, clear, c, armed }) {
        const keep = 1 - easeOut(clear);
        const ask = seg(t, 0.02, 0.16);
        const thinking = seg(t, 0.16, 0.22) * (1 - seg(t, 0.4, 0.46));
        const hl = easeInOut(seg(t, 0.2, 0.36));
        const link = easeInOut(seg(t, 0.3, 0.5));
        const glow = easeInOut(seg(t, 0.46, 0.66));
        const a1 = seg(t, 0.62, 0.76);
        const a2 = seg(t, 0.7, 0.84);
        const src = seg(t, 0.78, 0.92);
        const breathe = 0.5 + 0.5 * Math.sin(time * 1.6);
        const linkOp = armed ? keep * c : 0;
        const glowOp = glow * linkOp * (0.1 + 0.05 * breathe);

        const rows = ROWS.map(([k, v], i) => {
          const y = RULE_Y + i * ROW_H;
          const lit = i === LIT ? hl * keep : 0;
          return `<g>
            ${lit > 0.01 ? `<rect x="${PAD - 4}" y="${f2(y + ROW_INSET)}" width="${f2((MW - 2 * PAD + 8) * lit)}" height="${f2(ROW_H - 2 * ROW_INSET)}" rx="7" fill="${lime}"/>` : ""}
            <text x="${PAD}" y="${f2(y + ROW_H / 2 + 2.2)}" font-size="6.2" fill="${lit > 0.5 ? TEXT : BODY}">${k}</text>
            <text x="${MW - PAD}" y="${f2(y + ROW_H / 2 + 2.6)}" font-size="7.5" font-weight="600" text-anchor="end" fill="${TEXT}">${v}</text>
            ${i < ROWS.length - 1 ? `<line x1="${PAD}" x2="${MW - PAD}" y1="${f2(y + ROW_H)}" y2="${f2(y + ROW_H)}" stroke="${RULE}" stroke-width="0.6"/>` : ""}
          </g>`;
        }).join("");

        const record = `<g transform="translate(${f2(BACK[0])} ${f2(BACK[1])})">${Card(MW, MH, CardHeader(MW, "01R coin") + rows, "#fff", MP)}</g>`;

        let box = "";
        if (glowOp > 0.002) box += `<polygon points="${HULL_PTS}" fill="${lime}" opacity="${f2(glow * (0.1 + 0.05 * breathe))}"/>`;
        if (link > 0) {
          box += REAR.map((r, i) => {
            const fr = FRONT[i];
            return `<line x1="${f2(r[0])}" y1="${f2(r[1])}" x2="${f2(r[0] + (fr[0] - r[0]) * link)}" y2="${f2(r[1] + (fr[1] - r[1]) * link)}" stroke="${BODY}" stroke-width="1" stroke-dasharray="2.5 2.5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
          }).join("");
          box += REAR.map(r => `<circle cx="${f2(r[0])}" cy="${f2(r[1])}" r="2.2" fill="${TEXT}" opacity="${f2(seg(link, 0, 0.15))}"/>`).join("");
        }

        const dots = [0, 1, 2].map(k => `<circle cx="${PAD + GAP + 2 + k * 7}" cy="${f2(A_Y + A_H / 2 - 1.6 * Math.max(0, Math.sin(time * 8 - k * 0.9)))}" r="1.9" fill="${MUTED}"/>`).join("");
        const chatBody = `<g opacity="${f2(keep)}">
          ${Rise(ask, `<rect x="${MW - PAD - qW}" y="${Q_Y}" width="${qW}" height="${Q_H}" rx="${Q_H / 2}" fill="#2E2E2C"/><text x="${MW - PAD - qW / 2}" y="${Q_Y + 10.4}" font-size="6.2" text-anchor="middle" fill="#fff">Why the discount?</text>`)}
          ${Rise(Math.max(seg(t, 0.16, 0.24), a1), `<rect x="${PAD}" y="${A_Y}" width="${MW - 2 * PAD}" height="${A_H}" rx="9" fill="${FILL}"/>`)}
          <g opacity="${f2(thinking)}">${dots}</g>
          ${Rise(a1, `<text x="${PAD + GAP}" y="${A_Y + 14}" font-size="7" font-weight="600" fill="${TEXT}">4.2% below NAV/AS.</text>`)}
          ${Rise(a2, `<text x="${PAD + GAP}" y="${A_Y + 25}" font-size="6.2" fill="${BODY}">Holders up 12% in 7d.</text>`)}
          ${Rise(src, Pill(PAD, S_Y, 60, "From 01R record"))}
        </g>`;
        const chat = `<g>${Card(MW, MH, CardHeader(MW, "01R MCP", { w: 24, label: "Live" }) + chatBody, "#fff", MP)}</g>`;

        const ends = link > 0.9 ? FRONT.map(fr => `<circle cx="${f2(fr[0])}" cy="${f2(fr[1])}" r="2.2" fill="${TEXT}" opacity="${f2(seg(link, 0.9, 1))}"/>`).join("") : "";

        svg.setAttribute("viewBox", `${f2(vbX)} ${f2(vbY)} ${f2(vbW)} ${f2(vbH)}`);
        svg.innerHTML = record + `<g opacity="${f2(linkOp)}">${box}</g>` + chat + `<g opacity="${f2(linkOp)}">${ends}</g>`;
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4. Watchlist alerts                                                 */
  /* ------------------------------------------------------------------ */
  const NW = 184, NH = 38;
  const N_PITCH = NH + GAP + 4;
  const N_ICON = 18;
  const N_SPEED = 0.45;
  const N_OUT = 0.22, N_UP = 0.52, N_IN = 0.78;
  const NP = FLAT;
  const N_KINDS = [
    { title: "Supply", detail: "HYPE-L supply cap raised to 12M", icon: "layers" },
    { title: "NAV/AS", detail: "HYPE-L discount widened to −6.1%", icon: "bars" },
    { title: "Largest holder", detail: "0x4e…a1 sold 8% of their HYPE-L", icon: "holder" },
  ];
  const AGES = ["now", "4m", "12m"];

  function NoteIcon(kind, fresh) {
    const bg = fresh ? lime : "#ECECEA";
    const fg = fresh ? TEXT : "#6A6A66";
    const c = N_ICON / 2;
    let g = "";
    if (kind === "layers") g = [0, 1, 2].map(k => `<rect x="${c - 4.5}" y="${c - 4 + k * 3}" width="9" height="2" rx="1" fill="${fg}"/>`).join("");
    if (kind === "bars") g = `<g fill="${fg}"><rect x="${c - 4}" y="${c - 4}" width="3" height="8" rx="1"/><rect x="${c + 1}" y="${c - 1}" width="3" height="5" rx="1"/></g>`;
    if (kind === "holder") g = `<g fill="${fg}"><circle cx="${c}" cy="${c - 1.8}" r="2.4"/><path d="M${c - 4.2} ${c + 4.6}Q${c - 4.2} ${c + 1.2} ${c} ${c + 1.2}Q${c + 4.2} ${c + 1.2} ${c + 4.2} ${c + 4.6}Z"/></g>`;
    return `<g transform="translate(${PAD} ${(NH - N_ICON) / 2})"><circle cx="${c}" cy="${c}" r="${c}" fill="${bg}"/>${g}</g>`;
  }
  function Note(n, slot, fresh) {
    const k = N_KINDS[((n % 3) + 3) % 3];
    const tx = PAD + N_ICON + GAP;
    return Card(NW, NH, `${NoteIcon(k.icon, fresh)}
      <text x="${tx}" y="16" font-size="7" font-weight="600" fill="${TEXT}">${k.title}</text>
      <text x="${tx}" y="26" font-size="5.9" fill="${BODY}">${k.detail}</text>
      <text x="${NW - PAD}" y="16" font-size="5.6" text-anchor="end" fill="${MUTED}">${AGES[slot] || ""}</text>`, "#fff", NP);
  }

  function WatchlistAlertsIso(el) {
    const sim = { off: 3, ov: 0, snap: 3 };
    const slotY = slot => -slot * N_PITCH;
    const pad = 4;
    const top = slotY(2) - NP.s * TH;
    const bottom = NP.s * NW + NH + RISE;
    const vbX = -pad, vbY = top - pad;
    const vbW = NP.k * (NW + TH) + pad * 2, vbH = bottom - top + pad * 2;
    return mount(el, "A stack of watchlist notifications, new alerts arriving at the bottom", {
      initial: 3,
      effect(on, setOff, setRaf) {
        const s = sim;
        if (prefersReduced()) return;
        let last = performance.now();
        const tick = now => {
          const dt = Math.min(0.033, (now - last) / 1000);
          last = now;
          if (on) {
            s.ov += (N_SPEED - s.ov) * (1 - Math.exp(-dt * 4));
            s.off += s.ov * dt;
            s.snap = Math.ceil(s.off);
          } else {
            s.ov += (40 * (s.snap - s.off) - 12.6 * s.ov) * dt;
            s.off += s.ov * dt;
            if (Math.abs(s.snap - s.off) < 0.002 && Math.abs(s.ov) < 0.02) { s.off = s.snap; s.ov = 0; setOff(s.off); return; }
          }
          setOff(s.off);
          setRaf(requestAnimationFrame(tick));
        };
        setRaf(requestAnimationFrame(tick));
      },
      render(svg, off) {
        const base = Math.floor(off);
        const ph = off - base;
        const out = seg(ph, 0, N_OUT);
        const up = easeInOut(seg(ph, N_OUT, N_UP));
        const inn = seg(ph, N_UP, N_IN);
        const notes = [];
        if (out < 1) notes.push({ n: base - 2, slot: 2, op: 1 - out, y: slotY(2) });
        notes.push({ n: base - 1, slot: 1 + up, op: 1, y: slotY(1 + up) });
        notes.push({ n: base, slot: up, op: 1, y: slotY(up) });
        if (inn > 0) {
          const e = easeOut(inn);
          notes.push({ n: base + 1, slot: 0, op: e, y: slotY(0) + (1 - e) * RISE });
        }
        svg.setAttribute("viewBox", `${f2(vbX)} ${f2(vbY)} ${f2(vbW)} ${f2(vbH)}`);
        svg.innerHTML = notes.map(({ n, slot, op, y }) =>
          `<g transform="translate(0 ${f2(y)})" opacity="${f2(op)}">${Note(n, Math.round(slot), n === base + 1 || (n === base && inn === 0))}</g>`).join("");
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /* Wire up: hovering anywhere on a tile plays its illustration         */
  /* ------------------------------------------------------------------ */
  const MAKERS = { traders: TraderProfilesIso, history: NavHistoryIso, mcp: McpClaudeIso, alerts: WatchlistAlertsIso };
  document.querySelectorAll("[data-iso]").forEach(stage => {
    const make = MAKERS[stage.dataset.iso];
    if (!make) return;
    const ctl = make(stage);
    const tile = stage.closest(".unlock-tile") || stage;
    tile.addEventListener("mouseenter", () => ctl.setActive(true));
    tile.addEventListener("mouseleave", () => ctl.setActive(false));
    tile.addEventListener("focusin", () => ctl.setActive(true));
    tile.addEventListener("focusout", () => ctl.setActive(false));
  });
})();
