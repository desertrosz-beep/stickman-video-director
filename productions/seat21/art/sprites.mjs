// Sprite factory for scene layers: posed characters, props, train, rain, clock.
// All sprites are transparent PNGs drawn at high pixel density so camera push-ins stay crisp.
import fs from 'node:fs';
import {GlobalFonts} from './canvas.mjs';
import {C, canvas, save, rng, figure, backpack, rect, shape, line, ellipse, ellipsePts, rain, glow, handText, plaque, WARDROBE} from './lib.mjs';
GlobalFonts.registerFromPath('/home/user/stickman-video-director/skills/directing-stickman-videos/assets/fonts/Caveat.ttf', 'Hand');
GlobalFonts.registerFromPath('/home/user/stickman-video-director/skills/directing-stickman-videos/assets/fonts/NotoSans.ttf', 'Sign');
const ROOT = new URL('../', import.meta.url).pathname;
const SP = 'assets/sprites/';
fs.mkdirSync(ROOT + SP, {recursive: true});
const PX = 3; // pixels per scene design unit

// ---- characters ----
const BOX = {w: 160, h: 236, ax: 80, ay: 128}; // figure units; hip anchor
const made = new Map();
// Returns {path, w, ax, ay} in scene design units for a figure drawn at scale K.
export function fig(name, who, pose, K, opts = {}, extra) {
  const path = `${SP}${name}.png`;
  if (!made.has(path)) {
    const {cv, ctx} = canvas(BOX.w * K, BOX.h * K, PX);
    const r = rng([...name].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7));
    ctx.scale(K, K);
    const j = figure(ctx, r, who, BOX.ax, BOX.ay, pose, opts);
    if (extra) extra(ctx, r, j);
    save(cv, ROOT + path);
    made.set(path, true);
  }
  return {path, w: BOX.w * K, ax: BOX.ax * K, ay: BOX.ay * K};
}
// bag hanging from a hand (figure-unit coordinates)
export const bagInHand = (ctx, r, j, hand = 'handR') => backpack(ctx, r, j[hand][0] - 19.5, j[hand][1] + 50, 0.85);
export function bagOnSeat(K) { // standing on the cushion; anchor = bottom centre
  const path = `${SP}bag-on-seat.png`, s = 0.85;
  if (!made.has(path)) { const {cv, ctx} = canvas(60 * K, 70 * K, PX); ctx.scale(K, K); backpack(ctx, rng(5), 30 - 23 * s, 66, s); save(cv, ROOT + path); made.set(path, true); }
  return {path, w: 60 * K, ax: 30 * K, ay: 66 * K};
}

