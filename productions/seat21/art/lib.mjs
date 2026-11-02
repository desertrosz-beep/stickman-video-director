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
  armL: [-0.32, -0.12], armR: [0.32, 0.12], legL: [-0.12, -0.05], legR: [0.12, 0.05],
};
// Draw a figure with hip at (hx, hy). who: 'him' | 'her'. Returns joint map.
// Wardrobe (fixed for the whole film): HIM plain navy shirt + thin black glasses,
// backpack = two strap lines in front view, the bag itself only in side views or in hand.
// HER plain yellow kurta under a golden scarf, short ponytail with rust tie.
export const WARDROBE = {shirt: '#3f5680', bag: '#253149', bagLight: '#3a4a6b', kurta: '#f1d47e', scarf: '#e0a321', cap: '#8a5d3b', capDark: '#6a4529'};
export function figure(ctx, r, who, hx, hy, pose = {}, opts = {}) {
  const p = {...DEFAULT_POSE, ...pose}, R = RIG, lw = opts.lw ?? R.lw, Wd = WARDROBE;
  const hip = [hx, hy];
  const neck = [hx + Math.sin(p.lean) * R.torso, hy - Math.cos(p.lean) * R.torso];
  const shoulder = [neck[0] + Math.sin(p.lean) * -6, neck[1] + 7];
  const head = [neck[0] + Math.sin(p.lean + p.head) * (R.headR + 2), neck[1] - Math.cos(p.lean + p.head) * (R.headR + 2)];
  const limb = (o, [a, b], l1, l2) => { const j = [o[0] + dir(a, l1)[0], o[1] + dir(a, l1)[1]]; const e = [j[0] + dir(b, l2)[0], j[1] + dir(b, l2)[1]]; return [o, j, e]; };
  const sideView = p.facing === 'right' || p.facing === 'left', sw = sideView ? 0 : 10;
  const armL = limb([shoulder[0] - sw, shoulder[1]], p.armL, R.upper, R.fore), armR = limb([shoulder[0] + sw, shoulder[1]], p.armR, R.upper, R.fore);
  const legL = limb(hip, p.legL, p.thighL ?? R.thigh, p.shin ?? R.shin), legR = limb(hip, p.legR, p.thighR ?? R.thigh, p.shin ?? R.shin);
  const side = p.facing === 'right' ? 1 : p.facing === 'left' ? -1 : 0;
  const ink = {lw, color: C.ink, amp: 0.45, step: 8};
  const wearBag = who === 'him' && opts.backpack !== false;
  // bag on the back (side views only)
  if (wearBag && side) {
    const bx = neck[0] - side * 12, by = neck[1] + 6;
    const pts = side > 0 ? [[bx - 24, by], [bx + 2, by - 2], [bx + 4, by + 46], [bx - 26, by + 48]] : [[bx - 2, by - 2], [bx + 24, by], [bx + 26, by + 48], [bx - 4, by + 46]];
    shape(ctx, r, pts, {fill: Wd.bag, lw: 2.4, grain: 0.12});
    line(ctx, r, side > 0 ? [[bx - 20, by + 20], [bx - 2, by + 20]] : [[bx + 2, by + 20], [bx + 20, by + 20]], {lw: 1.6, color: Wd.bagLight, amp: 0.3});
  }
  if (who === 'her') { // short ponytail: rounded tuft at the upper back of the head
    const s = side ? -side : (opts.tailSide ?? 1);
    const ang = side ? -side * 0.95 : s * 0.8;
    const ax = head[0] + Math.sin(ang) * R.headR * 0.92, ay = head[1] - Math.cos(ang) * R.headR * 0.92;
    const ox = Math.sin(ang), oy = -Math.cos(ang);
    ctx.save(); ctx.fillStyle = C.ink; ctx.beginPath();
    ctx.moveTo(ax - oy * 5, ay + ox * 5);
    ctx.bezierCurveTo(ax + s * 16, ay - 4, ax + s * 22, ay + 14, ax + s * 13, ay + 24);
    ctx.bezierCurveTo(ax + s * 10, ay + 14, ax + s * 4, ay + 8, ax + oy * 5, ay - ox * 5);
    ctx.closePath(); ctx.fill(); ctx.restore();
    ellipse(ctx, r, ax + s * 2, ay + 1, 3.6, 4.6, {fill: C.rust, lw: 1.3, grain: 0});
  }
  if (p.feet) { ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#1d2a28'; ctx.beginPath(); ctx.ellipse(hip[0], hip[1] + 2, 30, 7, 0, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(hip[0] + 4, hip[1] - 40, 20, 26, 0, 0, 6.3); ctx.fill(); ctx.restore(); }
  for (const L of [legL, legR]) line(ctx, r, L, ink);
  if (p.feet) for (const [L, d] of [[legL, -1], [legR, 1]]) line(ctx, r, [L[2], [L[2][0] + d * 8, L[2][1] + 0.5]], {...ink, amp: 0}); // small feet planted on the floor
  line(ctx, r, [hip, neck], ink);
  const half = side ? 9 : 13;
  if (who === 'him') { // plain navy shirt, tucked at the hip
    shape(ctx, r, [[neck[0] - half, neck[1] + 4], [neck[0] + half, neck[1] + 4], [hip[0] + half, hip[1] + 1], [hip[0] - half, hip[1] + 1]], {fill: Wd.shirt, lw: 2.2, grain: 0.1});
    if (!side) line(ctx, r, [[neck[0] - 5, neck[1] + 4], [neck[0], neck[1] + 11], [neck[0] + 5, neck[1] + 4]], {lw: 1.6, color: C.ink, amp: 0});
  }
  if (who === 'her') { // plain yellow kurta, hem between hip and knee
    const kneeY = (legL[1][1] + legR[1][1]) / 2, hemY = Math.max(hip[1] + 8, Math.min(kneeY - 4, hip[1] + 28));
    const spread = Math.max(side ? 14 : 19, Math.abs(legR[1][0] - legL[1][0]) / 2 + 6);
    const hx2 = (legL[1][0] + legR[1][0]) / 2 * 0.5 + hip[0] * 0.5;
    shape(ctx, r, [[neck[0] - half, neck[1] + 3], [neck[0] + half, neck[1] + 3], [hip[0] + half + 2, hip[1] - 6], [hx2 + spread, hemY], [hx2 - spread, hemY], [hip[0] - half - 2, hip[1] - 6]], {fill: Wd.kurta, lw: 2.2, grain: 0.1});
    if (!side) line(ctx, r, [[neck[0], neck[1] + 8], [neck[0], neck[1] + 22]], {lw: 1.4, color: C.ink, amp: 0, alpha: 0.7});
  }
  if (wearBag && !side) { // front view: only two strap lines over the shoulders
    for (const s of [-1, 1]) { const pts = [[neck[0] + s * 7, neck[1] + 1], [neck[0] + s * 11, neck[1] + 12], [neck[0] + s * 11, neck[1] + 42]]; line(ctx, r, pts, {lw: 5.6, color: C.ink, amp: 0.2}); line(ctx, r, pts, {lw: 3.4, color: Wd.bag, amp: 0.2}); }
  }
  if (opts.beforeArms) opts.beforeArms(ctx, {hip, neck});
  const arms = opts.hideArms === 'both' ? [] : opts.hideArms === 'L' ? [armR] : opts.hideArms === 'R' ? [armL] : [armL, armR];
  for (const A of arms) {
    line(ctx, r, A, ink);
    const sl = who === 'him' ? 0.5 : 0.85, e = [A[0][0] + (A[1][0] - A[0][0]) * sl, A[0][1] + (A[1][1] - A[0][1]) * sl];
    const color = who === 'him' ? Wd.shirt : Wd.kurta;
    line(ctx, r, [A[0], e], {lw: 10, color: C.ink, amp: 0}); line(ctx, r, [A[0], e], {lw: 7, color, amp: 0});
  }
  if (who === 'her') { // golden scarf over the kurta: wrap + tail
    shape(ctx, r, [[neck[0] - 14, neck[1] - 4], [neck[0] + 14, neck[1] - 4], [neck[0] + 13, neck[1] + 6], [neck[0] - 13, neck[1] + 6]], {fill: Wd.scarf, lw: 1.8, grain: 0.1});
    const t = side ? -side : (opts.scarfSide ?? -1);
    const sx = neck[0] + (side ? side * 6 : t * 7), wind = opts.scarfWind ?? 0;
    shape(ctx, r, [[sx - 4, neck[1] + 4], [sx + 5, neck[1] + 4], [sx + 7 + t * wind * 16, neck[1] + 28 - wind * 10], [sx - 2 + t * wind * 18, neck[1] + 30 - wind * 10]], {fill: Wd.scarf, lw: 1.8, grain: 0.1});
  }
  // head
  ellipse(ctx, r, head[0], head[1], R.headR, R.headR, {fill: C.white, lw, amp: 0.5, grain: 0});
  if (who === 'him') { // small brown flat cap, sitting just above the glasses, in every view
    ctx.save(); ctx.translate(head[0], head[1]); ctx.rotate(p.lean + p.head);
    const hr = R.headR, crown = [];
    if (side) {
      for (let i = 0; i <= 16; i++) { const a = Math.PI + Math.PI * i / 16; crown.push([Math.cos(a) * (hr + 1.5) - side * 1, Math.sin(a) * (hr * 0.72) - 8]); }
      crown.push([side * (hr + 1), -7], [-side * (hr + 1), -7]);
      shape(ctx, r, crown, {fill: WARDROBE.cap, lw: 2, grain: 0.12, amp: 0.5});
      shape(ctx, r, [[side * 6, -9], [side * (hr + 11), -7.5], [side * (hr + 9), -4], [side * 6, -5]], {fill: WARDROBE.capDark, lw: 1.8, grain: 0.06, amp: 0.3});
    } else {
      for (let i = 0; i <= 16; i++) { const a = Math.PI + Math.PI * i / 16; crown.push([Math.cos(a) * (hr + 2), Math.sin(a) * (hr * 0.74) - 8]); }
      shape(ctx, r, crown, {fill: WARDROBE.cap, lw: 2, grain: 0.12, amp: 0.5});
      shape(ctx, r, [[-15, -9], [15, -9], [12, -5], [-12, -5]], {fill: WARDROBE.capDark, lw: 1.8, grain: 0.06, amp: 0.3});
    }
    ctx.restore();
  }
  const ex = side * 7 + p.gaze[0], ey = -2 + p.gaze[1];
  const eyePts = side ? [[head[0] + ex - 1, head[1] + ey], [head[0] + ex + side * 9, head[1] + ey]] : [[head[0] - 7.5 + ex, head[1] + ey], [head[0] + 7.5 + ex, head[1] + ey]];
  ctx.fillStyle = C.ink;
  for (const [x, y] of eyePts) {
    if (p.eyes === 'closed') line(ctx, r, [[x - 3.2, y + 0.5], [x, y - 2], [x + 3.2, y + 0.5]], {lw: 1.8, amp: 0});
    else if (p.eyes === 'down') line(ctx, r, [[x - 3, y], [x + 3, y]], {lw: 1.8, amp: 0});
    else { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill(); }
  }
  if (who === 'him') { // thin black glasses
    ctx.save(); ctx.strokeStyle = '#1c1b18'; ctx.lineWidth = 1.4;
    const gy = head[1] - 2 + p.gaze[1] * 0.5, gx = head[0] + side * 7 + p.gaze[0] * 0.6;
    if (side) {
      ctx.beginPath(); ctx.ellipse(gx + side * 5, gy, 5.6, 4.8, 0, 0, 6.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx - side * 0.6, gy - 1); ctx.lineTo(head[0] - side * 9, gy - 2); ctx.stroke();
    } else {
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(gx + s * 7.5, gy, 5.6, 4.8, 0, 0, 6.3); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(gx - 1.9, gy - 0.5); ctx.quadraticCurveTo(gx, gy - 2.2, gx + 1.9, gy - 0.5); ctx.stroke();
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(gx + s * 13.1, gy - 1); ctx.lineTo(head[0] + s * 19.5, gy - 3); ctx.stroke(); }
    }
    ctx.restore();
  }
  const mx = head[0] + side * 7 + p.gaze[0] * 0.6, my = head[1] + 9 + p.gaze[1] * 0.5;
  if (p.blush) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = C.pink; for (const [x] of eyePts) { ctx.beginPath(); ctx.ellipse(x + (side ? side * 2 : (x < head[0] ? -3 : 3)), head[1] + 6, 4.5, 2.6, 0, 0, 6.3); ctx.fill(); } ctx.restore(); }
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
  shape(ctx, r, [[x + 3 * s, y - h + 8 * s], [x + w / 2, y - h], [x + w - 3 * s, y - h + 8 * s], [x + w, y], [x, y]], {fill: WARDROBE.bag, lw: 2.4, grain: 0.12});
  rect(ctx, r, x + 8 * s, y - 24 * s, w - 16 * s, 16 * s, {fill: WARDROBE.bagLight, lw: 1.8, grain: 0.08});
  line(ctx, r, [[x + w / 2 - 7 * s, y - h - 2 * s], [x + w / 2, y - h - 9 * s], [x + w / 2 + 7 * s, y - h - 2 * s]], {lw: 2, amp: 0.2});
}
export function ticket(ctx, r, x, y, s = 1, label = '21') {
  rect(ctx, r, x, y, 62 * s, 34 * s, {fill: C.cream, lw: 1.8, grain: 0.06});
  line(ctx, r, [[x + 44 * s, y + 3 * s], [x + 44 * s, y + 31 * s]], {lw: 1.2, color: C.inkSoft, amp: 0.2});
  if (label) handText(ctx, label, x + 22 * s, y + 18 * s, {size: 22 * s, color: C.rust, align: 'center'});
}
// Lap bag for HIM when seated (front view): rests on his thighs, drawn under his hands.
export const lapBag = (ctx, r) => (_c, {hip}) => backpack(ctx, r, hip[0] - 18.5, hip[1] + 4, 0.8);
// Seat plaque, hanging on two short cords; (x, y) = top centre of the cords.
export function plaque(ctx, r, x, y, n) {
  line(ctx, r, [[x - 14, y], [x - 14, y + 12]], {lw: 1.6}); line(ctx, r, [[x + 14, y], [x + 14, y + 12]], {lw: 1.6});
  rect(ctx, r, x - 28, y + 10, 56, 32, {fill: C.cream, lw: 2, grain: 0.04});
  ctx.save(); ctx.font = '600 19px Sign'; ctx.fillStyle = n === '21' ? C.rustDark : C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, x, y + 27); ctx.restore();
}
export function letter(ctx, r, x, y, s = 1, angle = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  rect(ctx, r, 0, 0, 52 * s, 66 * s, {fill: C.white, lw: 1.8, grain: 0.05});
  for (let i = 0; i < 5; i++) line(ctx, r, [[8 * s, (14 + i * 9) * s], [(i === 4 ? 30 : 44) * s, (14 + i * 9) * s]], {lw: 1.1, color: C.inkSoft, amp: 0.3});
  ctx.restore();
}
