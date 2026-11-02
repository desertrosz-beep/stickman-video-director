// Seat No. 21 — shot authoring -> project.json for the bundled B2 runtime.
// Usage: node build.mjs  (writes sprites + project.json; renderer does the rest)
import fs from 'node:fs';
import {P} from './art/poses.mjs';
import {endCard, letterOnCase, titleCard, fig, bagInHand, bagOnSeat, localTrain, longTrain, TRAIN, doorway, rainFrames, clockFace, cup, umbrellaProp} from './art/sprites.mjs';
import {backpack, rng, ticket, letter, C} from './art/lib.mjs';
import {blurredViews, tunnel, longWindowFrame, localWindowFog, doodleSprite} from './art/extras.mjs';
await blurredViews(); tunnel(); longWindowFrame(); localWindowFog(); endCard(); letterOnCase();
const LAP = (c, j) => backpack(c, rng(9), j.hip[0] - 18.5, j.hip[1] + 14, 0.8);

const FPS = 30, DUR = 160.417917;
const R3 = n => Math.round(n * 1000) / 1000;
const shots = [];

// ---------- framework ----------
const STATIC = () => ({z: 1, cx: 640, cy: 360});
function Shot(start, end, cam = STATIC) { const s = {start, end, cam, layers: []}; shots.push(s); return s; }
const camEase = (t0, t1, a, b) => t => { const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0))), e = u * u * (3 - 2 * u); return {z: a.z + (b.z - a.z) * e, cx: a.cx + (b.cx - a.cx) * e, cy: a.cy + (b.cy - a.cy) * e}; };
const camHold = c => () => c;
// Add an image layer in world (scene) coords; t0/t1 absolute; motion(tAbs) -> partial {x,y,w,alpha,angle}
function img(s, path, x, y, w, {t0 = s.start, t1 = s.end, motion, screen = false} = {}) { s.layers.push({type: 'image', path, x, y, w, t0: Math.max(t0, s.start), t1: Math.min(t1, s.end), motion, screen}); }
function text(s, str, x, y, size, {t0 = s.start, t1 = s.end, color, alpha, w} = {}) { s.layers.push({type: 'text', text: str, x, y, size, color, t0, t1, alphaFn: alpha, w}); }
const at = (sp, hx, hy) => [sp.path, hx - sp.ax, hy - sp.ay, sp.w];
function pose(s, sp, hx, hy, t0, t1, motion) { const [p, x, y, w] = at(sp, hx, hy); img(s, p, x, y, w, {t0, t1, motion: motion && (t => { const m = motion(t); return {x: (m.hx ?? hx) - sp.ax, y: (m.hy ?? hy) - sp.ay, alpha: m.alpha}; })}); }
// walk cycle: frames = array of sprites cycled every `step` s while hip moves linearly x0->x1
function walk(s, frames, t0, t1, x0, x1, hy, step = 0.13, extra = () => ({})) {
  const lerp = t => x0 + (x1 - x0) * Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
  for (let t = t0, i = 0; t < t1 - 1e-6; t += step, i++) { const a = t, b = Math.min(t1, t + step), sp = frames[i % frames.length]; pose(s, sp, 0, hy, a, b, tt => ({hx: lerp(tt), ...extra(tt)})); }
}
function boil(s, frames, t0, t1, step = 0.12) { for (let t = t0, i = 0; t < t1 - 1e-6; t += step, i++) img(s, frames[i % frames.length], 0, 0, 1280, {t0: t, t1: Math.min(t1, t + step)}); }

function compile() {
  const out = [];
  for (const s of shots) {
    const span = R3(s.end) - R3(s.start), layers = [], spanF = Math.floor(span * 1000 - 1e-6) / 1000;
    const KT = t => Math.min(R3(t - s.start), spanF);
    const camStatic = (() => { const a = s.cam(s.start), b = s.cam(s.end), m = s.cam((s.start + s.end) / 2); return [a, b, m].every(c => c.z === a.z && c.cx === a.cx && c.cy === a.cy); })();
    for (const l of s.layers) {
      if (l.t1 <= l.t0) continue;
      const from = R3(l.t0 - s.start), to = R3(l.t1 - s.start);
      const base = {type: l.type};
      if (from > 0) base.from = Math.min(from, spanF); if (to < spanF) base.to = to;
      if (l.type === 'line') {
        const c = s.cam(s.start);
        Object.assign(base, {points: l.points.map(([x, y]) => [R3((x - c.cx) * c.z + 640), R3((y - c.cy) * c.z + 360)]), lineWidth: R3(l.lw * c.z), color: l.color});
        if (l.draw) { const [a, b] = l.draw; base.keys = uniq([{t: KT(Math.max(a, l.t0)), progress: 0}, {t: KT(Math.min(b, l.t1)), progress: 1}]); }
        layers.push(base); continue;
      }
      if (l.type === 'text') { Object.assign(base, {text: l.text, x: l.x, y: l.y, size: l.size}); if (l.color) base.color = l.color; if (l.w) base.w = l.w; if (l.alphaFn) base.keys = uniq(frameTimes(l.t0, l.t1).map(t => ({t: KT(t), alpha: R3(Math.max(0, Math.min(1, l.alphaFn(t))))}))); out.push && layers.push(dedupe(base)); continue; }
      const tf = (t, v) => { const c = l.screen ? {z: 1, cx: 640, cy: 360} : s.cam(t); return {x: R3((v.x - c.cx) * c.z + 640), y: R3((v.y - c.cy) * c.z + 360), w: R3(v.w * c.z)}; };
      base.path = l.path;
      if (camStatic && !l.motion || l.screen && !l.motion) { Object.assign(base, tf(s.start, l)); }
      else {
        const keys = frameTimes(l.t0, l.t1).map(t => { const m = l.motion ? l.motion(t) : {}; const v = {x: m.x ?? l.x, y: m.y ?? l.y, w: m.w ?? l.w}; const k = {t: KT(t), ...tf(t, v)}; if (m.alpha !== undefined) k.alpha = R3(Math.max(0, Math.min(1, m.alpha))); return k; });
        Object.assign(base, {x: keys[0].x, y: keys[0].y, w: keys[0].w, keys: thin(uniq(keys))});
      }
      layers.push(base);
    }
    out.push({start: R3(s.start), end: R3(s.end), layers});
  }
  return out;
}
function frameTimes(t0, t1) { const ts = [t0]; for (let f = Math.floor(t0 * FPS) + 1; f / FPS < t1 - 1e-6; f++) ts.push(f / FPS); ts.push(t1); return ts.filter((t, i) => i === 0 || t - ts[i - 1] > 1e-4); }
function thin(keys) { // drop keys whose values equal both neighbours (static stretches)
  const same = (a, b) => ['x', 'y', 'w', 'alpha'].every(k => a[k] === b[k]);
  return keys.filter((k, i) => i === 0 || i === keys.length - 1 || !(same(k, keys[i - 1]) && same(k, keys[i + 1])));
}
const dedupe = l => l;
const uniq = keys => keys.filter((k, i) => i === 0 || k.t > keys[i - 1].t);

