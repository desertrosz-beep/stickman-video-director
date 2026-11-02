// Hand-drawn B2 drawing kit for "Seat No. 21": wobbly ink, muted colour fills,
// pencil grain and a parametric stick-figure rig. All coordinates are in the
// 1280x720 design plane (or sprite-local design units); `S` is pixel scale.
import fs from 'node:fs';
import path from 'node:path';
import {createCanvas} from './canvas.mjs';

export const S = 1.5; // 1280-wide design plane -> 1920 px
export const C = {
  paper: '#f4f0e5', ink: '#3a3830', inkSoft: 'rgba(58,56,48,.45)',
  sand: '#dcc8a6', sandDark: '#c7ae86', wood: '#8a6446', woodDark: '#5e4430',
  blue: '#56738f', blueDark: '#3e566e', blueLight: '#a9bccb', sky: '#c9d6dc',
  teal: '#6f948f', tealDark: '#557570', sage: '#9aae8c', sageDark: '#7a8f6e',
  rust: '#c26a4a', rustDark: '#9c4f36', mustard: '#d9a63a', scarf: '#e9b730',
  navy: '#2f3f5f', navyLight: '#46597c', cream: '#efe6cf', grey: '#a7a69b',
  greyDark: '#7d7c72', maroon: '#8e4048', maroonDark: '#6c2e36', pink: '#e7a9a4',
  blossom: '#efb9be', night: '#26324a', nightDeep: '#1b2438', lamp: '#f3d58c',
  peach: '#f0c9a6', white: '#fbf8ef', glass: '#b9cdd6',
};

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function canvas(w, h, scale = S) {
  const cv = createCanvas(Math.round(w * scale), Math.round(h * scale));
  const ctx = cv.getContext('2d');
  ctx.scale(scale, scale);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  return {cv, ctx, w, h, scale};
}
export function save(cv, file) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, cv.toBuffer('image/png'));
}

