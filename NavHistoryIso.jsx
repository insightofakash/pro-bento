import { memo, useEffect, useId, useRef, useState } from "react";

/**
 * Full NAV/AS history: the locked older columns grow back to launch, 3M and All unlock.
 *
 * Self-contained: paste this file into your project and render <NavHistoryIso />.
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

export default NavHistoryIso;