// ---------- train ride profile (scenery scroll) ----------
// speed 1 = moving, 0 = stopped at a station; eased transitions.
const STOPS = [[22.4, 23.0, 26.0, 26.8], [135.0, 135.6, 146.1, 148.5]]; // decel start, stopped, accel start, full speed
function speed(t) { for (const [a, b, c, d] of STOPS) { if (t >= a && t < b) return 1 - (t - a) / (b - a); if (t >= b && t < c) return 0; if (t >= c && t < d) return (t - c) / (d - c); } return 1; }
const DIST = []; { let d = 0; for (let i = 0; i <= DUR * 120; i++) { DIST.push(d); d += speed(i / 120) / 120; } }
const dist = t => DIST[Math.max(0, Math.min(DIST.length - 1, Math.round(t * 120)))];
const wrap = (v, p) => ((v % p) + p) % p;
function views(s, season, {near = 150, far = 14, farStart = 150} = {}) {
  const d0 = s.start < 33.6 ? 0 : dist(s.start); // preview shots keep their approved offsets
  img(s, `assets/bg/view-${season}-far.png`, 0, -40, 2560, {motion: t => ({x: -farStart - far * (dist(t) - d0)})});
  for (const i of [0, 1]) img(s, `assets/bg/view-${season}-near.png`, 0, -40, 2560, {motion: t => ({x: -wrap(near * dist(t), 2560) + 2560 * i})});
}
const SEAT = {apart: {him: 380, her: 900}, together: {him: 560, her: 720}};
function localSet(s, layout, {hiRes = false} = {}) {
  img(s, hiRes ? 'assets/bg/bg2-local-interior@3x.png' : 'assets/bg/bg2-local-interior.png', 0, 0, 1280);
  for (const [who, n] of [['him', '20'], ['her', '21']]) img(s, `assets/props/plaque-${n}.png`, SEAT[layout][who] - 32, 96, 64);
}


// auto-named figure sprite (name = hash of its definition)
function F(who, pose, K, opts = {}, tag = '', extra) {
  const key = JSON.stringify({who, pose, K, opts: Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, typeof v === 'function' ? v.name || 'fn' : v])), tag});
  let h = 2166136261; for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return fig(`${who}-${h.toString(16)}`, who, pose, K, opts, extra);
}
// two-bone IK for a front-view arm: world target -> [upper, fore] angles
function ik([tx, ty], hx, hy, K, side = 'R', lean = 0) {
  const neck = [Math.sin(lean) * 64, -Math.cos(lean) * 64], O = [neck[0] - Math.sin(lean) * 6 + (side === 'R' ? 10 : -10), neck[1] + 7];
  const T = [(tx - hx) / K, (ty - hy) / K], v = [T[0] - O[0], T[1] - O[1]], L1 = 31, L2 = 29;
  const d = Math.max(3, Math.min(L1 + L2 - 0.05, Math.hypot(...v))), base = Math.atan2(v[0], v[1]);
  const A = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const cands = [base + A, base - A].map(u => { const E = [O[0] + Math.sin(u) * L1, O[1] + Math.cos(u) * L1]; return {u, E}; });
  const pick = cands.sort((a, b) => b.E[1] - a.E[1])[0];
  return [pick.u, Math.atan2(T[0] - pick.E[0], T[1] - pick.E[1])];
}
// ---------- sprites ----------
const KP = 1.3, KI = 1.5;                  // platform / interior scale
const FEET_P = 590, HIP_P = FEET_P - 73 * KP;
const HIP_STAND = 610 - 73 * KI, HIP_SIT = 522;
const walkR = {facing: 'right', armL: [-0.45, -0.2], armR: [0.5, 0.75], legL: [-0.38, -0.1], legR: [0.42, 0.05]};
const walkR2 = {facing: 'right', armL: [0.5, 0.75], armR: [-0.45, -0.2], legL: [0.42, 0.05], legR: [-0.38, -0.1]};
const walkRm = {facing: 'right', armL: [-0.1, 0.1], armR: [0.15, 0.3], legL: [-0.06, 0.02], legR: [0.1, 0.12]};
const mirror = p => ({...p, facing: 'left', armL: p.armR.map(a => -a), armR: p.armL.map(a => -a), legL: p.legR.map(a => -a), legR: p.legL.map(a => -a)});
const cyc = (who, tag, K, base, opts = {}, extra) => [base, walkRm, base === walkR ? walkR2 : mirror(walkR2), base === walkR ? walkRm : mirror(walkRm)].map((p, i) => fig(`${who}-${tag}-walk${i}`, who, p, K, opts, extra));
const himWalkR_P = [walkR, walkRm, walkR2, walkRm].map((p, i) => fig(`him-p-walkR${i}`, 'him', p, KP));
const himWalkL_I = [mirror(walkR), mirror(walkRm), mirror(walkR2), mirror(walkRm)].map((p, i) => fig(`him-i-walkL${i}`, 'him', p, KI));
const himWalkR_I = [walkR, walkRm, walkR2, walkRm].map((p, i) => fig(`him-i-walkR${i}`, 'him', p, KI));
const herWalkL_I = [mirror(walkR), mirror(walkRm), mirror(walkR2), mirror(walkRm)].map((p, i) => fig(`her-i-walkL${i}`, 'her', p, KI));
const himNoBagWalkL_I = [mirror(walkR), mirror(walkRm), mirror(walkR2), mirror(walkRm)].map((p, i) => fig(`him-i-walkL-nobag${i}`, 'him', p, KI, {backpack: false}));

// ---------- Shot A/B: rainy dawn platform (intro 0:00-0:13.1) ----------
const rainP = rainFrames('platform', {n: 420, alpha: 0.5});
const PUSH = {z: 1.06, cx: 600, cy: 380};
{
  const A = Shot(0, 4.5, camEase(0, 4.5, {z: 1, cx: 640, cy: 360}, PUSH));
  img(A, 'assets/bg/bg1-platform.png', 0, 0, 1280);
  img(A, clockFace(14), 798, 98, 84, {t1: 2.6}); img(A, clockFace(15), 798, 98, 84, {t0: 2.6});
  boil(A, rainP, 0, 4.5);
  const fade = t => Math.min(1, (t - 0.5) / 0.8) * Math.min(1, Math.max(0, (4.35 - t) / 0.6));
  img(A, titleCard(), 420, 196, 440, {t0: 0.5, screen: true, motion: t => ({alpha: fade(t), y: 206 - 10 * Math.min(1, (t - 0.5) / 0.8)})});
}
{
  const B = Shot(4.5, 13.1, camHold(PUSH));
  const train = localTrain(), door = doorway();
  // train: arrives from the right, decelerating to a stop with its door at x=640
  const TX_STOP = 640 - TRAIN.door;
  const trainX = t => { if (t < 7.4) return 1400; if (t > 10.9) return TX_STOP; const u = (t - 7.4) / 3.5, e = 1 - Math.pow(1 - u, 2.6); return 1400 + (TX_STOP - 1400) * e; };
  img(B, 'assets/bg/bg1-platform.png', 0, 0, 1280);
  img(B, clockFace(15), 798, 98, 84);
  img(B, train, 1400, 148, TRAIN.w, {t0: 7.4, motion: t => ({x: trainX(t)})});
  img(B, door.open, 570, 194, 140, {t0: 11.2});
  img(B, door.left, 570, 194, 72, {t0: 11.2, motion: t => ({x: 570 - 66 * Math.min(1, (t - 11.2) / 0.6)})});
  img(B, door.right, 638, 194, 72, {t0: 11.2, motion: t => ({x: 638 + 66 * Math.min(1, (t - 11.2) / 0.6)})});
  // HIM walks in from the left, stops near the yellow line, glances at the clock, then boards
  walk(B, himWalkR_P, 4.5, 7.0, -80, 430, HIP_P, 0.14);
  pose(B, fig('him-p-front', 'him', {gaze: [2, -3], head: 0.05}, KP), 430, HIP_P, 7.0, 8.4);
  pose(B, fig('him-p-front-train', 'him', {gaze: [5, 0], head: 0.08}, KP), 430, HIP_P, 8.4, 11.6);
  walk(B, himWalkR_P, 11.6, 12.5, 430, 610, HIP_P, 0.14);
  pose(B, fig('him-p-walkR0', 'him', walkR, KP), 610, HIP_P, 12.5, 13.1, t => { const u = (t - 12.5) / 0.6; return {hx: 610 + 20 * u, hy: HIP_P - 40 * u, alpha: 1 - u}; });
  boil(B, rainP, 4.5, 13.1);
}

