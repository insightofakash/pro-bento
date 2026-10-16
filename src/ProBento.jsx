import { memo, useEffect, useId, useRef, useState } from "react";
// each demo tile copies one self-contained file from the project root (one per illustration)
import traderSrc from "../TraderProfilesIso-2.jsx?raw";
import navSrc from "../NavHistoryIso.jsx?raw";
import mcpSrc from "../McpClaudeIso.jsx?raw";
import alertSrc from "../WatchlistAlertsIso.jsx?raw";

/**
 * Pro pricing bento: three isometric illustrations in one shared style.
 *
 *   <TraderProfilesIso />  the stack opens, then profiles stream forward on a loop
 *   <NavHistoryIso />      the locked older columns grow one by one, back to launch
 *   <WatchlistAlertsIso /> a floating stack of alerts: new ones fade up at the bottom, the oldest fades out at the top
 *   <McpClaudeIso />       a question is sent, the record row lights up, the two cards link up corner to
 *                          corner and the space between them glows faintly lime while the answer arrives
 *
 * Shared spec
 *   Cards     white face, 1.2 graphite edge, 10 radius, 4 deep, 10 inner padding
 *   Header    7.5 / 600 title, 5.6 muted subtitle, rule under the header
 *   Pills     12 tall, fully rounded, no border; lime = what Pro gives you
 *   Type      Inter, tabular numbers; key values are the darkest, labels muted
 *   Motion    anything that appears fades in while rising 6px (same duration, ease-out);
 *             nothing scales or overshoots
 *
 * Each illustration fills its parent, inside a well with an isometric dot grid.
 * Pass `active` from the tile so hovering anywhere on it plays the animation.
 *
 * Font: load Inter once in your app:
 *   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap" />
 * Also set -webkit-font-smoothing: antialiased, or text renders heavier on macOS.
 */

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const K = Math.cos(Math.PI / 6);
const TEXT = "#161616"; //   key values and titles
const EDGE = "#2B2B2A"; //   card outlines
const SIDE = "#55554F"; //   card thickness
const BODY = "#5E5E5B"; //   secondary text
const MUTED = "#9A9A96"; //  labels
const RULE = "#ECECEA";
const FILL = "#F4F4F2"; //   bubbles, wells
const BAR = "#E4E4E1";
const lime = "#C8F06A";
const limeDeep = "#9CC63C"; // dots and lines on lime
const R = 10; // card radius
const TH = 4; // card thickness
const PAD = 10; // inner padding
const RISE = 6; // px an element rises while fading in
const FONT = "'Inter', ui-sans-serif, system-ui, sans-serif";