// ---- local train exterior (moves along the platform tracks) ----
export const TRAIN = {w: 2600, h: 330, door: 1240}; // design units; door centre in train-local x
const PAL = {
  local: {body: C.cream, lower: C.teal, stripe: C.mustard, win: '#c7d3d6', door: '#d9ddd4'},
  long: {body: C.maroon, lower: C.maroonDark, stripe: C.cream, win: '#f2d9a0', door: '#b0646b'},
};
export const localTrain = () => trainSprite('local');
export const longTrain = () => trainSprite('long');
function trainSprite(kind) {
  const pal = PAL[kind], path = `${SP}${kind}-train.png`;
  if (made.has(path)) return path;
  const {cv, ctx} = canvas(TRAIN.w, TRAIN.h, 1.5), r = rng(77);
  const top = 20, bot = 300;
  for (const [x0, x1] of [[0, 1290], [1310, 2600]]) {
    const nose = x0 === 0;
    const pts = nose ? [[x0 + 70, top], [x1, top], [x1, bot], [x0 + 6, bot], [x0, bot - 60], [x0 + 14, top + 60]] : [[x0, top], [x1, top], [x1, bot], [x0, bot]];
    shape(ctx, r, pts, {fill: pal.body, lw: 2.8, grain: 0.1});
    shape(ctx, r, nose ? [[x0 + 3, bot - 120], [x1, bot - 120], [x1, bot], [x0 + 6, bot], [x0, bot - 60]] : [[x0, bot - 120], [x1, bot - 120], [x1, bot], [x0, bot]], {fill: pal.lower, lw: 2.4, grain: 0.14});
    rect(ctx, r, x0 + (nose ? 60 : 0), top - 8, x1 - x0 - (nose ? 60 : 0), 14, {fill: '#9fa3a0', lw: 2, grain: 0.06});
    line(ctx, r, [[x0 + 20, bot - 128], [x1, bot - 128]], {lw: 5, color: pal.stripe});
    for (let x = x0 + (nose ? 230 : 90); x < x1 - 120; x += 175) {
      if (Math.abs(x + 60 - TRAIN.door) < 150 || Math.abs(x + 60 - (TRAIN.door + 1310)) < 150) continue;
      rect(ctx, r, x, top + 40, 120, 92, {fill: pal.win, lw: 2.2, grain: 0.04});
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#f2dfae'; ctx.fillRect(x + 6, top + 100, 108, 26); ctx.restore();
      line(ctx, r, [[x + 12, top + 50], [x + 40, top + 50]], {lw: 1.6, color: C.white, alpha: 0.8});
    }
    for (const d of [TRAIN.door, TRAIN.door + 1310]) if (d > x0 && d < x1) {
      rect(ctx, r, d - 70, top + 26, 140, bot - top - 32, {fill: pal.door, lw: 2.4, grain: 0.06});
      line(ctx, r, [[d, top + 28], [d, bot - 8]], {lw: 2.2});
      for (const s of [-1, 1]) rect(ctx, r, d + (s < 0 ? -58 : 12), top + 46, 46, 70, {fill: '#c7d3d6', lw: 1.8, grain: 0.04});
    }
    for (const bx of [x0 + 180, x1 - 260]) { rect(ctx, r, bx, bot, 160, 18, {fill: '#4a4844', lw: 2, grain: 0.1}); for (const wx of [bx + 30, bx + 130]) ellipse(ctx, r, wx, bot + 18, 18, 18, {fill: '#5b5852', lw: 2, grain: 0.05}); }
    if (nose) {
      shape(ctx, r, [[x0 + 30, top + 66], [x0 + 150, top + 40], [x0 + 160, top + 140], [x0 + 18, top + 140]], {fill: '#9fb1ba', lw: 2.2, grain: 0.04});
      glow(ctx, x0 + 22, bot - 80, 70, '#fff1c4', 0.9); ellipse(ctx, r, x0 + 22, bot - 80, 10, 10, {fill: '#fff6d8', lw: 1.8, grain: 0});
    }
  }
  line(ctx, r, [[1290, bot - 60], [1310, bot - 60]], {lw: 6, color: '#4a4844'});
  save(cv, ROOT + path); made.set(path, true); return path;
}
export function doorway() { // open doorway interior + two sliding panels (each 70 wide)
  const out = {open: `${SP}doorway-open.png`, left: `${SP}door-left.png`, right: `${SP}door-right.png`};
  if (made.has(out.open)) return out;
  const top = 20, bot = 300, h = bot - top - 32;
  { const {cv, ctx} = canvas(140, h, 1.5), r = rng(81); ctx.fillStyle = '#5d6b6a'; ctx.fillRect(0, 0, 140, h); glow(ctx, 70, 60, 90, '#f6dca0', 0.6); rect(ctx, r, 20, h - 40, 100, 40, {fill: '#82a8a2', lw: 1.6, grain: 0.06, alpha: 0.8}); for (const x of [30, 110]) { line(ctx, r, [[x, 0], [x, 20]], {lw: 1.4}); ellipse(ctx, r, x, 28, 6, 8, {lw: 2, grain: 0}); } save(cv, ROOT + out.open); }
  for (const [file, side] of [[out.left, -1], [out.right, 1]]) { const {cv, ctx} = canvas(72, h, 1.5), r = rng(side + 90); rect(ctx, r, 1, 1, 70, h - 2, {fill: '#d9ddd4', lw: 2.2, grain: 0.06}); rect(ctx, r, side < 0 ? 12 : 12, 20, 46, 70, {fill: '#c7d3d6', lw: 1.8, grain: 0.04}); save(cv, ROOT + file); }
  made.set(out.open, true); return out;
}