// ---------- Shot C: inside, he saves seat 21 with his bag (13.1-22.8) ----------
const himCarry = fig('him-i-carry', 'him', {...P.carryBag, gaze: [4, 2]}, KI, {backpack: false}, (c, r, j) => bagInHand(c, r, j));
const placePose = {armR: [1.0, 0.75], gaze: [6, 3], head: 0.1};
const himPlaceBag = fig('him-i-place-bag', 'him', placePose, KI, {backpack: false}, (c, r, j) => bagInHand(c, r, j));
const himPlaceEmpty = fig('him-i-place-empty', 'him', {...placePose, mouth: 'smile'}, KI, {backpack: false});
const bagSeat = bagOnSeat(KI);
const BAG_X = 820 + (Math.sin(1.0) * 31 + Math.sin(0.75) * 29 + 10) * KI; // hand x when placing
{
  const C1 = Shot(13.1, 22.8);
  views(C1, 'monsoon'); localSet(C1, 'apart');
  walk(C1, himWalkL_I, 13.1, 15.3, 1380, 820, HIP_STAND, 0.14);
  pose(C1, himCarry, 820, HIP_STAND, 15.3, 16.3);
  pose(C1, himPlaceBag, 820, HIP_STAND, 16.3, 16.9);
  img(C1, bagSeat.path, BAG_X - bagSeat.ax, 538 - bagSeat.ay, bagSeat.w, {t0: 16.9});
  pose(C1, himPlaceEmpty, 820, HIP_STAND, 16.9, 17.5);
  walk(C1, himNoBagWalkL_I, 17.5, 19.6, 820, 380, HIP_STAND, 0.14);
  pose(C1, fig('him-i-sit-look', 'him', {...P.sit, gaze: [3, 0]}, KI, {backpack: false}), 380, HIP_SIT, 19.6, 21.0);
  pose(C1, fig('him-i-sit-bag-glance', 'him', {...P.sit, gaze: [6, 1], head: 0.08, mouth: 'smile'}, KI, {backpack: false}), 380, HIP_SIT, 21.0, 22.8);
}
// ---------- Shot D: second stop, she boards (22.8-27.1) ----------
{
  const D = Shot(22.8, 27.1);
  views(D, 'monsoon'); localSet(D, 'apart');
  img(D, bagSeat.path, BAG_X - bagSeat.ax, 538 - bagSeat.ay, bagSeat.w);
  walk(D, herWalkL_I, 23.1, 24.9, 1380, 1010, HIP_STAND, 0.14);
  pose(D, fig('her-i-front-bag', 'her', {gaze: [-4, 4], head: -0.06}, KI), 1010, HIP_STAND, 24.9, 25.6);
  pose(D, fig('her-i-front-him', 'her', {gaze: [-6, 0], head: -0.1}, KI), 1010, HIP_STAND, 25.6, 27.1);
  pose(D, fig('him-i-sit-bag-glance', 'him', {}, KI), 380, HIP_SIT, 22.8, 25.0);
  pose(D, fig('him-i-sit-see', 'him', {...P.sit, gaze: [6, 0], head: 0.1, mouth: 'o'}, KI, {backpack: false}), 380, HIP_SIT, 25.0, 25.8);
  pose(D, fig('him-i-stand-look', 'him', {gaze: [6, 0], head: 0.08}, KI, {backpack: false}), 380, HIP_STAND, 25.8, 26.2);
  walk(D, [walkR, walkRm, walkR2, walkRm].map((p, i) => fig(`him-i-walkR-nobag${i}`, 'him', p, KI, {backpack: false})), 26.2, 27.1, 380, 600, HIP_STAND, 0.13);
}
// ---------- Shot E: close on seat 21 — HIM stays seated, lifts the bag onto his lap; HER sits (27.1-29.6) ----------
{
  const CAM = {z: 1.55, cx: 860, cy: 452};
  const E = Shot(27.1, 29.6, camEase(27.1, 29.6, CAM, {z: 1.6, cx: 870, cy: 452}));
  views(E, 'monsoon'); localSet(E, 'apart', {hiRes: true});
  const HX = 770, HANDLE = [BAG_X, 458];
  img(E, bagSeat.path, BAG_X - bagSeat.ax, 538 - bagSeat.ay, bagSeat.w, {t1: 28.0});
  pose(E, F('him', {...P.sit, gaze: [6, 2], head: 0.08, mouth: 'o'}, KI, {backpack: false}), HX, HIP_SIT, 27.1, 27.5);
  pose(E, F('him', {...P.sit, lean: 0.35, armR: ik(HANDLE, HX, HIP_SIT, KI, 'R', 0.35), gaze: [6, 3], head: 0.05, mouth: 'line', blush: true}, KI, {backpack: false}), HX, HIP_SIT, 27.5, 28.0);
  pose(E, F('him', {...P.sit, lean: 0.18, armR: ik([848, 448], HX, HIP_SIT, KI, 'R', 0.18), gaze: [6, 0], head: 0.06, mouth: 'smile', blush: true}, KI, {backpack: false}, 'lift', (c, r, j) => bagInHand(c, r, j)), HX, HIP_SIT, 28.0, 28.4);
  pose(E, F('him', {...P.sitBag, gaze: [6, 0], head: 0.08, mouth: 'smile', blush: true}, KI, {backpack: false, beforeArms: LAP}, 'lap'), HX, HIP_SIT, 28.4, 29.6);
  pose(E, fig('her-i-front-him2', 'her', {gaze: [-6, 0], head: -0.1, mouth: 'o'}, KI), 1010, HIP_STAND, 27.1, 28.1);
  const lower = F('her', {legL: [-0.5, -0.05], legR: [0.5, 0.05], thighL: 30, thighR: 30, shin: 34, feet: true, armL: [-0.3, -0.1], armR: [0.3, 0.1], gaze: [-6, 0], head: -0.08, mouth: 'smile'}, KI);
  pose(E, lower, 1010, 512, 28.1, 28.45, t => { const u = (t - 28.1) / 0.35; return {hx: 1010 - 110 * u, hy: 505 + 12 * u}; });
  pose(E, fig('her-i-sit-smile', 'her', {...P.sitSmile, gaze: [-6, 0], head: -0.08, blush: true}, KI), 900, HIP_SIT, 28.45, 29.6);
}
// ---------- Shot F: montage of mornings, seated apart (29.6-33.6) ----------
{
  const days = [['Tuesday', 29.6, 30.9], ['Wednesday', 30.9, 32.2], ['Thursday', 32.2, 33.6]];
  const umb = umbrellaProp(KI);
  days.forEach(([day, a, b], i) => {
    const F = Shot(a, b);
    views(F, 'monsoon', {farStart: 150 + i * 260});
    localSet(F, 'apart');
    text(F, day, 70, 360, 44, {color: '#3a3830'});
    const him = [{gaze: [6, 0], head: 0.08}, {gaze: [0, 4], eyes: 'down'}, {gaze: [0, -4], head: 0, mouth: 'smile'}][i];
    const her = [{gaze: [-3, -4], mouth: 'line'}, {gaze: [-6, 0], head: -0.08, mouth: 'smile', blush: true}, {gaze: [0, -4], mouth: 'smile'}][i];
    pose(F, fig(`him-i-sitbag-m${i}`, 'him', {...P.sitBag, ...him}, KI, {backpack: false, beforeArms: LAP}), SEAT.apart.him, HIP_SIT, a, b);
    const herSp = fig(`her-i-sit-m${i}`, 'her', {...P.sitSmile, ...her}, KI, {}, i === 1 ? (c, r, j) => cup(c, r, j.handR[0] + 2, j.handR[1] - 2, 0.9) : undefined);
    pose(F, herSp, SEAT.apart.her, HIP_SIT, a, b - 0.25);
    pose(F, fig(`her-i-sit-m${i}-blink`, 'her', {...P.sitSmile, ...her, eyes: 'closed'}, KI, {}, i === 1 ? (c, r, j) => cup(c, r, j.handR[0] + 2, j.handR[1] - 2, 0.9) : undefined), SEAT.apart.her, HIP_SIT, b - 0.25, b - 0.1);
    pose(F, herSp, SEAT.apart.her, HIP_SIT, b - 0.1, b);
    if (i === 2) img(F, umb.path, SEAT.apart.her + 46, 520, umb.w);
  });
}