const edge = { stroke: EDGE, strokeWidth: 1.2, strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" };
const fine = { stroke: EDGE, strokeWidth: 0.9, strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" };
const svgStyle = { display: "block", overflow: "visible", fontFamily: FONT, fontVariantNumeric: "tabular-nums" };

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const f2 = (n) => Math.round(n * 100) / 100;
const prefersReduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The one entrance: fade in while rising from just below. `p` is 0..1. */
function Rise({ p, children }) {
  const e = easeOut(clamp01(p));
  if (e <= 0.001) return null;
  return <g opacity={f2(e)} transform={`translate(0 ${f2((1 - e) * RISE)})`}>{children}</g>;
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

/** The well: soft floor shadow and an isometric dot grid that fades toward the edges. */
function Stage({ label, onHover, children }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const s = 14;
  const w = 2 * K * s;
  return (
    <div
      role="img"
      aria-label={label}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 220,
        borderRadius: 16,
        overflow: "hidden",
        background: "radial-gradient(46% 30% at 50% 66%, rgba(10,10,10,0.06), rgba(10,10,10,0) 72%), #F4F4F3",
      }}
    >
      <svg aria-hidden="true" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id={`${id}p`} width={w} height={s} patternUnits="userSpaceOnUse">
            {[[0, 0], [w, 0], [0, s], [w, s], [w / 2, s / 2]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.05" fill="#C8C8C5" />
            ))}
          </pattern>
          <radialGradient id={`${id}g`} cx="50%" cy="55%" r="62%">
            <stop offset="0.35" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={`${id}m`}>
            <rect width="100%" height="100%" fill={`url(#${id}g)`} />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}p)`} mask={`url(#${id}m)`} />
      </svg>
      <div style={{ position: "absolute", inset: 16 }}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout grid, in card units                                          */
/*   PAD 10  card edge to content                                      */
/*   GAP 8   between stacked blocks (header rule, bubbles, pills)      */
/*   PILL 12 every pill and every header row is 12 tall                */
/* ------------------------------------------------------------------ */

const GAP = 8;
const PILL = 12;
const PILL_GAP = 4; // between pills in a row
const RULE_Y = PAD + PILL + GAP; // 30: the rule under every card header

/* Projections. Cards use true isometric; the MCP pair uses a flatter angle so its text reads easily. */
const ISO = { k: K, s: 0.5 };
const FLAT = { k: Math.cos((22 * Math.PI) / 180), s: Math.sin((22 * Math.PI) / 180) };
const planeM = (p, e = 0) => `matrix(${f2(p.k)} ${f2(p.s)} 0 1 ${f2(p.k * e)} ${f2(-p.s * e)})`;

/* Upright card facing front-left; origin is its top-left corner. */
function Card({ w, h, fill = "#fff", proj = ISO, children }) {
  return (
    <g>
      {[4, 3, 2, 1].map((e) => <rect key={e} width={w} height={h} rx={R} fill={SIDE} {...edge} transform={planeM(proj, e)} />)}
      <rect width={w} height={h} rx={R} fill={fill} {...edge} transform={planeM(proj)} />
      <g transform={planeM(proj)}>{children}</g>
    </g>
  );
}

/** One pill style everywhere: 12 tall, fully rounded, no border. `on` fades from locked (dashed) to lime. */
function Pill({ x, y, w, label, on = 1 }) {
  return (
    <g>
      {on < 1 && <rect x={x + 0.35} y={y + 0.35} width={w - 0.7} height={PILL - 0.7} rx={(PILL - 0.7) / 2} fill="none" stroke="#C4C4C0" strokeWidth="0.6" strokeDasharray="1.4 1.4" />}
      <rect x={x} y={y} width={w} height={PILL} rx={PILL / 2} fill={lime} opacity={f2(on)} />
      <text x={x + w / 2} y={y + 8.1} fontSize="6" fontWeight="600" textAnchor="middle" fill={on > 0.5 ? TEXT : MUTED}>{label}</text>
    </g>
  );
}

/** Title left, optional pill right (both centred on the same line), rule GAP below. */
function CardHeader({ w, title, pill }) {
  return (
    <g>
      <text x={PAD} y={PAD + 8.7} fontSize="7.5" fontWeight="600" fill={TEXT}>{title}</text>
      {pill && <Pill x={w - PAD - pill.w} y={PAD} w={pill.w} label={pill.label} />}
      <line x1={PAD} x2={w - PAD} y1={RULE_Y} y2={RULE_Y} stroke={RULE} strokeWidth="0.7" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Unlimited trader profiles                                        */
/* Rest: a compact stack; the front card shows a full profile.         */
/* Hover: the stack opens so every header shows, then profiles stream  */
/* forward on a loop: the front card slides forward and fades, a new   */
/* one fades in at the back. Leave and it settles on a whole card.     */
/* ------------------------------------------------------------------ */

// card layout: header row 16 tall (avatar), rule, chart 22 tall, stats
const T_HEAD = 16;
const T_RULE = PAD + T_HEAD + GAP; //       34
const T_CHART = T_RULE + GAP; //            42
const T_CHART_H = 22; //                    to 64
const T_LABEL = T_CHART + T_CHART_H + GAP + 4; // 78 baseline, 4 = cap height
const T_VALUE = T_LABEL + 10; //            88 baseline
const WC = 128, HC = T_VALUE + PAD; //      98 (wide enough to keep a GAP between handle and pill)
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
const hex3 = (r) => Math.floor(r() * 4096).toString(16).padStart(3, "0");

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
    spark: raw.map((x) => (x - lo) / (hi - lo || 1)),
  };
});
const AVATARS = [{ bg: lime, fg: TEXT }, { bg: "#3A3A38", fg: "#fff" }, { bg: "#ECECEA", fg: "#55554F" }];

function Avatar({ cx, cy, v }) {
  const c = AVATARS[v];
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={T_HEAD / 2} fill={c.bg} />
      <circle cy="-1.9" r="2.8" fill={c.fg} />
      <path d="M-4.8 5.4Q-4.8 1.8 0 1.8Q4.8 1.8 4.8 5.4Z" fill={c.fg} />
    </g>
  );
}

// the strip a stacked card shows above the one in front of it
const TraderHeader = memo(function TraderHeader({ t }) {
  const mid = PAD + T_HEAD / 2; // 18: avatar, text block and pill share this centre
  return (
    <g>
      <Avatar cx={PAD + T_HEAD / 2} cy={mid} v={t.v} />
      <text x={PAD + T_HEAD + GAP} y={mid - 1} fontSize="7.5" fontWeight="600" fill={TEXT}>{t.handle}</text>
      <text x={PAD + T_HEAD + GAP} y={mid + 7} fontSize="5.6" fill={MUTED}>30D return</text>
      <Pill x={WC - PAD - 32} y={mid - PILL / 2} w={32} label={t.pnl} />
    </g>
  );
});

