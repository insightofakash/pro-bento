import { memo, useEffect, useId, useRef, useState } from "react";

/**
 * Watchlist alerts: a floating stack of notifications; new ones fade up at the bottom.
 *
 * Self-contained: paste this file into your project and render <WatchlistAlertsIso />.
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

export default WatchlistAlertsIso;