// =================== FULL FILM: 0:33.6 - 2:40.4 ===================
// ---- doodles: polyline strokes on fogged glass ----
const INK_GLASS = '#5d7483';
const circ = (cx, cy, r, a0 = -1.4, turns = 1.04, n = 30) => Array.from({length: n + 1}, (_, i) => { const a = a0 + Math.PI * 2 * turns * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const DOODLE = {
  sun: (x, y, s) => [circ(x, y, 20 * s), ...Array.from({length: 8}, (_, i) => { const a = i / 8 * Math.PI * 2 + 0.2; return [[x + Math.cos(a) * 28 * s, y + Math.sin(a) * 28 * s], [x + Math.cos(a) * 40 * s, y + Math.sin(a) * 40 * s]]; })],
  face: (x, y, s) => [[[x - 7 * s, y - 4 * s], [x - 6 * s, y - 1 * s]], [[x + 7 * s, y - 4 * s], [x + 6 * s, y - 1 * s]], [[x - 9 * s, y + 5 * s], [x - 3 * s, y + 10 * s], [x + 3 * s, y + 10 * s], [x + 9 * s, y + 5 * s]]],
  cloud: (x, y, s) => [[...circ(x - 22 * s, y, 14 * s, Math.PI * 0.5, 0.55, 10), ...circ(x, y - 8 * s, 18 * s, Math.PI, 0.5, 12), ...circ(x + 22 * s, y, 14 * s, Math.PI * 1.45, 0.55, 10), [x - 22 * s, y + 14 * s]],
    ...[-16, 0, 16].map(dx => [[x + dx * s, y + 22 * s], [x + (dx - 4) * s, y + 34 * s]])],
  cup: (x, y, s) => [[[x - 18 * s, y - 16 * s], [x - 14 * s, y + 18 * s], [x + 14 * s, y + 18 * s], [x + 18 * s, y - 16 * s]], circ(x + 22 * s, y, 8 * s, -1.6, 0.5, 10), [[x - 6 * s, y - 22 * s], [x - 2 * s, y - 30 * s], [x - 6 * s, y - 38 * s]], [[x + 6 * s, y - 22 * s], [x + 10 * s, y - 30 * s], [x + 6 * s, y - 38 * s]]],
  umbrella: (x, y, s) => [[...circ(x, y, 30 * s, Math.PI, 0.5, 16), [x - 30 * s, y]], [[x, y - 30 * s], [x, y + 34 * s], [x - 4 * s, y + 40 * s], [x - 10 * s, y + 36 * s]]],
  heart: (x, y, s) => [Array.from({length: 33}, (_, i) => { const t = i / 32 * Math.PI * 2; return [x + 16 * Math.pow(Math.sin(t), 3) * 1.1 * s, y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 1.1 * s]; })],
  train: (x, y, s) => [[[x - 40 * s, y - 14 * s], [x + 34 * s, y - 14 * s], [x + 44 * s, y], [x + 44 * s, y + 14 * s], [x - 40 * s, y + 14 * s], [x - 40 * s, y - 14 * s]], ...[-28, -10, 8].map(dx => [[x + dx * s, y - 7 * s], [x + (dx + 12) * s, y - 7 * s], [x + (dx + 12) * s, y + 2 * s], [x + dx * s, y + 2 * s], [x + dx * s, y - 7 * s]]), circ(x - 24 * s, y + 18 * s, 5 * s, 0, 1, 10), circ(x + 26 * s, y + 18 * s, 5 * s, 0, 1, 10), [[x - 60 * s, y - 4 * s], [x - 48 * s, y - 4 * s]], [[x - 62 * s, y + 6 * s], [x - 50 * s, y + 6 * s]]],
  t21: (x, y, s) => [[[x - 20 * s, y - 10 * s], [x - 14 * s, y - 16 * s], [x - 6 * s, y - 14 * s], [x - 6 * s, y - 6 * s], [x - 20 * s, y + 14 * s], [x - 4 * s, y + 14 * s]], [[x + 6 * s, y - 10 * s], [x + 12 * s, y - 16 * s], [x + 12 * s, y + 14 * s]]],
};
// draw doodle strokes over [a,b] (static-camera shots only); returns strokes for reuse
function doodle(s, kind, x, y, sc, a, b, {lw = 3.4, color = INK_GLASS} = {}) {
  const strokes = DOODLE[kind](x, y, sc), lens = strokes.map(p => p.slice(1).reduce((m, q, i) => m + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0)), tot = lens.reduce((m, v) => m + v, 0);
  let t = a;
  strokes.forEach((points, i) => { const d = (b - a) * lens[i] / tot; s.layers.push({type: 'line', points, lw, color, t0: Math.max(s.start, Math.min(t, s.end - 0.01)), t1: s.end, draw: b <= s.start ? undefined : [t, t + d]}); t += d; });
  return strokes.map(points => ({points, lw, color}));
}
const done = (s, kind, x, y, sc, opts) => doodle(s, kind, x, y, sc, s.start - 1, s.start - 0.5, opts); // already drawn
function closeGlass(s, season, {long = false, drift = 20} = {}) {
  img(s, `assets/bg/view-${season}-blur.png`, 0, -60, 2560, {motion: t => ({x: -500 - drift * (t - s.start)})});
  img(s, long ? 'assets/bg/bg3-window-frame-long.png' : 'assets/bg/bg3-window-frame.png', 0, 0, 1280);
  img(s, 'assets/bg/bg3-fog.png', 0, 0, 1280);
}
const fogWin = (s, t0 = s.start, t1 = s.end, fadeIn = 0) => img(s, 'assets/bg/local-window-fog.png', 0, 0, 1280, {t0, t1, motion: fadeIn ? (t => ({alpha: Math.min(1, (t - t0) / fadeIn)})) : undefined});
const TOG = SEAT.together, AP = SEAT.apart;
const sitF = (who, extra = {}, opts = {}, tag = '', draw) => F(who, {...(who === 'him' ? P.sitBag : P.sit), ...extra}, KI, who === 'him' ? {backpack: false, beforeArms: LAP, ...opts} : opts, tag || (who === 'him' ? 'lap' : ''), draw);
const drawUpHer = {armR: [2.85, 3.02], gaze: [3, -6], head: 0.1};
const drawUpHim = {armL: [-2.85, -3.02], gaze: [-3, -6], head: -0.1};
const seq = (s, who, x, y, list) => list.forEach(([t0, t1, sp]) => pose(s, sp, x, y, t0, t1));

// ---- G: fog forms, she draws a sun (33.6-45.6), still apart ----
{
  const G1 = Shot(33.6, 38.3);
  views(G1, 'monsoon', {farStart: 600}); fogWin(G1, 33.6, 38.3, 1.0); localSet(G1, 'apart');
  seq(G1, 'him', AP.him, HIP_SIT, [[33.6, 35.8, sitF('him', {gaze: [0, -4]})], [35.8, 37.0, sitF('him', {gaze: [6, 0], head: 0.08})], [37.0, 38.3, sitF('him', {gaze: [6, -2], head: 0.08, mouth: 'o'})]]);
  seq(G1, 'her', AP.her, HIP_SIT, [[33.6, 34.8, sitF('her', {gaze: [0, -4]})], [34.8, 35.9, sitF('her', {gaze: [-6, 0], head: -0.08})], [35.9, 36.1, sitF('her', {gaze: [0, 2], eyes: 'closed'})], [36.1, 37.0, sitF('her', {gaze: [2, -4], mouth: 'smile', blush: true})], [37.0, 38.3, sitF('her', {...drawUpHer, mouth: 'smile'})]]);
  doodle(G1, 'sun', 935, 292, 0.5, 37.3, 38.25);
  const G2 = Shot(38.3, 42.4);
  closeGlass(G2, 'monsoon');
  doodle(G2, 'sun', 640, 300, 2.6, 38.5, 40.6, {lw: 10});
  doodle(G2, 'face', 640, 300, 2.6, 41.0, 41.8, {lw: 9});
  const G3 = Shot(42.4, 45.6);
  views(G3, 'monsoon', {farStart: 700}); fogWin(G3); localSet(G3, 'apart');
  done(G3, 'sun', 935, 292, 0.5); done(G3, 'face', 935, 292, 0.5, {lw: 3});
  seq(G3, 'him', AP.him, HIP_SIT, [[42.4, 42.9, sitF('him', {gaze: [6, -3], mouth: 'smile', blush: true})], [42.9, 44.6, sitF('him', {...drawUpHim, mouth: 'smile'})], [44.6, 45.6, sitF('him', {gaze: [6, 0], head: 0.08, mouth: 'smile'})]]);
  doodle(G3, 'cloud', 360, 290, 0.55, 43.1, 44.5);
  seq(G3, 'her', AP.her, HIP_SIT, [[42.4, 44.4, sitF('her', {gaze: [-6, 0], head: -0.08, mouth: 'smile'})], [44.4, 45.6, sitF('her', {gaze: [-6, -2], head: -0.1, mouth: 'big', blush: true})]]);
}
// ---- H: Chorus 1, side by side; seasons, drawings grow (45.6-65.12) ----
{
  const H1 = Shot(45.6, 51.2);
  views(H1, 'monsoon', {farStart: 900}); fogWin(H1); localSet(H1, 'together');
  seq(H1, 'him', TOG.him, HIP_SIT, [[45.6, 47.0, sitF('him', {gaze: [5, 0], head: 0.08, mouth: 'smile'})], [47.0, 49.6, sitF('him', {gaze: [5, -4], mouth: 'smile'})], [49.6, 51.2, sitF('him', {...drawUpHim, mouth: 'smile'})]]);
  seq(H1, 'her', TOG.her, HIP_SIT, [[45.6, 46.8, sitF('her', {gaze: [-5, 0], head: -0.08, mouth: 'smile', blush: true})], [46.8, 48.1, sitF('her', {gaze: [0, -4], mouth: 'smile'})], [48.1, 49.8, sitF('her', {...drawUpHer, mouth: 'smile'})], [49.8, 51.2, sitF('her', {gaze: [-5, -3], head: -0.08, mouth: 'smile'})]]);
  doodle(H1, 'cloud', 765, 290, 0.55, 48.2, 49.6);
  doodle(H1, 'sun', 515, 292, 0.5, 49.8, 51.1);
  const H2 = Shot(51.2, 58.1);
  closeGlass(H2, 'winter');
  done(H2, 'sun', 470, 230, 2.0, {lw: 9}); done(H2, 'cloud', 840, 210, 2.0, {lw: 9});
  doodle(H2, 'cup', 330, 450, 2.0, 51.4, 52.8, {lw: 9});
  doodle(H2, 'umbrella', 930, 440, 2.0, 53.0, 54.4, {lw: 9});
  doodle(H2, 'heart', 640, 300, 2.2, 54.6, 56.2, {lw: 9});
  doodle(H2, 'face', 470, 230, 2.0, 56.6, 57.6, {lw: 8});
  const H3 = Shot(58.1, 65.12);
  views(H3, 'spring', {near: 270, far: 30}); fogWin(H3); localSet(H3, 'together');
  done(H3, 'sun', 515, 292, 0.5); done(H3, 'heart', 570, 300, 0.5); done(H3, 'cloud', 765, 290, 0.55);
  seq(H3, 'him', TOG.him, HIP_SIT, [[58.1, 59.6, sitF('him', {gaze: [0, -2], mouth: 'smile'})], [59.6, 61.0, sitF('him', {gaze: [6, 0], head: 0.1, mouth: 'smile', blush: true})], [61.0, 63.4, sitF('him', {gaze: [0, -6], mouth: 'smile'})], [63.4, 64.3, sitF('him', {gaze: [5, 0], head: 0.06, mouth: 'smile', blush: true})], [64.3, 64.45, sitF('him', {eyes: 'closed', mouth: 'smile'})], [64.45, 65.12, sitF('him', {gaze: [5, 0], mouth: 'smile'})]]);
  seq(H3, 'her', TOG.her, HIP_SIT, [[58.1, 58.3, sitF('her', {mouth: 'smile'})], [58.3, 61.0, sitF('her', {lean: -0.06, head: -0.16, gaze: [-5, 0], mouth: 'smile', blush: true})], [61.0, 63.4, sitF('her', {gaze: [0, -6], mouth: 'smile'})], [63.4, 65.12, sitF('her', {gaze: [-5, 0], head: -0.1, mouth: 'smile', eyes: 'closed', blush: true})]]);
  H3.layers.push({type: 'line', points: [[692, 150], [722, 148], [750, 151]], lw: 3, color: C.rust, t0: 62.1, t1: 65.12, draw: [62.1, 62.8]});
}
// ---- T: tunnel (65.12-69.0) ----
{
  const T = Shot(65.12, 69.0);
  views(T, 'spring', {near: 270, far: 30});
  img(T, 'assets/bg/view-tunnel.png', 0, 0, 2560, {t0: 65.3, t1: 68.5, motion: t => ({x: -wrap(900 * (t - 65.3), 1280), alpha: Math.min(1, (t - 65.3) / 0.25, (68.5 - t) / 0.3)})});
  localSet(T, 'together');
  seq(T, 'him', TOG.him, HIP_SIT, [[65.12, 67.5, sitF('him', {gaze: [0, -4], mouth: 'line'})], [67.5, 69.0, sitF('him', {gaze: [5, 0], head: 0.08, mouth: 'smile'})]]);
  seq(T, 'her', TOG.her, HIP_SIT, [[65.12, 66.3, sitF('her', {gaze: [0, -4]})], [66.3, 69.0, sitF('her', {gaze: [-5, 0], head: -0.1, mouth: 'smile', blush: true})]]);
}
// ---- I: her side, watching him (69.0-80.0) ----
const CUP = (who, target) => (c, r, j) => cup(c, r, j.handR[0] + 2, j.handR[1] - 2, 0.9);
{
  const I1 = Shot(69.0, 74.0, camEase(69.0, 74.0, {z: 1.45, cx: 650, cy: 440}, {z: 1.55, cx: 660, cy: 440}));
  views(I1, 'spring'); localSet(I1, 'together');
  const sipT = ik([TOG.him + 8 * KI, HIP_SIT - 70 * KI], TOG.him, HIP_SIT, KI, 'R'), holdT = ik([TOG.him + 16 * KI, HIP_SIT - 34 * KI], TOG.him, HIP_SIT, KI, 'R');
  const himCup = (extra, tag) => F('him', {...P.sitBag, armR: holdT, ...extra}, KI, {backpack: false, beforeArms: LAP}, 'cup' + tag, CUP());
  seq(I1, 'him', TOG.him, HIP_SIT, [[69.0, 70.3, himCup({gaze: [0, 2]}, 'a')], [70.3, 71.5, himCup({armR: sipT, eyes: 'closed'}, 'b')], [71.5, 72.3, himCup({gaze: [0, -3], mouth: 'smile'}, 'c')], [72.3, 74.0, himCup({eyes: 'closed', mouth: 'o'}, 'd')]]);
  seq(I1, 'her', TOG.her, HIP_SIT, [[69.0, 71.0, sitF('her', {gaze: [-6, 0], head: -0.1, mouth: 'smile'})], [71.0, 71.15, sitF('her', {gaze: [-6, 0], head: -0.1, eyes: 'closed'})], [71.15, 74.0, sitF('her', {gaze: [-6, 0], head: -0.12, mouth: 'smile', blush: true})]]);
  const I2 = Shot(74.0, 80.0, camHold({z: 1.7, cx: 590, cy: 430}));
  views(I2, 'spring', {farStart: 500}); localSet(I2, 'together');
  const pt = k => F('him', {...P.sitBag, armR: ik([TOG.him + (30 + 14 * k) * KI, HIP_SIT - (120 - 6 * k) * KI], TOG.him, HIP_SIT, KI, 'R'), gaze: [3 + k, -6], head: 0.05}, KI, {backpack: false, beforeArms: LAP}, 'count' + k);
  seq(I2, 'him', TOG.him, HIP_SIT, [[74.0, 74.5, sitF('him', {gaze: [2, -6]})], [74.5, 75.7, pt(0)], [75.7, 76.9, pt(1)], [76.9, 78.5, pt(2)], [78.5, 80.0, sitF('him', {gaze: [6, 0], head: 0.1, mouth: 'o', blush: true})]]);
  seq(I2, 'her', TOG.her, HIP_SIT, [[74.0, 79.2, sitF('her', {gaze: [-6, -2], head: -0.12, mouth: 'smile', blush: true})], [79.2, 80.0, sitF('her', {gaze: [3, -5], head: 0.06, mouth: 'line', blush: true})]]);
}
// ---- J: his room, the letter and the suitcase (80.0-91.2) ----
const KR = 1.6, HIP_R = 650 - 73 * KR;
{
  const LET = (c, r, j) => letter(c, r, j.handR[0] - 6, j.handR[1] - 40, 0.8, 0.08);
  const J1 = Shot(80.0, 85.6, camEase(80.0, 85.6, {z: 1.0, cx: 640, cy: 360}, {z: 1.05, cx: 600, cy: 370}));
  img(J1, 'assets/bg/bg5-room.png', 0, 0, 1280);
  const lp = (extra, tag) => F('him', {...P.letter, ...extra}, KR, {backpack: false}, 'letter' + tag, LET);
  seq(J1, 'him', 470, HIP_R, [[80.0, 80.6, F('him', {gaze: [0, 2], mouth: 'line'}, KR, {backpack: false})], [80.6, 82.0, lp({}, 'a')], [82.0, 83.4, lp({eyes: 'down', gaze: [3, 5]}, 'b')], [83.4, 84.6, lp({eyes: 'dot', gaze: [-5, -4], head: -0.06}, 'c')], [84.6, 85.6, lp({eyes: 'closed', mouth: 'sad'}, 'd')]]);
  const J2 = Shot(85.6, 91.2, camEase(88.6, 91.2, {z: 1.0, cx: 640, cy: 360}, {z: 1.3, cx: 660, cy: 300}));
  img(J2, 'assets/bg/bg5-room.png', 0, 0, 1280);
  walk(J2, [walkR, walkRm, walkR2, walkRm].map(p => F('him', {...p}, KR, {backpack: false})), 85.8, 87.2, 470, 600, HIP_R, 0.14);
  pose(J2, F('him', {gaze: [3, 3], mouth: 'sad'}, KR, {backpack: false}), 470, HIP_R, 85.6, 85.8);
  const reach = ik([700, 432], 600, HIP_R, KR, 'R');
  pose(J2, F('him', {armR: reach, gaze: [5, 4], eyes: 'down', mouth: 'sad'}, KR, {backpack: false}, 'letterdown', (c, r, j) => letter(c, r, j.handR[0] - 30, j.handR[1] - 10, 0.8, 1.45)), 600, HIP_R, 87.2, 88.0);
  img(J2, 'assets/sprites/letter-on-case.png', 676, 396, 90, {t0: 88.0});
  seq(J2, 'him', 600, HIP_R, [[88.0, 88.6, F('him', {gaze: [5, 4], eyes: 'down', mouth: 'sad'}, KR, {backpack: false})], [88.6, 89.6, F('him', {gaze: [5, -6], head: 0.06, mouth: 'line'}, KR, {backpack: false})], [89.6, 91.2, F('him', {gaze: [5, -6], head: 0.06, mouth: 'smile', blush: true}, KR, {backpack: false})]]);
}
// ---- K: hands almost touch (91.2-102.6), winter outside ----
{
  const K = Shot(91.2, 102.6, camHold({z: 1.5, cx: 640, cy: 470}));
  views(K, 'winter'); localSet(K, 'together');
  const HY = HIP_SIT + 2;
  const hHand = x => F('him', {...P.sit, lean: 0.06, armR: ik([x, HY], TOG.him, HIP_SIT, KI, 'R', 0.06), gaze: [4, 4], mouth: 'line'}, KI, {backpack: false}, 'hand');
  const sHand = x => F('her', {...P.sit, lean: -0.06, armL: ik([x, HY], TOG.her, HIP_SIT, KI, 'L', -0.06), gaze: [-4, 4], mouth: 'line'}, KI, {}, 'hand');
  seq(K, 'him', TOG.him, HIP_SIT, [[91.2, 91.4, sitF('him', {gaze: [0, 2]}, {beforeArms: undefined}, 'nolap')], [91.4, 94.2, hHand(606)], [94.2, 96.6, hHand(618)], [96.6, 99.6, hHand(626)], [99.6, 100.4, sitF('him', {gaze: [0, 4], eyes: 'down', mouth: 'sad'}, {beforeArms: undefined}, 'nolap')], [100.4, 102.6, sitF('him', {gaze: [-5, -2], head: -0.06, mouth: 'sad'}, {beforeArms: undefined}, 'nolap')]]);
  seq(K, 'her', TOG.her, HIP_SIT, [[91.2, 92.8, sitF('her', {gaze: [-4, 4]})], [92.8, 95.4, sHand(674)], [95.4, 96.6, sHand(662)], [96.6, 97.6, sHand(654)], [97.6, 99.6, F('her', {...P.sit, lean: -0.06, armL: ik([654, HY], TOG.her, HIP_SIT, KI, 'L', -0.06), gaze: [-2, 5], eyes: 'down', blush: true}, KI, {}, 'hand')], [99.6, 101.6, sitF('her', {gaze: [5, -2], head: 0.06, mouth: 'sad'})], [101.6, 102.6, sitF('her', {gaze: [-5, 0], head: -0.08, mouth: 'sad'})]]);
}
// ---- L: Chorus 2, the last weeks of rides (102.6-124.3) ----
{
  const L1 = Shot(102.6, 108.2);
  views(L1, 'winter', {farStart: 700}); fogWin(L1); localSet(L1, 'together');
  text(L1, 'the last weeks', 70, 360, 40, {color: '#3a3830'});
  seq(L1, 'him', TOG.him, HIP_SIT, [[102.6, 104.2, sitF('him', {gaze: [5, 0], head: 0.06, mouth: 'line'})], [104.2, 106.5, sitF('him', {gaze: [5, -4], mouth: 'smile'})], [106.5, 108.2, sitF('him', {...drawUpHim, mouth: 'smile'})]]);
  seq(L1, 'her', TOG.her, HIP_SIT, [[102.6, 104.9, sitF('her', {gaze: [-5, 0], head: -0.08, mouth: 'sad'})], [104.9, 106.5, sitF('her', {...drawUpHer, mouth: 'smile'})], [106.5, 108.2, sitF('her', {gaze: [-5, -3], head: -0.08, mouth: 'smile'})]]);
  doodle(L1, 'cloud', 765, 290, 0.55, 105.0, 106.4);
  doodle(L1, 'sun', 515, 292, 0.5, 106.6, 108.0);
  const L2 = Shot(108.2, 115.2);
  closeGlass(L2, 'winter');
  done(L2, 'sun', 470, 230, 2.0, {lw: 9}); done(L2, 'cloud', 840, 210, 2.0, {lw: 9});
  doodle(L2, 'train', 700, 470, 2.4, 108.4, 110.6, {lw: 9});
  doodle(L2, 'heart', 640, 290, 2.2, 111.4, 113.0, {lw: 9});
  doodle(L2, 't21', 300, 470, 2.0, 113.4, 114.8, {lw: 9});
  [['Monday', 115.2, 116.5], ['Wednesday', 116.5, 117.8], ['Friday', 117.8, 119.0]].forEach(([day, a, b], i) => {
    const L3 = Shot(a, b);
    views(L3, 'spring', {near: 270, far: 30, farStart: 300 + i * 300}); localSet(L3, 'together');
    text(L3, day, 70, 360, 44, {color: '#3a3830'});
    const him = [{gaze: [5, 0], head: 0.08, mouth: 'smile'}, {gaze: [0, 4], eyes: 'down', mouth: 'line'}, {gaze: [5, -2], mouth: 'sad'}][i];
    const her = [{gaze: [-5, 0], head: -0.08, mouth: 'smile', blush: true}, {gaze: [0, -5], mouth: 'line'}, {gaze: [-5, 0], head: -0.12, mouth: 'sad'}][i];
    pose(L3, sitF('him', him), TOG.him, HIP_SIT, a, b);
    pose(L3, sitF('her', her), TOG.her, HIP_SIT, a, b - 0.3);
    pose(L3, sitF('her', {...her, eyes: 'closed'}), TOG.her, HIP_SIT, b - 0.3, b - 0.15);
    pose(L3, sitF('her', her), TOG.her, HIP_SIT, b - 0.15, b);
  });
  const L4 = Shot(119.0, 122.0, camHold({z: 1.5, cx: 640, cy: 320}));
  views(L4, 'spring', {near: 270, far: 30, farStart: 1300}); localSet(L4, 'together');
  seq(L4, 'him', TOG.him, HIP_SIT, [[119.0, 121.2, sitF('him', {gaze: [0, 4], eyes: 'down', mouth: 'sad'})], [121.2, 122.0, sitF('him', {gaze: [5, 0], head: 0.08, mouth: 'line'})]]);
  seq(L4, 'her', TOG.her, HIP_SIT, [[119.0, 120.4, sitF('her', {gaze: [-5, 0], head: -0.1, mouth: 'sad'})], [120.4, 122.0, sitF('her', {gaze: [-1, -7], head: 0, mouth: 'line'})]]);
  // the last ride begins: dawn platform, alone
  const LP = Shot(122.0, 124.3, camHold(PUSH));
  img(LP, 'assets/bg/bg1-platform.png', 0, 0, 1280); img(LP, clockFace(15), 798, 98, 84);
  boil(LP, rainP, 122.0, 124.3);
  text(LP, 'the last ride', 70, 140, 48, {color: '#3a3830'});
  walk(LP, himWalkR_P, 122.0, 124.0, -80, 400, HIP_P, 0.15);
  pose(LP, fig('him-p-front', 'him', {}, KP), 400, HIP_P, 124.0, 124.3);
}
// ---- M: her seat is empty; he waves at the fog (124.3-132.3) ----
{
  const M0 = Shot(124.3, 127.3, camEase(124.3, 127.3, {z: 1.6, cx: 700, cy: 330}, {z: 1.7, cx: 705, cy: 330}));
  views(M0, 'monsoon', {farStart: 400}); localSet(M0, 'together');
  seq(M0, 'him', TOG.him, HIP_SIT, [[124.3, 124.5, sitF('him', {gaze: [0, 2], mouth: 'line'})], [124.5, 126.4, sitF('him', {gaze: [6, 0], head: 0.1, mouth: 'line'})], [126.4, 127.3, sitF('him', {gaze: [0, 4], eyes: 'down', mouth: 'sad'})]]);
  const M1 = Shot(127.3, 132.3);
  views(M1, 'monsoon', {farStart: 600}); fogWin(M1); localSet(M1, 'together');
  const wv = k => F('him', {...P.sit, armR: k ? [2.2, 2.75] : [2.0, 2.45], gaze: [3, -6], head: 0.05, mouth: 'sad'}, KI, {backpack: false}, 'wave' + k);
  seq(M1, 'him', TOG.him, HIP_SIT, [[127.3, 127.5, sitF('him', {gaze: [0, 4], eyes: 'down', mouth: 'sad'})], [127.5, 128.8, sitF('him', {gaze: [2, -6], mouth: 'line'})], [128.8, 130.0, sitF('him', {gaze: [6, 0], head: 0.08, mouth: 'sad'})]]);
  for (let t = 130.0, k = 0; t < 131.3 - 1e-6; t += 0.22, k++) pose(M1, wv(k % 2), TOG.him, HIP_SIT, t, Math.min(131.3, t + 0.22));
  pose(M1, fig('him-i-stand-look', 'him', {gaze: [6, 0], head: 0.08}, KI, {backpack: false}), TOG.him, HIP_STAND, 131.3, 131.5);
  walk(M1, himWalkL_I, 131.5, 132.3, TOG.him, 160, HIP_STAND, 0.13);
}
// ---- N: night terminal, boards the long train (132.3-137.4) ----
{
  const N1 = Shot(132.3, 135.6);
  img(N1, 'assets/bg/bg6-terminal.png', 0, 0, 1280);
  const door = doorway();
  img(N1, longTrain(), 640 - TRAIN.door, 148, TRAIN.w);
  img(N1, door.open, 570, 194, 140); img(N1, door.left, 504, 194, 72); img(N1, door.right, 704, 194, 72);
  walk(N1, himWalkR_P, 132.3, 134.9, -80, 640, HIP_P, 0.14);
  pose(N1, fig('him-p-walkR0', 'him', walkR, KP), 640, HIP_P, 134.9, 135.6, t => { const u = (t - 134.9) / 0.7; return {hx: 640 + 10 * u, hy: HIP_P - 40 * u, alpha: 1 - u}; });
  const N2 = Shot(135.6, 137.4, camHold({z: 2.0, cx: 440, cy: 420}));
  views(N2, 'night'); img(N2, 'assets/bg/bg7-long-interior.png', 0, 0, 1280);
  seq(N2, 'him', 480, HIP_SIT, [[135.6, 136.4, sitF('him', {gaze: [0, 2], mouth: 'line'})], [136.4, 137.4, F('him', {...P.sitBag, armR: ik([480 + 22 * KI, HIP_SIT - 60 * KI], 480, HIP_SIT, KI, 'R'), gaze: [3, 4], eyes: 'down', mouth: 'line'}, KI, {backpack: false, beforeArms: LAP}, 'tix20', (c, r, j) => ticket(c, r, j.handR[0] - 8, j.handR[1] - 30, 0.8, '20'))]]);
}
// ---- O: a hand draws a sun on his window; it's her, ticket 21 (137.4-146.1) ----
const SUN_LONG = [600, 214];
{
  const O1 = Shot(137.4, 140.5);
  closeGlass(O1, 'night', {long: true, drift: 6});
  doodle(O1, 'sun', 640, 300, 2.6, 137.6, 139.7, {lw: 10});
  doodle(O1, 'face', 640, 300, 2.6, 139.8, 140.4, {lw: 9});
  const sunSprite = doodleSprite('long-sun', [...DOODLE.sun(...SUN_LONG, 0.5), ...DOODLE.face(...SUN_LONG, 0.5)].map(points => ({points, lw: 3.2, color: '#d9d2bf'})));
  const O2 = Shot(140.5, 143.5, camEase(141.6, 142.8, {z: 1.6, cx: 480, cy: 420}, {z: 1.6, cx: 760, cy: 420}));
  views(O2, 'night'); img(O2, 'assets/bg/bg7-long-interior.png', 0, 0, 1280); img(O2, sunSprite, 0, 0, 1280);
  seq(O2, 'him', 480, HIP_SIT, [[140.5, 141.3, sitF('him', {gaze: [2, -6], mouth: 'o'})], [141.3, 143.5, sitF('him', {gaze: [6, 0], head: 0.1, mouth: 'o'})]]);
  const herTix = (extra, tag) => F('her', {...P.sit, armR: ik([800 + 18 * KI, HIP_SIT - 92 * KI], 800, HIP_SIT, KI, 'R'), ...extra}, KI, {}, 'tix21' + tag, (c, r, j) => ticket(c, r, j.handR[0] - 8, j.handR[1] - 30, 0.9, '21'));
  seq(O2, 'her', 800, HIP_SIT, [[140.5, 142.4, sitF('her', {gaze: [-6, 0], head: -0.1, mouth: 'smile'})], [142.4, 143.5, herTix({mouth: 'smile', eyes: 'closed', blush: true}, 'a')]]);
  const O3 = Shot(143.5, 146.1);
  views(O3, 'night'); img(O3, 'assets/bg/bg7-long-interior.png', 0, 0, 1280); img(O3, sunSprite, 0, 0, 1280);
  const himTix = F('him', {...P.sit, armR: ik([480 + 18 * KI, HIP_SIT - 92 * KI], 480, HIP_SIT, KI, 'R'), gaze: [6, 0], head: 0.1, mouth: 'big', blush: true}, KI, {backpack: false}, 'tix20up', (c, r, j) => ticket(c, r, j.handR[0] - 8, j.handR[1] - 30, 0.9, '20'));
  seq(O3, 'him', 480, HIP_SIT, [[143.5, 143.8, sitF('him', {gaze: [6, 0], head: 0.1, mouth: 'o'})], [143.8, 146.1, himTix]]);
  seq(O3, 'her', 800, HIP_SIT, [[143.5, 144.9, herTix({gaze: [-6, 0], head: -0.1, mouth: 'big', blush: true}, 'b')], [144.9, 146.1, sitF('her', {gaze: [-6, 0], head: -0.12, mouth: 'smile', blush: true})]]);
}
// ---- P: they smile, the train leaves (146.1-154.0) ----
{
  const sunSprite = 'assets/sprites/doodle-long-sun.png';
  const P1 = Shot(146.1, 150.7);
  views(P1, 'night', {farStart: 300}); img(P1, 'assets/bg/bg7-long-interior.png', 0, 0, 1280); img(P1, sunSprite, 0, 0, 1280);
  seq(P1, 'him', 480, HIP_SIT, [[146.1, 147.8, sitF('him', {gaze: [0, -2], mouth: 'smile'})], [147.8, 149.3, sitF('him', {gaze: [6, 0], head: 0.1, mouth: 'smile', blush: true})], [149.3, 150.7, sitF('him', {gaze: [3, -6], mouth: 'smile'})]]);
  seq(P1, 'her', 800, HIP_SIT, [[146.1, 146.5, sitF('her', {gaze: [-6, 0], mouth: 'smile'})], [146.5, 149.3, sitF('her', {lean: -0.08, head: -0.18, gaze: [-6, 0], mouth: 'smile', blush: true})], [149.3, 150.7, sitF('her', {armL: [-2.6, -2.9], gaze: [-4, -6], head: -0.06, mouth: 'smile'})]]);
  const P2 = Shot(150.7, 154.0, camHold({z: 1.5, cx: 640, cy: 330}));
  views(P2, 'night', {farStart: 380}); img(P2, 'assets/bg/bg7-long-interior.png', 0, 0, 1280); img(P2, sunSprite, 0, 0, 1280);
  seq(P2, 'him', 480, HIP_SIT, [[150.7, 151.0, sitF('him', {gaze: [5, 0], mouth: 'smile'})], [151.0, 152.6, sitF('him', {gaze: [0, -7], mouth: 'smile'})], [152.6, 154.0, sitF('him', {gaze: [6, 0], head: 0.12, mouth: 'smile', blush: true})]]);
  seq(P2, 'her', 800, HIP_SIT, [[150.7, 151.0, sitF('her', {gaze: [-5, 0], mouth: 'smile'})], [151.0, 152.2, sitF('her', {gaze: [0, -7], mouth: 'smile'})], [152.2, 153.3, sitF('her', {lean: -0.08, head: -0.18, gaze: [-6, 0], mouth: 'smile', blush: true})], [153.3, 153.45, sitF('her', {lean: -0.08, head: -0.18, eyes: 'closed', mouth: 'smile', blush: true})], [153.45, 154.0, sitF('her', {lean: -0.08, head: -0.18, gaze: [-6, 0], mouth: 'smile', blush: true})]]);
}
// ---- Q: the train into the night; end text (154.0-end) ----
{
  const Q = Shot(154.0, R3(DUR + 0.0002));
  img(Q, 'assets/bg/view-night-far.png', -500, 0, 2560, {motion: t => ({x: -500 - 6 * (t - 154)})});
  Q.layers.push({type: 'line', points: [[-20, 474], [1300, 472]], lw: 3, color: '#4c5670', t0: 154.0, t1: Q.end});
  for (let x = -10; x < 1290; x += 26) Q.layers.push({type: 'line', points: [[x, 476], [x + 8, 482]], lw: 2, color: '#3a4258', t0: 154.0, t1: Q.end});
  const tw = TRAIN.w * 0.32;
  img(Q, longTrain(), 1300, 470 - TRAIN.h * 0.32, tw, {motion: t => ({x: 1300 - 330 * (t - 154)})});
  const fade = t => Math.min(1, (t - 155.2) / 1.0);
  img(Q, 'assets/sprites/end-card.png', 290, 60, 700, {t0: 155.2, screen: true, motion: t => ({alpha: fade(t)})});
}

// ---------- manifest ----------
const captions = JSON.parse(fs.readFileSync(new URL('./lyric_captions.json', import.meta.url))).captions;
const sfx = [
  {time: 2.6, kind: 'tap', gain: 0.02},
  ...[4.8, 5.3, 5.8, 6.3, 6.8].map(time => ({time, kind: 'tap', gain: 0.008})),
  {time: 11.2, kind: 'chime', gain: 0.03},
  {time: 16.9, kind: 'tap', gain: 0.022},
  {time: 19.6, kind: 'tap', gain: 0.014},
  {time: 28.0, kind: 'paper', gain: 0.016},
  {time: 28.45, kind: 'tap', gain: 0.012},
  ...[29.6, 30.9, 32.2].map(time => ({time, kind: 'paper', gain: 0.012})),
  ...[37.3, 38.5, 43.1, 48.2, 49.8, 51.4, 53.0, 54.6, 105.0, 106.6, 108.4, 111.4, 113.4, 137.6].map(time => ({time, kind: 'paper', gain: 0.008})),
  {time: 62.1, kind: 'pop', gain: 0.01},
  {time: 88.0, kind: 'paper', gain: 0.012},
  ...[115.2, 116.5, 117.8].map(time => ({time, kind: 'paper', gain: 0.012})),
  {time: 142.4, kind: 'chime', gain: 0.022},
];
const project = {
  version: 1, style: 'B2', width: 1920, height: 1080, fps: FPS,
  voice: {path: 'song.mp3', lead: 0, tail: 0},
  music: {path: 'audio/ambience.wav', gain: 0.2},
  captions, shots: compile(), sfx,
};
fs.writeFileSync(new URL('./project.json', import.meta.url), JSON.stringify(project));
console.log(JSON.stringify({shots: project.shots.length, layers: project.shots.reduce((a, s) => a + s.layers.length, 0), bytes: JSON.stringify(project).length}));