// ---------- wobbly geometry ----------
function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]);
  }
  return out;
}
export function wobble(pts, r, amp = 1.2, step = 10, closed = false) {
  const p = resample(closed ? [...pts, pts[0]] : pts, step);
  const ph1 = r() * 6.28, ph2 = r() * 6.28, f1 = 0.02 + r() * 0.02, f2 = 0.07 + r() * 0.05;
  let dist = 0;
  return p.map((pt, i) => {
    if (i) dist += Math.hypot(pt[0] - p[i - 1][0], pt[1] - p[i - 1][1]);
    const prev = p[Math.max(0, i - 1)], next = p[Math.min(p.length - 1, i + 1)];
    let nx = -(next[1] - prev[1]), ny = next[0] - prev[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const o = amp * (Math.sin(dist * f1 + ph1) * 0.7 + Math.sin(dist * f2 + ph2) * 0.3);
    return [pt[0] + nx * o, pt[1] + ny * o];
  });
}
function trace(ctx, pts, closed) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  ctx.lineTo(...pts.at(-1));
  if (closed) ctx.closePath();
}
export function line(ctx, r, pts, {lw = 2.4, color = C.ink, amp = 1.0, alpha = 1, step = 10} = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw;
  trace(ctx, wobble(pts, r, amp, step)); ctx.stroke(); ctx.restore();
}
// Filled polygon with a slightly misregistered ink outline, like a coloured
// pencil fill drawn under a pen contour.
export function shape(ctx, r, pts, {fill, stroke = C.ink, lw = 2.2, amp = 1.0, grain = 0.10, hatch = null, alpha = 1, outlineAlpha = 1} = {}) {
  ctx.save(); ctx.globalAlpha *= alpha;
  if (fill) {
    const fp = wobble(pts, r, amp * 0.8, 14, true).map(([x, y]) => [x + (r() - .5) * 1.4, y + (r() - .5) * 1.4]);
    trace(ctx, fp, true); ctx.fillStyle = fill; ctx.fill();
    if (grain) { ctx.save(); trace(ctx, fp, true); ctx.clip(); pencil(ctx, r, bounds(pts), grain, hatch); ctx.restore(); }
  }
  if (stroke) {
    ctx.globalAlpha *= outlineAlpha;
    // stroke each edge separately with small overshoot at corners
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d;
      const o1 = r() * 2.2, o2 = r() * 2.2;
      line(ctx, r, [[a[0] - ux * o1, a[1] - uy * o1], [b[0] + ux * o2, b[1] + uy * o2]], {lw, color: stroke, amp: amp * 0.7});
    }
  }
  ctx.restore();
}
export function rect(ctx, r, x, y, w, h, o = {}) { shape(ctx, r, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); }
export function ellipsePts(cx, cy, rx, ry, n = 40, a0 = 0, a1 = Math.PI * 2) {
  const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return pts;
}
export function ellipse(ctx, r, cx, cy, rx, ry, {fill, stroke = C.ink, lw = 2.2, amp = 0.8, grain = 0.1, alpha = 1} = {}) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const pts = ellipsePts(cx, cy, rx, ry, 48);
  if (fill) { const fp = wobble(pts, r, amp * 0.6, 8, false); trace(ctx, fp, true); ctx.fillStyle = fill; ctx.fill(); if (grain) { ctx.save(); trace(ctx, fp, true); ctx.clip(); pencil(ctx, r, [cx - rx, cy - ry, cx + rx, cy + ry], grain); ctx.restore(); } }
  if (stroke) { const a0 = r() * 6.28; line(ctx, r, ellipsePts(cx, cy, rx, ry, 52, a0, a0 + Math.PI * 2.06), {lw, color: stroke, amp: amp * 0.6, step: 6}); }
  ctx.restore();
}
export function bounds(pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
// Pencil grain: faint diagonal strokes plus speckle inside the current clip.
export function pencil(ctx, r, [x0, y0, x1, y1], amount = 0.1, hatch = null) {
  ctx.save(); ctx.lineCap = 'round';
  const step = hatch?.step ?? 5.5, ang = hatch?.angle ?? -0.9;
  const dx = Math.cos(ang), dy = Math.sin(ang), span = (x1 - x0) + (y1 - y0) + 40;
  ctx.strokeStyle = hatch?.color ?? 'rgba(40,36,28,1)'; ctx.lineWidth = hatch?.lw ?? 0.8;
  for (let s = -span; s < span; s += step * (0.7 + r() * 0.6)) {
    const cx = (x0 + x1) / 2 + s * -dy, cy = (y0 + y1) / 2 + s * dx;
    ctx.globalAlpha = amount * (hatch ? 1 : 0.35) * (0.4 + r() * 0.6);
    ctx.beginPath(); ctx.moveTo(cx - dx * span, cy - dy * span); ctx.lineTo(cx + dx * span, cy + dy * span); ctx.stroke();
  }
  ctx.restore();
}
export function paperGrain(ctx, r, w, h, alpha = 0.05) {
  ctx.save();
  for (let i = 0; i < w * h / 55; i++) {
    const x = r() * w, y = r() * h; ctx.globalAlpha = alpha * r();
    ctx.fillStyle = r() < 0.5 ? '#5b5240' : '#ffffff'; ctx.fillRect(x, y, 0.8 + r(), 0.8 + r());
  }
  for (let i = 0; i < w * h / 9000; i++) {
    const x = r() * w, y = r() * h, a = r() * 6.28, l = 6 + r() * 14;
    ctx.globalAlpha = alpha * 0.6; ctx.strokeStyle = '#8a7e66'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l / 2 + r() * 3, y + Math.sin(a) * l / 2 + r() * 3, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
}
export function handText(ctx, text, x, y, {size = 30, color = C.ink, align = 'left', font = 'Hand', rotate = 0} = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotate); ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 0); ctx.restore();
}
export function rain(ctx, r, x0, y0, x1, y1, {n = 300, len = 18, alpha = 0.35, color = '#7f93a3', slant = 0.18, lw = 1.1} = {}) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), l = len * (0.6 + r() * 0.8);
    ctx.globalAlpha = alpha * (0.4 + r() * 0.6); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l * slant, y + l); ctx.stroke();
  }
  ctx.restore();
}
export function glow(ctx, x, y, rad, color, alpha = 0.5) {
  ctx.save(); const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  const h = color.replace('#', ''), [R, G, B] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  g.addColorStop(0, `rgba(${R},${G},${B},1)`); g.addColorStop(0.45, `rgba(${R},${G},${B},.45)`); g.addColorStop(1, `rgba(${R},${G},${B},0)`); ctx.globalAlpha = alpha; ctx.fillStyle = g;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); ctx.restore();
}
export function vgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
export function sunDoodle(ctx, r, cx, cy, rad, {color = C.ink, lw = 3} = {}) {
  line(ctx, r, ellipsePts(cx, cy, rad, rad, 30, -1.4, -1.4 + Math.PI * 2.08), {lw, color, amp: 0.8, step: 5});
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; line(ctx, r, [[cx + Math.cos(a) * rad * 1.35, cy + Math.sin(a) * rad * 1.35], [cx + Math.cos(a) * rad * 1.85, cy + Math.sin(a) * rad * 1.85]], {lw, color, amp: 0.4}); }
}

