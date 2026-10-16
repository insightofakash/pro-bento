import { memo, useEffect, useId, useRef, useState } from "react";

/**
 * Unlimited trader profiles: the stack opens, then profiles stream forward on a loop.
 *
 * Self-contained: paste this file into your project and render <TraderProfilesIso />.
 * It fills its parent, so give the parent a size (e.g. height: 380px).
 * Pass `active` from the surrounding tile so hovering anywhere on the tile plays it;
 * leave it out and the illustration reacts to its own hover.
 *
 * Font: Inter. Load it once in your app:
 *   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&display=swap" />
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

export default TraderProfilesIso;