// ---- rain overlays (boiled: three variants alternate) ----
export function rainFrames(tag, {n = 360, alpha = 0.5, color = '#5f7486', len = 24, region = [0, 60, 1280, 720]} = {}) {
  return [0, 1, 2].map(i => {
    const path = `${SP}rain-${tag}-${i}.png`;
    if (!made.has(path)) { const {cv, ctx} = canvas(1280, 720, 1.5), r = rng(300 + i + tag.length * 10); rain(ctx, r, ...region, {n, len, alpha, color, lw: 1.5}); rain(ctx, r, ...region, {n: n / 3, len: len * 1.3, alpha: alpha * 0.9, color: '#f3efe6', lw: 1.3}); save(cv, ROOT + path); made.set(path, true); }
    return path;
  });
}
// ---- platform clock face overlay (6:14 -> 6:15) ----
export function clockFace(min) {
  const path = `${SP}clock-6-${min}.png`;
  if (!made.has(path)) {
    const {cv, ctx} = canvas(84, 84, 3), r = rng(140 + min), cx = 42, cy = 42;
    ellipse(ctx, r, cx, cy, 36, 36, {fill: C.white, lw: 2.6, grain: 0});
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(ctx, r, [[cx + Math.cos(a) * 29, cy + Math.sin(a) * 29], [cx + Math.cos(a) * 32, cy + Math.sin(a) * 32]], {lw: 1.6, amp: 0}); }
    const ha = -Math.PI / 2 + Math.PI * 2 * (6 + min / 60) / 12, ma = -Math.PI / 2 + Math.PI * 2 * min / 60;
    line(ctx, r, [[cx, cy], [cx + Math.cos(ha) * 16, cy + Math.sin(ha) * 16]], {lw: 3.2, amp: 0});
    line(ctx, r, [[cx, cy], [cx + Math.cos(ma) * 25, cy + Math.sin(ma) * 25]], {lw: 2.2, amp: 0});
    save(cv, ROOT + path); made.set(path, true);
  }
  return path;
}
export function plaqueSprite(n) { const path = `assets/props/plaque-${n}.png`; return path; }
// small handheld props
export function cup(ctx, r, x, y, s = 1) { shape(ctx, r, [[x - 8 * s, y - 14 * s], [x + 8 * s, y - 14 * s], [x + 6 * s, y + 4 * s], [x - 6 * s, y + 4 * s]], {fill: C.white, lw: 1.8, grain: 0}); line(ctx, r, ellipsePts(x + 10 * s, y - 6 * s, 5 * s, 5 * s, 10, -1.4, 1.4), {lw: 1.6}); for (const dx of [-3, 3]) line(ctx, r, [[x + dx * s, y - 18 * s], [x + (dx + 2) * s, y - 24 * s], [x + dx * s, y - 30 * s]], {lw: 1.2, color: C.greyDark}); }
export function umbrellaProp(K) {
  const path = `${SP}umbrella-closed.png`;
  if (!made.has(path)) { const {cv, ctx} = canvas(30 * K, 90 * K, PX), r = rng(44); ctx.scale(K, K); shape(ctx, r, [[15, 6], [24, 64], [6, 64]], {fill: C.rust, lw: 2, grain: 0.1}); line(ctx, r, [[15, 64], [15, 84], [10, 86]], {lw: 2.4}); line(ctx, r, [[15, 6], [15, 0]], {lw: 2}); save(cv, ROOT + path); made.set(path, true); }
  return {path, w: 30 * K};
}
export function heading(text) { return text; }
export function titleCard() { // hand-drawn paper tag with the film title
  const path = `${SP}title-card.png`;
  if (!made.has(path)) {
    const {cv, ctx} = canvas(440, 170, 3), r = rng(2100);
    shape(ctx, r, [[14, 18], [426, 10], [430, 156], [10, 160]], {fill: 'rgba(244,240,229,.96)', lw: 2.4, grain: 0.05});
    handText(ctx, 'Seat No. 21', 220, 72, {size: 76, align: 'center'});
    handText(ctx, 'every morning, 6:15', 220, 128, {size: 32, align: 'center', color: C.rustDark});
    line(ctx, r, [[140, 104], [300, 102]], {lw: 2, color: C.rust});
    save(cv, ROOT + path); made.set(path, true);
  }
  return path;
}
export function endCard() {
  const path = `${SP}end-card.png`;
  if (!made.has(path)) {
    const {cv, ctx} = canvas(700, 190, 3), r = rng(2160);
    shape(ctx, r, [[16, 20], [688, 10], [692, 176], [10, 182]], {fill: 'rgba(244,240,229,.95)', lw: 2.4, grain: 0.05});
    handText(ctx, 'Who would you save a seat for?', 350, 92, {size: 58, align: 'center'});
    line(ctx, r, [[250, 138], [450, 135]], {lw: 2.2, color: C.rust});
    save(cv, ROOT + path); made.set(path, true);
  }
  return path;
}
export function letterOnCase() {
  const path = `${SP}letter-on-case.png`;
  if (!made.has(path)) { const {cv, ctx} = canvas(90, 40, 3), r = rng(880); shape(ctx, r, [[6, 26], [70, 14], [84, 24], [20, 36]], {fill: C.white, lw: 1.8, grain: 0.04}); for (let i = 0; i < 3; i++) line(ctx, r, [[22 + i * 4, 28 - i * 3], [62 + i * 4, 20 - i * 3]], {lw: 1, color: C.inkSoft}); save(cv, ROOT + path); made.set(path, true); }
  return path;
}