// ---------- stick-figure rig ----------
// Angles: 0 = straight down, +pi/2 = toward +x (screen right), pi = up.
const dir = (a, l) => [Math.sin(a) * l, Math.cos(a) * l];
export const RIG = {headR: 21, torso: 64, upper: 31, fore: 29, thigh: 37, shin: 36, lw: 3.6};
export const DEFAULT_POSE = {
  facing: 'front', lean: 0, head: 0, gaze: [0, 0], mouth: 'line', eyes: 'dot', blush: false,
  armL: [-0.25, -0.12], armR: [0.25, 0.12], legL: [-0.12, -0.05], legR: [0.12, 0.05],
};
// Draw a figure with hip at (hx, hy). who: 'him' | 'her'. Returns joint map.
export function figure(ctx, r, who, hx, hy, pose = {}, opts = {}) {
  const p = {...DEFAULT_POSE, ...pose}, R = RIG, lw = opts.lw ?? R.lw;
  const hip = [hx, hy];
  const neck = [hx + Math.sin(p.lean) * R.torso, hy - Math.cos(p.lean) * R.torso];
  const shoulder = [neck[0] + Math.sin(p.lean) * -6, neck[1] + 7];
  const head = [neck[0] + Math.sin(p.lean + p.head) * (R.headR + 2), neck[1] - Math.cos(p.lean + p.head) * (R.headR + 2)];
  const limb = (o, [a, b], l1, l2) => { const j = [o[0] + dir(a, l1)[0], o[1] + dir(a, l1)[1]]; const e = [j[0] + dir(b, l2)[0], j[1] + dir(b, l2)[1]]; return [o, j, e]; };
  const armL = limb(shoulder, p.armL, R.upper, R.fore), armR = limb(shoulder, p.armR, R.upper, R.fore);
  const legL = limb(hip, p.legL, p.thighL ?? R.thigh, R.shin), legR = limb(hip, p.legR, p.thighR ?? R.thigh, R.shin);
  const side = p.facing === 'right' ? 1 : p.facing === 'left' ? -1 : 0;
  const ink = {lw, color: C.ink, amp: 0.45, step: 8};
  // things behind the body
  if (who === 'him' && opts.backpack !== false) {
    if (side) { // bag on the back
      const bx = neck[0] - side * 10, by = neck[1] + 6;
      const pts = side > 0 ? [[bx - 24, by], [bx + 2, by - 2], [bx + 4, by + 44], [bx - 26, by + 46]] : [[bx - 2, by - 2], [bx + 24, by], [bx + 26, by + 46], [bx - 4, by + 44]];
      shape(ctx, r, pts, {fill: C.navy, lw: 2.4, grain: 0.12});
      line(ctx, r, side > 0 ? [[bx - 20, by + 18], [bx - 2, by + 18]] : [[bx + 2, by + 18], [bx + 20, by + 18]], {lw: 1.6, color: '#1e2a40', amp: 0.3});
    } else if (opts.backpackFront !== true) { // slung over the right shoulder
      const bx = neck[0] + 20, by = neck[1] + 34;
      shape(ctx, r, [[bx, by + 4], [bx + 13, by - 2], [bx + 27, by + 4], [bx + 29, by + 48], [bx - 1, by + 48]], {fill: C.navy, lw: 2.4, grain: 0.12});
      rect(ctx, r, bx + 4, by + 26, 21, 13, {fill: C.navyLight, lw: 1.6, grain: 0.06});
    }
  }
  if (who === 'her') { // short ponytail: rounded tuft at the upper back of the head
    const s = side ? -side : (opts.tailSide ?? 1);
    const ang = side ? -side * 0.95 : s * 0.8; // from vertical
    const ax = head[0] + Math.sin(ang) * R.headR * 0.92, ay = head[1] - Math.cos(ang) * R.headR * 0.92;
    const ox = Math.sin(ang), oy = -Math.cos(ang);
    ctx.save(); ctx.fillStyle = C.ink; ctx.beginPath();
    ctx.moveTo(ax - oy * 5, ay + ox * 5);
    ctx.bezierCurveTo(ax + s * 16, ay - 4, ax + s * 22, ay + 14, ax + s * 13, ay + 24);
    ctx.bezierCurveTo(ax + s * 10, ay + 14, ax + s * 4, ay + 8, ax + oy * 5, ay - ox * 5);
    ctx.closePath(); ctx.fill(); ctx.restore();
    ellipse(ctx, r, ax + s * 2, ay + 1, 3.6, 4.6, {fill: C.rust, lw: 1.3, grain: 0});
  }
  // legs and torso
  for (const L of [legL, legR]) line(ctx, r, L, ink);
  line(ctx, r, [hip, neck], ink);
  if (who === 'him' && opts.backpack !== false && !side && opts.backpackFront !== true) { // strap over shoulder
    line(ctx, r, [[neck[0] + 3, neck[1] + 3], [neck[0] + 14, neck[1] + 10], [neck[0] + 26, neck[1] + 34]], {lw: 3.4, color: C.navy, amp: 0.3});
  }
  if (who === 'her') { // yellow scarf: wrap + tail
    shape(ctx, r, [[neck[0] - 14, neck[1] - 4], [neck[0] + 14, neck[1] - 4], [neck[0] + 13, neck[1] + 6], [neck[0] - 13, neck[1] + 6]], {fill: C.scarf, lw: 1.8, grain: 0.1});
    const t = side ? -side : (opts.scarfSide ?? -1);
    const sx = neck[0] + (side ? side * 6 : t * 7);
    const wind = opts.scarfWind ?? 0;
    shape(ctx, r, [[sx - 4, neck[1] + 4], [sx + 5, neck[1] + 4], [sx + 7 + t * wind * 16, neck[1] + 28 - wind * 10], [sx - 2 + t * wind * 18, neck[1] + 30 - wind * 10]], {fill: C.scarf, lw: 1.8, grain: 0.1});
  }
  if (opts.hideArms !== 'both') {
    if (opts.hideArms !== 'L') line(ctx, r, armL, ink);
    if (opts.hideArms !== 'R') line(ctx, r, armR, ink);
  }
  // head
  ellipse(ctx, r, head[0], head[1], R.headR, R.headR, {fill: C.white, lw, amp: 0.5, grain: 0});
  const ex = side * 7 + p.gaze[0], ey = -2 + p.gaze[1];
  const eyePts = side ? [[head[0] + ex - 1, head[1] + ey], [head[0] + ex + side * 9, head[1] + ey]] : [[head[0] - 7.5 + ex, head[1] + ey], [head[0] + 7.5 + ex, head[1] + ey]];
  ctx.fillStyle = C.ink;
  for (const [x, y] of eyePts) {
    if (p.eyes === 'closed') line(ctx, r, [[x - 3.2, y + 0.5], [x, y - 2], [x + 3.2, y + 0.5]], {lw: 1.8, amp: 0});
    else if (p.eyes === 'down') line(ctx, r, [[x - 3, y], [x + 3, y]], {lw: 1.8, amp: 0});
    else { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
  }
  const mx = head[0] + side * 7 + p.gaze[0] * 0.6, my = head[1] + 9 + p.gaze[1] * 0.5;
  if (p.blush) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = C.pink; for (const [x] of eyePts) { ctx.beginPath(); ctx.ellipse(x + (side ? side * 2 : (x < head[0] ? -3 : 3)), head[1] + 5, 4.5, 2.6, 0, 0, 6.3); ctx.fill(); } ctx.restore(); }
  const m = {lw: 1.9, amp: 0};
  if (p.mouth === 'smile') line(ctx, r, [[mx - 5, my - 1], [mx, my + 2.6], [mx + 5, my - 1]], m);
  else if (p.mouth === 'big') { ctx.beginPath(); ctx.moveTo(mx - 6, my - 1.5); ctx.quadraticCurveTo(mx, my + 8, mx + 6, my - 1.5); ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill(); }
  else if (p.mouth === 'sad') line(ctx, r, [[mx - 4.5, my + 2], [mx, my - 0.8], [mx + 4.5, my + 2]], m);
  else if (p.mouth === 'o') { ctx.beginPath(); ctx.ellipse(mx, my + 1, 2.4, 3, 0, 0, 6.3); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.7; ctx.stroke(); }
  else line(ctx, r, [[mx - 4, my + 0.5], [mx + 4, my + 0.5]], m);
  return {hip, neck, head, shoulder, handL: armL[2], handR: armR[2], footL: legL[2], footR: legR[2], elbowL: armL[1], elbowR: armR[1]};
}