const TraderBody = memo(function TraderBody({ t }) {
  const x0 = PAD, w = WC - PAD * 2, y0 = T_CHART, h = T_CHART_H;
  const pts = t.spark.map((v, i) => [x0 + (i * w) / (t.spark.length - 1), y0 + (1 - v) * h]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const area = `${line}L${x0 + w} ${y0 + h}L${x0} ${y0 + h}Z`;
  const last = pts[pts.length - 1];
  const col = w / 3;
  return (
    <g>
      <line x1={PAD} x2={WC - PAD} y1={T_RULE} y2={T_RULE} stroke={RULE} strokeWidth="0.7" />
      <line x1={x0} x2={x0 + w} y1={y0 + h} y2={y0 + h} stroke={RULE} strokeWidth="0.7" />
      <path d={area} fill={lime} opacity="0.45" />
      <path d={line} fill="none" stroke={TEXT} strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.3" fill={limeDeep} />
      {[["Trades", t.trades], ["Win rate", t.win], ["Held", t.held]].map(([label, value], k) => (
        <g key={label}>
          <text x={x0 + k * col} y={T_LABEL} fontSize="5.6" fill={MUTED}>{label}</text>
          <text x={x0 + k * col} y={T_VALUE} fontSize="8" fontWeight="600" fill={TEXT}>{value}</text>
        </g>
      ))}
    </g>
  );
});

export function TraderProfilesIso({ active }) {
  const [hovered, setHovered] = useState(false);
  const on = active ?? hovered;
  const sim = useRef({ h: 0, hv: 0, off: 0, ov: 0, snap: 0 });
  const [f, setF] = useState({ h: 0, off: 0 });

  useEffect(() => {
    const s = sim.current;
    const reduced = prefersReduced();
    const target = on ? 1 : 0;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      // spacing: critically damped, so the stack opens smoothly with no overshoot
      if (reduced) { s.h = target; s.hv = 0; } else { s.hv += (120 * (target - s.h) - 22 * s.hv) * dt; s.h += s.hv * dt; }
      if (on && !reduced) {
        s.ov += (SPEED - s.ov) * (1 - Math.exp(-dt * 2.5));
        s.off += s.ov * dt;
        s.snap = Math.ceil(s.off);
      } else {
        // glide on to the next whole card, then stop
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
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  const { h, off } = f;
  const hc = clamp01(h);
  const spacing = S0 + (S1 - S0) * h;
  const recentre = (S1 - S0) * FADE_B * 0.5 * (1 - h); // keeps the stack centred as it opens

  const cards = [];
  for (let i = 0; i < N; i++) {
    const k = Math.floor((i - off + 1) / N);
    const q = i - off - N * k; // depth: 0 = front, <0 = leaving
    const op = q < 0 ? 1 + q : q > FADE_A ? Math.max(0, (FADE_B - q) / (FADE_B - FADE_A)) : 1;
    if (op > 0.01) cards.push({ i, q, id: i - N * k, op });
  }
  cards.sort((a, b) => b.q - a.q);

  // frame the stack tightly: from the card leaving at the front to the last one fading at the back
  const DMAX = (FADE_B - 0.6) * S1, DMIN = -0.5 * S1, pad = 4;
  const vbX = K * DMIN - pad;
  const vbY = -0.5 * DMAX - TH - pad;
  const vbW = K * WC + K * (DMAX - DMIN) + K * TH + pad * 2;
  const vbH = 0.5 * WC + HC - 0.5 * DMIN + 0.5 * DMAX + TH + pad * 2;

  return (
    <Stage label="Isometric stack of trader profile cards" onHover={setHovered}>
      <svg viewBox={`${f2(vbX)} ${f2(vbY)} ${f2(vbW)} ${f2(vbH)}`} width="100%" height="100%" aria-hidden="true" style={svgStyle}>
        {cards.map(({ i, q, id, op }) => {
          const t = TRADERS[((id % 12) + 12) % 12];
          const d = q * spacing + recentre; // the front card slides forward and fades as it leaves
          const shade = 255 - Math.round(Math.min(Math.max(q, 0), 4) * 3);
          const hdr = q <= 0 ? 1 : q < 1 ? 1 - (1 - hc) * q : hc;
          const body = q < 1 ? 1 - Math.max(q, 0) : 0;
          return (
            <g key={i} transform={`translate(${f2(K * d)} ${f2(-0.5 * d)})`} opacity={f2(op)}>
              <Card w={WC} h={HC} fill={`rgb(${shade},${shade},${Math.max(0, shade - 1)})`}>
                {hdr > 0.01 && <g opacity={f2(hdr)}><TraderHeader t={t} /></g>}
                {body > 0.01 && <g opacity={f2(body)}><TraderBody t={t} /></g>}
              </Card>
            </g>
          );
        })}
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Full NAV/AS history                                              */
/* A plate with a column per period, launch at the left, now at the    */
/* right. The recent public columns are always there; on hover the     */
/* locked older ones grow one after another back to launch, 3M and All */
/* unlock, and the row keeps a gentle wave going while you stay.       */
/* ------------------------------------------------------------------ */

// plate layout (local x = time from launch, local y = depth):
//   columns row PAD..PAD+CW, rule PAD below it, pill row PAD below the rule, PAD to the edge
const LT = 184;
const NC = 10, PUB = 4, NPRO = NC - PUB;
const CW = 8;
const STEP = (LT - 2 * PAD - CW) / (NC - 1); // first column starts at PAD, last ends at LT - PAD
const N_RULE = PAD + CW + PAD; //   28
const N_PILLS = N_RULE + PAD; //    38
const DC = N_PILLS + PILL + PAD; // 60
const MAXD = 0.9;
const HEIGHTS = Array.from({ length: NC }, (_, j) => {
  const wob = [0, 4, -2, 5, -1, 4, -2, 3, -1, 0][j];
  return Math.round(14 + 54 * Math.pow(j / (NC - 1), 1.25) + wob);
});
const colX = (j) => PAD + j * STEP; // left edge of column j on the plate, j = 0 is launch
const P = (u, v, z = 0) => [(u - v) * K, (u + v) / 2 - z];
const pts = (ps) => ps.map((p) => `${f2(p[0])},${f2(p[1])}`).join(" ");
// plate top plane: local (x, y) -> world (u = y, v = LT - x)
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

// one pill row, right-aligned to the columns: 1D 1W 1M are public, 3M and All come with Pro
const RANGES = ["1D", "1W", "1M", "3M", "All"];
const RANGE_W = 20;
const rangeX = (k) => LT - PAD - (RANGES.length - k) * RANGE_W - (RANGES.length - 1 - k) * PILL_GAP;

const NAV_PLATE = (
  <g>
    {[4, 3, 2, 1].map((k) => (
      <rect key={k} x="0" y="0" width={LT} height={DC} rx={R} fill={SIDE} {...edge} transform={TOP(k)} />
    ))}
    <rect x="0" y="0" width={LT} height={DC} rx={R} fill="#fff" {...edge} transform={TOP()} />
    <g transform={TOP()}>
      <line x1={PAD} x2={LT - PAD} y1={N_RULE} y2={N_RULE} stroke={RULE} strokeWidth="0.7" />
      {RANGES.slice(0, 3).map((r, k) => <Pill key={r} x={rangeX(k)} y={N_PILLS} w={RANGE_W} label={r} />)}
    </g>
  </g>
);

export function NavHistoryIso({ active }) {
  const [hovered, setHovered] = useState(false);
  const on = active ?? hovered;
  const sim = useRef({ t: 0, time: 0 });
  const [f, setF] = useState({ t: 0, time: 0 });

  useEffect(() => {
    const s = sim.current;
    const reduced = prefersReduced();
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      s.time += dt;
      s.t = reduced ? (on ? 1 : 0) : clamp01(s.t + (on ? dt / 1.6 : -dt / 0.7));
      setF({ t: s.t, time: s.time });
      if (reduced || (!on && s.t === 0)) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  const { t, time } = f;
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

  const pad = 4;
  const vbX = -K * LT - pad, vbW = K * DC + K * LT + pad * 2;
  const vbY = -(HEIGHTS[NC - 1] * 1.04) - pad, vbH = (DC + LT) / 2 + TH + pad + -vbY;

  return (
    <Stage label="Isometric column chart that extends back to launch" onHover={setHovered}>
      <svg viewBox={`${f2(vbX)} ${f2(vbY)} ${f2(vbW)} ${f2(vbH)}`} width="100%" height="100%" aria-hidden="true" style={svgStyle}>
        {NAV_PLATE}
        <g transform={TOP()}>
          {RANGES.slice(3).map((r, k) => <Pill key={r} x={rangeX(k + 3)} y={N_PILLS} w={RANGE_W} label={r} on={pr} />)}
          <Rise p={pr}>
            <text x={PAD} y={N_PILLS + 8.1} fontSize="6" fontWeight="500" fill={BODY}>Launch</text>
          </Rise>
          {cols.filter((c) => c.isPro && c.lp < 1).map((c) => (
            <rect key={c.j} x={colX(c.j) + 0.3} y={PAD + 0.3} width={CW - 0.6} height={CW - 0.6} rx="1.5" fill="none" stroke="#C4C4C0" strokeWidth="0.6" strokeDasharray="1.4 1.4" opacity={f2(1 - c.lp)} />
          ))}
        </g>
        {cols.map((c) => {
          if (c.h < 0.6) return null;
          const b = column(c.j, c.h);
          const sh = c.isPro ? SHADES.pro : c.j === NC - 1 ? SHADES.now : SHADES.pub;
          return (
            <g key={c.j}>
              <polygon points={b.left} fill={sh.left} {...fine} />
              <polygon points={b.right} fill={sh.right} {...fine} />
              <polygon points={b.top} fill={sh.top} {...fine} />
            </g>
          );
        })}
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* 3. 01R MCP in Claude                                                */
/* A chat card in front, the listing record behind it, at a flatter    */
/* angle so the text reads easily. On hover the question fades up, the */
/* matching row lights up, the cards link corner to corner and the    */
/* the answer fades up. Loops while hovered.                           */
/* ------------------------------------------------------------------ */

const MP = FLAT;
// chat card in front, listing record set back behind it to the right.
// Both are the same size and face the same way (parallel planes, one projection).
const MW = 120; //        card width
const DEPTH = MW + 4 * GAP; // how far back the record sits: clear of the chat card, with room for the link
const BACK = [MP.k * DEPTH, -MP.s * DEPTH]; // screen offset of the record
// chat: question, answer bubble, source pill, GAP apart
const Q_Y = RULE_Y + GAP, Q_H = 16;
const A_Y = Q_Y + Q_H + GAP, A_H = 34;
const S_Y = A_Y + A_H + GAP;
const MH = S_Y + PILL + PAD; // card height, shared by both cards
// record: four rows filling the same height under the header rule
const ROW_INSET = 3; // highlight band inset inside its row
const ROW_H = (MH - PAD - RULE_Y + ROW_INSET) / 4;
const ROWS = [["Spot price", "$0.0412"], ["NAV/AS", "$0.0430"], ["Discount", "−4.2%"], ["Holders", "1,284"]];
const LIT = 2;
// the link: each of the chat card's four corners joins the same corner on the record, making a box.
// Corners are taken on the rounded arc (45° point) so the lines meet the outline exactly.
const CI = R * (1 - Math.SQRT1_2);
const onPlane = ([x, y]) => [MP.k * x, MP.s * x + y];
const FRONT = [[CI, CI], [MW - CI, CI], [MW - CI, MH - CI], [CI, MH - CI]].map(onPlane);
const REAR = FRONT.map(([x, y]) => [x + BACK[0], y + BACK[1]]);
// the box's outline as seen from here: front TL, rear TL, rear TR, rear BR, front BR, front BL
const HULL = [FRONT[0], REAR[0], REAR[1], REAR[2], FRONT[2], FRONT[3]];
const HULL_PTS = HULL.map((p) => `${f2(p[0])},${f2(p[1])}`).join(" ");

export function McpClaudeIso({ active }) {
  const [hovered, setHovered] = useState(false);
  const on = active ?? hovered;
  const sim = useRef({ t: 1, time: 0, mode: "idle", hold: 0, clear: 0, c: 0, armed: false });
  const [f, setF] = useState({ t: 1, time: 0, clear: 0, c: 0, armed: false });

  useEffect(() => {
    const s = sim.current;
    const reduced = prefersReduced();
    // on hover, the answered conversation clears first; the connection is only armed once a new question plays,
    // so the resting state's link never flashes in while it clears
    if (on && !reduced && s.mode === "idle") { s.mode = "clear"; s.armed = false; }
    if (!on && s.mode !== "idle") s.mode = s.t < 1 ? "finish" : "idle";
    if (reduced) { s.t = 1; s.c = on ? 1 : 0; s.armed = on; setF({ t: 1, time: s.time, clear: 0, c: s.c, armed: s.armed }); return undefined; }
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      s.time += dt;
      s.c = clamp01(s.c + (on ? dt : -dt) / 0.35); // the connection only exists while hovered
      // clear: the finished conversation fades away, then the next one plays
      if (s.mode === "clear") { s.clear += dt / 0.45; if (s.clear >= 1) { s.clear = 0; s.t = 0; s.mode = "play"; s.armed = true; } }
      else if (s.mode === "play") { s.t += dt / 4; if (s.t >= 1) { s.t = 1; s.mode = "hold"; s.hold = 0; } }
      else if (s.mode === "hold") { s.hold += dt; if (s.hold > 1.8) s.mode = "clear"; }
      else if (s.mode === "finish") {
        s.clear = 0; s.t += dt / 0.6;
        if (s.t >= 1) { s.t = 1; s.mode = on ? "clear" : "idle"; if (on) s.armed = false; } // hovered again mid-finish: start over
      }
      setF({ t: s.t, time: s.time, clear: s.mode === "clear" ? s.clear : 0, c: s.c, armed: s.armed });
      if (s.mode === "idle" && s.c === (on ? 1 : 0)) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  const { t, time, clear, c, armed } = f;
  const keep = 1 - easeOut(clear);
  const ask = seg(t, 0.02, 0.16);
  const thinking = seg(t, 0.16, 0.22) * (1 - seg(t, 0.4, 0.46));
  const hl = easeInOut(seg(t, 0.2, 0.36));
  const link = easeInOut(seg(t, 0.3, 0.5)); //   the four lines draw from the record to the chat card
  const glow = easeInOut(seg(t, 0.46, 0.66)); // then the box fills, very faintly
  const a1 = seg(t, 0.62, 0.76);
  const a2 = seg(t, 0.7, 0.84);
  const src = seg(t, 0.78, 0.92);

  const breathe = 0.5 + 0.5 * Math.sin(time * 1.6); // slow, small pulse while the box is lit
  const linkOp = armed ? keep * c : 0; // fades out with the conversation, and whenever the hover ends
  const glowOp = glow * linkOp * (0.1 + 0.05 * breathe);

  const pad = 4;
  const vbX = -pad, vbY = BACK[1] - MP.s * TH - pad;
  const vbW = BACK[0] + MP.k * (MW + TH) + pad * 2, vbH = MP.s * MW + MH - vbY + pad;
  const qW = 72;

  return (
    <Stage label="Claude answering a question about a listing from its record" onHover={setHovered}>
      <svg viewBox={`${f2(vbX)} ${f2(vbY)} ${f2(vbW)} ${f2(vbH)}`} width="100%" height="100%" aria-hidden="true" style={svgStyle}>

        {/* listing record, set back */}
        <g transform={`translate(${f2(BACK[0])} ${f2(BACK[1])})`}>
        <Card w={MW} h={MH} proj={MP}>
          <CardHeader w={MW} title="01R listing" />
          {ROWS.map(([k, v], i) => {
            const y = RULE_Y + i * ROW_H;
            const lit = i === LIT ? hl * keep : 0;
            return (
              <g key={k}>
                {lit > 0.01 && <rect x={PAD - 4} y={f2(y + ROW_INSET)} width={f2((MW - 2 * PAD + 8) * lit)} height={f2(ROW_H - 2 * ROW_INSET)} rx="7" fill={lime} />}
                <text x={PAD} y={f2(y + ROW_H / 2 + 2.2)} fontSize="6.2" fill={lit > 0.5 ? TEXT : BODY}>{k}</text>
                <text x={MW - PAD} y={f2(y + ROW_H / 2 + 2.6)} fontSize="7.5" fontWeight="600" textAnchor="end" fill={TEXT}>{v}</text>
                {i < ROWS.length - 1 && <line x1={PAD} x2={MW - PAD} y1={f2(y + ROW_H)} y2={f2(y + ROW_H)} stroke={RULE} strokeWidth="0.6" />}
              </g>
            );
          })}
        </Card>
        </g>

        {/* the box between the cards: its faint lime fill and four edges sit in front of the record and behind the chat card */}
        <g opacity={f2(linkOp)}>
          {glowOp > 0.002 && <polygon points={HULL_PTS} fill={lime} opacity={f2(glow * (0.1 + 0.05 * breathe))} />}
          {link > 0 && REAR.map((r, i) => {
            const fr = FRONT[i];
            return (
              <line key={i} x1={f2(r[0])} y1={f2(r[1])} x2={f2(r[0] + (fr[0] - r[0]) * link)} y2={f2(r[1] + (fr[1] - r[1]) * link)} stroke={BODY} strokeWidth="1" strokeDasharray="2.5 2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            );
          })}
          {link > 0 && REAR.map((r, i) => <circle key={`r${i}`} cx={f2(r[0])} cy={f2(r[1])} r="2.2" fill={TEXT} opacity={f2(seg(link, 0, 0.15))} />)}
        </g>

        {/* chat card, in front, same size and orientation */}
        <g>
          <Card w={MW} h={MH} proj={MP}>
            <CardHeader w={MW} title="01R MCP" pill={{ w: 24, label: "Pro" }} />
            <g opacity={f2(keep)}>
              <Rise p={ask}>
                <rect x={MW - PAD - qW} y={Q_Y} width={qW} height={Q_H} rx={Q_H / 2} fill="#2E2E2C" />
                <text x={MW - PAD - qW / 2} y={Q_Y + 10.4} fontSize="6.2" textAnchor="middle" fill="#fff">Why the discount?</text>
              </Rise>
              <Rise p={Math.max(seg(t, 0.16, 0.24), a1)}>
                <rect x={PAD} y={A_Y} width={MW - 2 * PAD} height={A_H} rx="9" fill={FILL} />
              </Rise>
              <g opacity={f2(thinking)}>
                {[0, 1, 2].map((k) => (
                  <circle key={k} cx={PAD + GAP + 2 + k * 7} cy={f2(A_Y + A_H / 2 - 1.6 * Math.max(0, Math.sin(time * 8 - k * 0.9)))} r="1.9" fill={MUTED} />
                ))}
              </g>
              <Rise p={a1}>
                <text x={PAD + GAP} y={A_Y + 14} fontSize="7" fontWeight="600" fill={TEXT}>4.2% below NAV/AS.</text>
              </Rise>
              <Rise p={a2}>
                <text x={PAD + GAP} y={A_Y + 25} fontSize="6.2" fill={BODY}>Holders up 12% in 7d.</text>
              </Rise>
              <Rise p={src}>
                <Pill x={PAD} y={S_Y} w={60} label="From 01R record" />
              </Rise>
            </g>
          </Card>
        </g>

        {/* black end points on the chat card's corners, appearing as each line lands */}
        <g opacity={f2(linkOp)}>
          {link > 0.9 && FRONT.map((fr, i) => <circle key={`f${i}`} cx={f2(fr[0])} cy={f2(fr[1])} r="2.2" fill={TEXT} opacity={f2(seg(link, 0.9, 1))} />)}
        </g>
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Watchlist alerts                                                 */
/* A floating stack of notifications, no container card, at the same  */
/* flatter angle as the MCP pair so the text reads. On hover new       */
/* alerts keep arriving, one step at a time and never overlapping:     */
/* the oldest fades out at the top, the stack moves up one slot, then  */
/* the new alert fades up into the empty bottom slot, then a pause.    */
/* Leave and it settles on a full stack.                               */
/* ------------------------------------------------------------------ */

const NW = 184, NH = 38; // a notification banner
const N_SLOTS = 3;
const N_PITCH = NH + GAP + 4; // 12 between banners: they float, so they get a little more air than blocks inside a card
const N_ICON = 18;
const N_SPEED = 0.45; //  alerts per second while hovered
// each step, as shares of the step: oldest fades out, stack moves up, new one fades in, pause
const N_OUT = 0.22, N_UP = 0.52, N_IN = 0.78;
const NP = FLAT;
const N_KINDS = [
  { title: "Token structure", detail: "HYPE-L supply cap raised to 12M", time: "now", icon: "layers" },
  { title: "NAV/AS", detail: "HYPE-L discount widened to −6.1%", time: "now", icon: "bars" },
  { title: "Largest holder", detail: "0x4e…a1 sold 8% of their HYPE-L", time: "now", icon: "holder" },
];
const AGES = ["now", "4m", "12m"];

function NoteIcon({ kind, fresh }) {
  const bg = fresh ? lime : "#ECECEA";
  const fg = fresh ? TEXT : "#6A6A66";
  const c = N_ICON / 2;
  return (
    <g transform={`translate(${PAD} ${(NH - N_ICON) / 2})`}>
      <circle cx={c} cy={c} r={c} fill={bg} />
      {kind === "layers" && [0, 1, 2].map((k) => <rect key={k} x={c - 4.5} y={c - 4 + k * 3} width="9" height="2" rx="1" fill={fg} />)}
      {kind === "bars" && (
        <g fill={fg}>
          <rect x={c - 4} y={c - 4} width="3" height="8" rx="1" />
          <rect x={c + 1} y={c - 1} width="3" height="5" rx="1" />
        </g>
      )}
      {kind === "holder" && (
        <g fill={fg}>
          <circle cx={c} cy={c - 1.8} r="2.4" />
          <path d={`M${c - 4.2} ${c + 4.6}Q${c - 4.2} ${c + 1.2} ${c} ${c + 1.2}Q${c + 4.2} ${c + 1.2} ${c + 4.2} ${c + 4.6}Z`} />
        </g>
      )}
    </g>
  );
}

const Note = memo(function Note({ n, slot, fresh }) {
  const k = N_KINDS[((n % 3) + 3) % 3];
  const tx = PAD + N_ICON + GAP;
  return (
    <Card w={NW} h={NH} proj={NP}>
      <NoteIcon kind={k.icon} fresh={fresh} />
      <text x={tx} y="16" fontSize="7" fontWeight="600" fill={TEXT}>{k.title}</text>
      <text x={tx} y="26" fontSize="5.9" fill={BODY}>{k.detail}</text>
      <text x={NW - PAD} y="16" fontSize="5.6" textAnchor="end" fill={MUTED}>{AGES[slot] || ""}</text>
    </Card>
  );
});

export function WatchlistAlertsIso({ active }) {
  const [hovered, setHovered] = useState(false);
  const on = active ?? hovered;
  const sim = useRef({ off: 3, ov: 0, snap: 3 });
  const [off, setOff] = useState(3);

  useEffect(() => {
    const s = sim.current;
    if (prefersReduced()) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (on) {
        s.ov += (N_SPEED - s.ov) * (1 - Math.exp(-dt * 4));
        s.off += s.ov * dt;
        s.snap = Math.ceil(s.off);
      } else {
        // finish the alert that is arriving, then stop on a full stack
        s.ov += (40 * (s.snap - s.off) - 12.6 * s.ov) * dt;
        s.off += s.ov * dt;
        if (Math.abs(s.snap - s.off) < 0.002 && Math.abs(s.ov) < 0.02) { s.off = s.snap; s.ov = 0; setOff(s.off); return; }
      }
      setOff(s.off);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  // settled: alerts base, base-1, base-2 sit in slots 0 (bottom, newest), 1 and 2
  const base = Math.floor(off);
  const ph = off - base;
  const out = seg(ph, 0, N_OUT); //            the top alert fades out where it is
  const up = easeInOut(seg(ph, N_OUT, N_UP)); // then the stack moves up one slot
  const inn = seg(ph, N_UP, N_IN); //           then the new alert fades up into the empty bottom slot
  const slotY = (slot) => -slot * N_PITCH;

  const notes = [];
  if (out < 1) notes.push({ n: base - 2, slot: 2, op: 1 - out, y: slotY(2) });
  notes.push({ n: base - 1, slot: 1 + up, op: 1, y: slotY(1 + up) });
  notes.push({ n: base, slot: up, op: 1, y: slotY(up) });
  if (inn > 0) {
    const e = easeOut(inn);
    notes.push({ n: base + 1, slot: 0, op: e, y: slotY(0) + (1 - e) * RISE });
  }

  const pad = 4;
  const top = slotY(2) - NP.s * TH;
  const bottom = NP.s * NW + NH + RISE;
  const vbX = -pad, vbY = top - pad;
  const vbW = NP.k * (NW + TH) + pad * 2, vbH = bottom - top + pad * 2;

  return (
    <Stage label="A stack of watchlist notifications, new alerts arriving at the bottom" onHover={setHovered}>
      <svg viewBox={`${f2(vbX)} ${f2(vbY)} ${f2(vbW)} ${f2(vbH)}`} width="100%" height="100%" aria-hidden="true" style={svgStyle}>
        {/* soft shadow on the floor under the floating stack */}
        {notes.map(({ n, slot, op, y }) => (
          <g key={n} transform={`translate(0 ${f2(y)})`} opacity={f2(op)}>
            <Note n={n} slot={Math.round(slot)} fresh={n === base + 1 || (n === base && inn === 0)} />
          </g>
        ))}
      </svg>
    </Stage>
  );
}

/* ------------------------------------------------------------------ */
/* Demo bento: an even 2 × 2 grid. Hover or focus a tile to play it.    */
/* ------------------------------------------------------------------ */

/* The demo tiles copy these files' contents: one self-contained file per
   illustration, each with its own React import and every shared piece it
   uses. Point a tile at a different file by changing its entry here. */
const SOURCE = {
  TraderProfilesIso: traderSrc,
  NavHistoryIso: navSrc,
  McpClaudeIso: mcpSrc,
  WatchlistAlertsIso: alertSrc,
};

function CopyButton({ name }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    const text = SOURCE[name] ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-1000px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button className="pb-copy" type="button" onClick={onCopy} aria-label={`Copy ${name}.jsx`}>
      {done ? "Copied" : "Copy JSX"}
    </button>
  );
}

function Tile({ title, body, copy, children }) {
  const [active, setActive] = useState(false);
  return (
    <div
      className="pb-tile"
      tabIndex={0}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <CopyButton name={copy} />
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="pb-well">{children(active)}</div>
    </div>
  );
}

export default function ProBento() {
  return (
    <div className="pb">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap');
        .pb{min-height:100vh;background:#EFEFEE;padding:48px 24px;box-sizing:border-box;font-family:${FONT};color:${TEXT};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        .pb-grid{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:16px;max-width:1240px;margin:0 auto}
        .pb-tile{position:relative;background:#fff;border-radius:20px;padding:32px;display:flex;flex-direction:column;outline:none;box-sizing:border-box}
        .pb-tile:focus-visible{box-shadow:0 0 0 2px #EFEFEE,0 0 0 4px ${TEXT}}
        .pb-copy{position:absolute;top:26px;right:26px;height:30px;padding:0 13px;border:1px solid #E4E4E1;border-radius:999px;background:#fff;color:#6E6E6C;font:inherit;font-size:12.5px;font-weight:500;line-height:1;cursor:pointer;transition:background .15s ease,color .15s ease,border-color .15s ease}
        .pb-copy:hover{background:#F4F4F2;color:${TEXT};border-color:#C8C8C5}
        .pb-copy:focus-visible{outline:none;box-shadow:0 0 0 2px #fff,0 0 0 4px ${TEXT}}
        .pb-tile h3{margin:0;font-size:22px;font-weight:560;letter-spacing:-0.012em;line-height:1.2}
        .pb-tile p{margin:8px 0 0;font-size:15.5px;line-height:1.55;color:#6E6E6C;min-height:calc(1.55em * 2)}
        .pb-well{flex:none;display:grid;margin-top:24px;height:380px}
        @media (max-width:860px){.pb-grid{grid-template-columns:1fr}}
      `}</style>
      <div className="pb-grid">
        <Tile copy="TraderProfilesIso" title="Unlimited trader profiles" body="Every wallet in Holders and Contributors opens into a full Trader Details page. Free accounts preview one; Pro opens all of them.">
          {(a) => <TraderProfilesIso active={a} />}
        </Tile>
        <Tile copy="NavHistoryIso" title="Full NAV/AS history" body="The public chart opens at 1D, 1W and 1M. Pro unlocks 3M and All, back to launch.">
          {(a) => <NavHistoryIso active={a} />}
        </Tile>
        <Tile copy="McpClaudeIso" title="01R MCP in Claude" body="Ask about any listing in plain language. Claude answers from the same record as this page, with your Pro access.">
          {(a) => <McpClaudeIso active={a} />}
        </Tile>
        <Tile copy="WatchlistAlertsIso" title="Watchlist alerts" body="Know when what you own changes: the token's structure, its NAV/AS, and what its largest holders are doing.">
          {(a) => <WatchlistAlertsIso active={a} />}
        </Tile>
      </div>
    </div>
  );
}
