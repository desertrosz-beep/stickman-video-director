// Seat No. 21 — shot authoring -> project.json for the bundled B2 runtime.
// Usage: node build.mjs  (writes sprites + project.json; renderer does the rest)
import fs from 'node:fs';
import {P} from './art/poses.mjs';
import {titleCard, fig, bagInHand, bagOnSeat, localTrain, TRAIN, doorway, rainFrames, clockFace, cup, umbrellaProp} from './art/sprites.mjs';
import {backpack, rng} from './art/lib.mjs';
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
const STOPS = [[22.4, 23.0, 26.0, 26.8]]; // decel start, stopped, accel start, full speed
function speed(t) { for (const [a, b, c, d] of STOPS) { if (t >= a && t < b) return 1 - (t - a) / (b - a); if (t >= b && t < c) return 0; if (t >= c && t < d) return (t - c) / (d - c); } return 1; }
const DIST = []; { let d = 0; for (let i = 0; i <= DUR * 120; i++) { DIST.push(d); d += speed(i / 120) / 120; } }
const dist = t => DIST[Math.max(0, Math.min(DIST.length - 1, Math.round(t * 120)))];
const wrap = (v, p) => ((v % p) + p) % p;
function views(s, season, {near = 150, far = 14, farStart = 150} = {}) {
  img(s, `assets/bg/view-${season}-far.png`, 0, -40, 2560, {motion: t => ({x: -farStart - far * dist(t)})});
  for (const i of [0, 1]) img(s, `assets/bg/view-${season}-near.png`, 0, -40, 2560, {motion: t => ({x: -wrap(near * dist(t), 2560) + 2560 * i})});
}
const SEAT = {apart: {him: 380, her: 900}, together: {him: 560, her: 720}};
function localSet(s, layout, {hiRes = false} = {}) {
  img(s, hiRes ? 'assets/bg/bg2-local-interior@3x.png' : 'assets/bg/bg2-local-interior.png', 0, 0, 1280);
  for (const [who, n] of [['him', '20'], ['her', '21']]) img(s, `assets/props/plaque-${n}.png`, SEAT[layout][who] - 32, 96, 64);
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
// ---------- Shot E: close on seat 21 — he moves the bag, she sits (27.1-29.6) ----------
{
  const CAM = {z: 1.55, cx: 860, cy: 452};
  const E = Shot(27.1, 29.6, camEase(27.1, 29.6, CAM, {z: 1.6, cx: 870, cy: 452}));
  views(E, 'monsoon'); localSet(E, 'apart', {hiRes: true});
  img(E, bagSeat.path, BAG_X - bagSeat.ax, 538 - bagSeat.ay, bagSeat.w, {t1: 27.6});
  pose(E, fig('him-i-place-empty2', 'him', {...placePose, gaze: [6, 2], mouth: 'line'}, KI, {backpack: false}), 820, HIP_STAND, 27.1, 27.6);
  pose(E, fig('him-i-lift-bag', 'him', {...placePose, gaze: [7, -1], head: 0.12, mouth: 'smile', blush: true}, KI, {backpack: false}, (c, r, j) => bagInHand(c, r, j)), 820, HIP_STAND, 27.6, 28.2);
  pose(E, fig('her-i-front-him2', 'her', {gaze: [-6, 0], head: -0.1, mouth: 'o'}, KI), 1010, HIP_STAND, 27.1, 28.0);
  pose(E, fig('her-i-sit-smile', 'her', {...P.sitSmile, gaze: [-6, 0], head: -0.08, blush: true}, KI), 900, HIP_SIT, 28.0, 29.6, t => ({hx: 900, hy: HIP_SIT}));
  walk(E, himWalkL_I, 28.2, 29.6, 820, 420, HIP_STAND, 0.14);
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

// ---------- manifest ----------
const captions = JSON.parse(fs.readFileSync(new URL('./lyric_captions.json', import.meta.url))).captions;
const sfx = [
  {time: 2.6, kind: 'tap', gain: 0.02},
  ...[4.8, 5.3, 5.8, 6.3, 6.8].map(time => ({time, kind: 'tap', gain: 0.008})),
  {time: 11.2, kind: 'chime', gain: 0.03},
  {time: 16.9, kind: 'tap', gain: 0.022},
  {time: 19.6, kind: 'tap', gain: 0.014},
  {time: 27.6, kind: 'paper', gain: 0.016},
  {time: 28.0, kind: 'tap', gain: 0.012},
  ...[29.6, 30.9, 32.2].map(time => ({time, kind: 'paper', gain: 0.012})),
];
const project = {
  version: 1, style: 'B2', width: 1920, height: 1080, fps: FPS,
  voice: {path: 'song.mp3', lead: 0, tail: 0},
  music: {path: 'audio/ambience.wav', gain: 0.2},
  captions, shots: compile(), sfx,
};
fs.writeFileSync(new URL('./project.json', import.meta.url), JSON.stringify(project));
console.log(JSON.stringify({shots: project.shots.length, layers: project.shots.reduce((a, s) => a + s.layers.length, 0), bytes: JSON.stringify(project).length}));