// Props reused by the cast
export function backpack(ctx, r, x, y, s = 1) { // standing bag, bottom-left at (x,y)
  const w = 46 * s, h = 54 * s;
  shape(ctx, r, [[x + 3 * s, y - h + 8 * s], [x + w / 2, y - h], [x + w - 3 * s, y - h + 8 * s], [x + w, y], [x, y]], {fill: C.navy, lw: 2.4, grain: 0.12});
  rect(ctx, r, x + 8 * s, y - 24 * s, w - 16 * s, 16 * s, {fill: C.navyLight, lw: 1.8, grain: 0.08});
  line(ctx, r, [[x + w / 2 - 7 * s, y - h - 2 * s], [x + w / 2, y - h - 9 * s], [x + w / 2 + 7 * s, y - h - 2 * s]], {lw: 2, amp: 0.2});
}
export function ticket(ctx, r, x, y, s = 1, label = '21') {
  rect(ctx, r, x, y, 62 * s, 34 * s, {fill: C.cream, lw: 1.8, grain: 0.06});
  line(ctx, r, [[x + 44 * s, y + 3 * s], [x + 44 * s, y + 31 * s]], {lw: 1.2, color: C.inkSoft, amp: 0.2});
  if (label) handText(ctx, label, x + 22 * s, y + 18 * s, {size: 22 * s, color: C.rust, align: 'center'});
}
export function letter(ctx, r, x, y, s = 1, angle = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  rect(ctx, r, 0, 0, 52 * s, 66 * s, {fill: C.white, lw: 1.8, grain: 0.05});
  for (let i = 0; i < 5; i++) line(ctx, r, [[8 * s, (14 + i * 9) * s], [(i === 4 ? 30 : 44) * s, (14 + i * 9) * s]], {lw: 1.1, color: C.inkSoft, amp: 0.3});
  ctx.restore();
}
