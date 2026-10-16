import { memo, useEffect, useId, useRef, useState } from "react";

/**
 * 01R MCP in Claude: a question, the record row lights up, the cards link and the answer arrives.
 *
 * Self-contained: paste this file into your project and render <McpClaudeIso />.
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

export default McpClaudeIso;
