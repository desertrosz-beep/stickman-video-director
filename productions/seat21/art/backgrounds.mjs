// Seven character-free environments for "Seat No. 21" (B2 Colorful Hand-Drawn).
// Writes layered PNGs into assets/bg at 1.5x the 1280x720 design plane.
import {GlobalFonts} from './canvas.mjs';
import {C, S, canvas, save, rng, shape, rect, ellipse, line, ellipsePts, paperGrain, handText, rain, glow, vgrad, pencil} from './lib.mjs';
GlobalFonts.registerFromPath('/home/user/stickman-video-director/skills/directing-stickman-videos/assets/fonts/Caveat.ttf', 'Hand');
GlobalFonts.registerFromPath('/home/user/stickman-video-director/skills/directing-stickman-videos/assets/fonts/NotoSans.ttf', 'Sign');
const sign = (ctx, t, x, y, size, color = C.ink, align = 'center') => { ctx.save(); ctx.font = `600 ${size}px Sign`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); ctx.restore(); };
const OUT = new URL('../assets/bg/', import.meta.url).pathname;
const W = 1280, H = 720;

export function rrPts(x, y, w, h, rad, n = 6) {
  const pts = [], c = [[x + w - rad, y + rad, -Math.PI / 2], [x + w - rad, y + h - rad, 0], [x + rad, y + h - rad, Math.PI / 2], [x + rad, y + rad, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + Math.PI / 2 * i / n; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  return pts;
}
function cut(ctx, pts) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.fill(); ctx.restore(); }
function paper(ctx, r, w = W, h = H, color = C.paper) { ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); }
function hills(ctx, r, y, amp, color, w, {alpha = 1, step = 60, grain = 0.08} = {}) {
  const pts = [[0, H]]; for (let x = 0; x <= w + step; x += step) pts.push([x, y - amp * (0.5 + 0.5 * Math.sin(x * 0.004 + r() * 0.6) * Math.sin(x * 0.0017 + 1))]);
  pts.push([w, H]); shape(ctx, r, pts, {fill: color, lw: 1.8, grain, alpha, outlineAlpha: 0.7});
}
function cloud(ctx, r, x, y, s, fill, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const puffs = [[-48, 6, 30], [-18, -8, 38], [20, -4, 34], [50, 8, 26], [0, 12, 40]];
  ctx.fillStyle = fill; ctx.beginPath(); for (const [dx, dy, rr] of puffs) { ctx.moveTo(x + dx * s + rr * s, y + dy * s); ctx.ellipse(x + dx * s, y + dy * s, rr * s, rr * s * 0.7, 0, 0, 6.3); } ctx.fill();
  ctx.globalAlpha *= 0.5; for (const [dx, dy, rr] of puffs.slice(0, 4)) line(ctx, r, ellipsePts(x + dx * s, y + dy * s, rr * s, rr * s * 0.7, 18, Math.PI * 1.05, Math.PI * 1.95), {lw: 1.4, color: C.greyDark});
  ctx.restore();
}
function pole(ctx, r, x, top, bottom, color = C.woodDark) {
  line(ctx, r, [[x, top], [x + 2, bottom]], {lw: 6, color});
  line(ctx, r, [[x - 22, top + 18], [x + 24, top + 16]], {lw: 3.5, color});
}
function palm(ctx, r, x, base, h, color = C.sageDark) {
  line(ctx, r, [[x, base], [x + 6, base - h * 0.5], [x + 3, base - h]], {lw: 5, color: C.woodDark});
  for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6 + 0.1; line(ctx, r, [[x + 3, base - h], [x + 3 + Math.cos(a) * 30, base - h + Math.sin(a) * 18 - 4], [x + 3 + Math.cos(a) * 52, base - h + Math.sin(a) * 14 + 16]], {lw: 4, color}); }
}
function tree(ctx, r, x, base, h, crown, {bare = false, blossom = false, alpha = 1} = {}) {
  ctx.save(); ctx.globalAlpha *= alpha;
  line(ctx, r, [[x, base], [x - 2, base - h]], {lw: 5, color: C.woodDark});
  if (bare) { for (let i = 0; i < 6; i++) { const y = base - h * (0.45 + i * 0.1), d = (i % 2 ? 1 : -1); line(ctx, r, [[x - 1, y], [x + d * (18 + i * 2), y - 22], [x + d * (26 + i * 3), y - 34]], {lw: 2.2, color: C.woodDark}); } }
  else ellipse(ctx, r, x - 2, base - h - crown * 0.5, crown, crown * 0.8, {fill: crown && blossom ? C.blossom : C.sage, lw: 2, grain: 0.12});
  if (blossom) { ctx.fillStyle = '#f6d3d5'; for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(x - 2 + (r() - .5) * crown * 1.6, base - h - crown * 0.5 + (r() - .5) * crown * 1.2, 2 + r() * 2, 0, 6.3); ctx.fill(); } }
  ctx.restore();
}

// ---------- 1. rainy dawn platform ----------
function platform() {
  const {cv, ctx} = canvas(W, H), r = rng(101);
  vgrad(ctx, 0, 0, W, 380, [[0, '#aab7c2'], [0.55, '#d4cfc6'], [1, '#efcfae']]);
  glow(ctx, 900, 360, 520, '#f2a868', 0.75);
  glow(ctx, 900, 350, 240, '#f8cf8f', 0.9);
  ellipse(ctx, r, 900, 342, 40, 40, {fill: '#f7c983', stroke: null, grain: 0});
  for (let i = 0; i < 5; i++) line(ctx, r, [[560 + i * 40, 300 + i * 12], [1240 - i * 30, 298 + i * 12]], {lw: 2, color: '#f6c690', alpha: 0.45});
  // distant city
  for (let i = 0; i < 16; i++) { const x = i * 84 - 20 + r() * 20, h = 50 + r() * 90; rect(ctx, r, x, 360 - h, 60 + r() * 30, h + 20, {fill: '#9aa6b0', lw: 1.4, grain: 0.05, alpha: 0.55, outlineAlpha: 0.4}); for (let k = 0; k < 4; k++) if (r() < 0.5) { ctx.fillStyle = 'rgba(246,214,150,.6)'; ctx.fillRect(x + 10 + r() * 40, 360 - h + 12 + r() * (h - 20), 6, 8); } }
  // back wall / fence
  rect(ctx, r, -10, 345, W + 20, 40, {fill: C.sageDark, lw: 2, grain: 0.12, alpha: 0.9});
  for (let x = 20; x < W; x += 46) line(ctx, r, [[x, 347], [x, 383]], {lw: 1.2, color: C.inkSoft});
  // tracks band
  rect(ctx, r, -10, 385, W + 20, 92, {fill: '#a49882', lw: 2, grain: 0.18});
  for (let x = 0; x < W; x += 34) line(ctx, r, [[x, 432], [x + 10, 470]], {lw: 5, color: C.woodDark, alpha: 0.75});
  line(ctx, r, [[-10, 438], [W + 10, 436]], {lw: 4, color: '#6d6a63'});
  line(ctx, r, [[-10, 462], [W + 10, 461]], {lw: 4, color: '#6d6a63'});
  // platform
  shape(ctx, r, [[-10, 478], [W + 10, 478], [W + 10, H + 10], [-10, H + 10]], {fill: C.sand, lw: 2.4, grain: 0.12});
  rect(ctx, r, -10, 478, W + 20, 12, {fill: C.cream, lw: 1.8, grain: 0.05});
  for (let x = 0; x < W; x += 40) rect(ctx, r, x, 497, 22, 8, {fill: C.mustard, stroke: null, grain: 0});
  for (let x = 0; x < W; x += 130) line(ctx, r, [[x, 520], [x - 40, H]], {lw: 1, color: C.inkSoft, alpha: 0.5});
  // puddles reflecting the dawn
  for (const [x, y, rx] of [[260, 600, 90], [760, 655, 120], [1110, 575, 60]]) { ellipse(ctx, r, x, y, rx, rx * 0.16, {fill: '#c9cfd0', lw: 1.4, grain: 0.04}); line(ctx, r, [[x - rx * 0.5, y - 2], [x + rx * 0.2, y - 2]], {lw: 1.4, color: C.white, alpha: 0.8}); }
  // canopy + columns
  shape(ctx, r, [[-10, -10], [W + 10, -10], [W + 10, 62], [-10, 74]], {fill: C.tealDark, lw: 2.6, grain: 0.14});
  for (let x = 30; x < W; x += 70) line(ctx, r, [[x, 62], [x + 10, 72]], {lw: 1.6, color: C.ink, alpha: 0.5});
  for (const x of [150, 640, 1130]) { rect(ctx, r, x - 9, 66, 18, 420, {fill: C.teal, lw: 2.2, grain: 0.1}); line(ctx, r, [[x - 9, 120], [x - 60, 70]], {lw: 3, color: C.tealDark}); line(ctx, r, [[x + 9, 120], [x + 60, 70]], {lw: 3, color: C.tealDark}); }
  // station sign + clock
  line(ctx, r, [[340, 70], [340, 112]], {lw: 2}); line(ctx, r, [[520, 70], [520, 112]], {lw: 2});
  rect(ctx, r, 310, 110, 240, 54, {fill: C.cream, lw: 2.4, grain: 0.06});
  sign(ctx, 'MAIN STREET', 430, 137, 26);
  line(ctx, r, [[840, 70], [840, 104]], {lw: 2});
  ellipse(ctx, r, 840, 140, 36, 36, {fill: C.white, lw: 2.6, grain: 0});
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(ctx, r, [[840 + Math.cos(a) * 29, 140 + Math.sin(a) * 29], [840 + Math.cos(a) * 32, 140 + Math.sin(a) * 32]], {lw: 1.6, amp: 0}); }
  const ha = -Math.PI / 2 + Math.PI * 2 * 6.25 / 12; // 6:15
  line(ctx, r, [[840, 140], [840 + Math.cos(ha) * 16, 140 + Math.sin(ha) * 16]], {lw: 3.2, amp: 0});
  line(ctx, r, [[840, 140], [840 + 24, 140]], {lw: 2.2, amp: 0});
  // lamp + bench
  glow(ctx, 1000, 205, 70, '#f8dca0', 0.6);
  line(ctx, r, [[1000, 72], [1000, 190]], {lw: 2.2}); shape(ctx, r, [[982, 190], [1018, 190], [1010, 214], [990, 214]], {fill: C.lamp, lw: 2, grain: 0});
  rect(ctx, r, 900, 520, 200, 14, {fill: C.wood, lw: 2, grain: 0.12}); rect(ctx, r, 900, 488, 200, 14, {fill: C.wood, lw: 2, grain: 0.12});
  line(ctx, r, [[915, 534], [912, 575]], {lw: 3}); line(ctx, r, [[1085, 534], [1088, 575]], {lw: 3});
  // wet platform: smeared reflections of columns, lamp and dawn sky
  for (const x of [150, 640, 1130]) { const g = ctx.createLinearGradient(0, 492, 0, 690); g.addColorStop(0, 'rgba(85,117,112,.55)'); g.addColorStop(1, 'rgba(85,117,112,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 10, 492); for (let y = 492; y <= 690; y += 12) ctx.lineTo(x - 10 + Math.sin(y * 0.15) * 3, y); for (let y = 690; y >= 492; y -= 12) ctx.lineTo(x + 10 + Math.sin(y * 0.15 + 1) * 3, y); ctx.fill(); }
  { const g = ctx.createLinearGradient(0, 492, 0, 700); g.addColorStop(0, 'rgba(248,210,140,.75)'); g.addColorStop(1, 'rgba(248,210,140,0)'); ctx.fillStyle = g; for (let k = 0; k < 4; k++) ctx.fillRect(990 + k * 6 - 6, 500 + k * 4, 4, 180 - k * 20); }
  { const g = ctx.createLinearGradient(0, 492, 0, 640); g.addColorStop(0, 'rgba(246,190,128,.45)'); g.addColorStop(1, 'rgba(246,190,128,0)'); ctx.fillStyle = g; ctx.fillRect(700, 492, 420, 150); }
  for (let i = 0; i < 26; i++) { const x = r() * W, y = 520 + r() * 190; line(ctx, r, [[x, y], [x + 30 + r() * 50, y]], {lw: 1.6, color: C.white, alpha: 0.7}); }
  for (let i = 0; i < 60; i++) { const x = r() * W, y = 500 + r() * 210; ctx.save(); ctx.strokeStyle = 'rgba(110,130,145,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 5 + r() * 6, 1.6 + r() * 1.5, 0, 0, 6.3); ctx.stroke(); ctx.restore(); }
  rain(ctx, r, 0, 60, W, H, {n: 900, len: 26, alpha: 0.6, color: '#5f7486', lw: 1.5});
  rain(ctx, r, 0, 60, W, H, {n: 260, len: 34, alpha: 0.55, color: '#f3efe6', lw: 1.3});
  paperGrain(ctx, r, W, H, 0.05);
  save(cv, OUT + 'bg1-platform.png');
}

// ---------- 2. local train interior (main set) ----------
export const LOCAL_WINDOWS = [rrPts(130, 104, 470, 232, 26), rrPts(680, 104, 470, 232, 26)];
function localInterior() {
  const {cv, ctx} = canvas(W, H), r = rng(202);
  paper(ctx, r, W, H, C.cream);
  rect(ctx, r, -10, -10, W + 20, 92, {fill: '#e6dcc2', lw: 2, grain: 0.08});
  // ad strip
  for (const [x, c] of [[160, C.peach], [470, C.blueLight], [780, C.sage], [1010, C.blossom]]) { rect(ctx, r, x, 14, 200, 46, {fill: c, lw: 1.8, grain: 0.08, alpha: 0.85}); ellipse(ctx, r, x + 30, 37, 12, 12, {fill: C.cream, lw: 1.6, grain: 0}); for (let k = 0; k < 2; k++) line(ctx, r, [[x + 56, 30 + k * 14], [x + 170 - k * 40, 30 + k * 14]], {lw: 2, color: C.inkSoft}); }
  line(ctx, r, [[-10, 78], [W + 10, 78]], {lw: 4, color: '#9a9a90'});
  for (let x = 90; x < W; x += 120) { line(ctx, r, [[x, 78], [x, 96]], {lw: 2}); ellipse(ctx, r, x, 108, 11, 13, {lw: 3, color: C.ink, grain: 0}); }
  // lower wall panel
  rect(ctx, r, -10, 336, W + 20, 280, {fill: C.sage, lw: 2.2, grain: 0.12});
  // windows: frame then cut glass
  for (const pts of LOCAL_WINDOWS) {
    const b = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1]))];
    shape(ctx, r, rrPts(b[0] - 14, b[1] - 14, 498, 260, 34), {fill: '#9fb1ba', lw: 2.4, grain: 0.1});
  }
  for (const pts of LOCAL_WINDOWS) { cut(ctx, pts); line(ctx, r, [...pts, pts[0]], {lw: 2.4}); }
  line(ctx, r, [[365, 104], [365, 336]], {lw: 0.01, alpha: 0});
  // window sills
  rect(ctx, r, 112, 336, 506, 12, {fill: '#c9c1aa', lw: 1.8, grain: 0.05}); rect(ctx, r, 662, 336, 506, 12, {fill: '#c9c1aa', lw: 1.8, grain: 0.05});
  // bench backrest + seat (long commuter bench; seats 20 and 21 marked)
  rect(ctx, r, 60, 362, 1160, 138, {fill: C.teal, lw: 2.6, grain: 0.14});
  for (const x of [320, 480, 640, 800, 960]) line(ctx, r, [[x, 366], [x, 496]], {lw: 1.6, color: C.tealDark});
  rect(ctx, r, 48, 500, 1184, 30, {fill: '#82a8a2', lw: 2.6, grain: 0.12});
  rect(ctx, r, 58, 530, 1164, 64, {fill: C.tealDark, lw: 2.4, grain: 0.16});
  for (let x = 80; x < 1220; x += 58) line(ctx, r, [[x, 538], [x + 10, 588]], {lw: 1, color: C.ink, alpha: 0.25});
  // seat number plates, hung from the window frame directly above seats 20 and 21
  for (const [x, n] of [[560, '20'], [720, '21']]) { line(ctx, r, [[x - 14, 98], [x - 14, 112]], {lw: 1.6}); line(ctx, r, [[x + 14, 98], [x + 14, 112]], {lw: 1.6}); rect(ctx, r, x - 28, 110, 56, 32, {fill: C.cream, lw: 2, grain: 0.04}); sign(ctx, n, x, 127, 19, n === '21' ? C.rustDark : C.ink); }
  // stanchions
  for (const x of [34, 1246]) rect(ctx, r, x - 7, 78, 14, 560, {fill: C.mustard, lw: 2, grain: 0.08});
  // floor
  shape(ctx, r, [[-10, 594], [W + 10, 594], [W + 10, H + 10], [-10, H + 10]], {fill: C.sand, lw: 2.4, grain: 0.14});
  for (let x = -40; x < W; x += 90) line(ctx, r, [[x, 600], [x - 30, H]], {lw: 1, color: C.inkSoft, alpha: 0.35});
  paperGrain(ctx, r, W, H, 0.05);
  save(cv, OUT + 'bg2-local-interior.png');
}

// ---------- 4. window views: far (opaque) + near (transparent) ----------
const VW = 2560;
function view(name, seed, draw) {
  const far = canvas(VW, H), near = canvas(VW, H), r = rng(seed);
  draw(far.ctx, near.ctx, r);
  paperGrain(far.ctx, r, VW, H, 0.045);
  save(far.cv, OUT + `view-${name}-far.png`); save(near.cv, OUT + `view-${name}-near.png`);
}
function views() {
  view('monsoon', 401, (f, n, r) => {
    vgrad(f, 0, 0, VW, 330, [[0, '#7d8b97'], [1, '#b7c0c2']]);
    for (let i = 0; i < 14; i++) cloud(f, r, i * 200 + r() * 80, 70 + r() * 90, 1.4 + r(), i % 2 ? '#8996a1' : '#9aa5ad', 0.9);
    hills(f, r, 270, 50, '#7f9a80', VW, {step: 80});
    shape(f, r, [[-10, 300], [VW + 10, 300], [VW + 10, H + 10], [-10, H + 10]], {fill: '#93b07e', lw: 2, grain: 0.14});
    for (let y = 320; y < H; y += 34) line(f, r, [[-10, y], [VW + 10, y + 4]], {lw: 1.6, color: '#c3d2cf', alpha: 0.8});
    for (let i = 0; i < 22; i++) palm(f, r, 60 + i * 118 + r() * 40, 300 + r() * 10, 70 + r() * 40);
    for (let i = 0; i < 6; i++) { const x = 200 + i * 430; rect(f, r, x, 262, 50, 38, {fill: C.cream, lw: 1.8, grain: 0.06}); shape(f, r, [[x - 6, 264], [x + 25, 244], [x + 56, 264]], {fill: C.rust, lw: 1.8, grain: 0.1}); }
    rain(f, r, 0, 0, VW, H, {n: 1500, len: 26, alpha: 0.4, color: '#e2e8ea', slant: 0.35});
    for (let x = 80; x < VW; x += 320) { pole(n, r, x, 40, H); }
    line(n, r, Array.from({length: 9}, (_, i) => [i * 320, 60 + 14 * Math.sin(i)]), {lw: 1.6, color: C.ink, alpha: 0.7, step: 30});
    for (let i = 0; i < 18; i++) ellipse(n, r, 80 + i * 150 + r() * 60, 700, 70 + r() * 30, 34 + r() * 14, {fill: '#6f8f63', lw: 2, grain: 0.15});
  });
  view('winter', 402, (f, n, r) => {
    vgrad(f, 0, 0, VW, H, [[0, '#dfe3e2'], [0.5, '#eceae2'], [1, '#d9d6c8']]);
    for (let i = 0; i < 18; i++) tree(f, r, 70 + i * 145 + r() * 40, 320, 80 + r() * 50, 0, {bare: true, alpha: 0.28});
    hills(f, r, 300, 30, '#c9cdc4', VW, {alpha: 0.7, step: 90, grain: 0.04});
    shape(f, r, [[-10, 330], [VW + 10, 330], [VW + 10, H + 10], [-10, H + 10]], {fill: '#d8d4c4', lw: 1.6, grain: 0.08, alpha: 0.9});
    for (let i = 0; i < 7; i++) { f.save(); f.filter = 'blur(24px)'; f.fillStyle = 'rgba(250,250,246,.75)'; f.fillRect(-100, 180 + i * 70, VW + 200, 46); f.restore(); }
    for (let x = 140; x < VW; x += 380) pole(n, r, x, 50, H, 'rgba(94,68,48,.55)');
    for (let i = 0; i < 8; i++) tree(n, r, 260 + i * 330, H, 260 + r() * 60, 0, {bare: true, alpha: 0.55});
  });
  view('spring', 403, (f, n, r) => {
    vgrad(f, 0, 0, VW, 330, [[0, '#a9c6d8'], [1, '#e3ebe6']]);
    for (let i = 0; i < 8; i++) cloud(f, r, 150 + i * 330 + r() * 60, 80 + r() * 60, 0.8 + r() * 0.5, C.white, 0.95);
    hills(f, r, 280, 50, '#a8c08f', VW, {step: 80});
    shape(f, r, [[-10, 310], [VW + 10, 310], [VW + 10, H + 10], [-10, H + 10]], {fill: '#e7c860', lw: 2, grain: 0.16});
    for (let y = 330; y < H; y += 40) line(f, r, [[-10, y], [VW + 10, y + 6]], {lw: 1.4, color: '#c9a640', alpha: 0.7});
    for (let i = 0; i < 16; i++) tree(f, r, 80 + i * 165 + r() * 50, 316, 40 + r() * 20, 30 + r() * 12, {blossom: true});
    for (let x = 60; x < VW; x += 320) pole(n, r, x, 40, H);
    line(n, r, Array.from({length: 9}, (_, i) => [i * 320, 60 + 14 * Math.sin(i)]), {lw: 1.6, color: C.ink, alpha: 0.7, step: 30});
    n.fillStyle = C.blossom; for (let i = 0; i < 90; i++) { n.globalAlpha = 0.8; n.beginPath(); n.ellipse(r() * VW, r() * H, 4, 2.4, r() * 3, 0, 6.3); n.fill(); }
  });
  view('night', 404, (f, n, r) => {
    vgrad(f, 0, 0, VW, H, [[0, C.nightDeep], [0.6, C.night], [1, '#33405a']]);
    f.fillStyle = '#f4ecd0'; for (let i = 0; i < 160; i++) { f.globalAlpha = 0.3 + r() * 0.6; f.beginPath(); f.arc(r() * VW, r() * 260, 0.8 + r() * 1.2, 0, 6.3); f.fill(); } f.globalAlpha = 1;
    ellipse(f, r, 1700, 110, 34, 34, {fill: '#f3e7c4', stroke: null, grain: 0});
    hills(f, r, 300, 40, '#2c3a52', VW, {step: 80, grain: 0.05});
    shape(f, r, [[-10, 320], [VW + 10, 320], [VW + 10, H + 10], [-10, H + 10]], {fill: '#253048', lw: 1.6, grain: 0.06});
    for (let i = 0; i < 26; i++) { const x = r() * VW, y = 300 + r() * 30; glow(f, x, y, 14, '#f6d38c', 0.7); f.fillStyle = '#f6d38c'; f.fillRect(x - 2, y - 2, 4, 4); }
    for (let x = 100; x < VW; x += 360) pole(n, r, x, 50, H, 'rgba(15,20,32,.85)');
  });
}

// ---------- 3. fogged window close-up (frame + fog + blurred views) ----------
export const FOG_GLASS = rrPts(150, 70, 980, 520, 44);
function fogCloseup() {
  const {cv, ctx} = canvas(W, H), r = rng(303);
  paper(ctx, r, W, H, C.cream);
  rect(ctx, r, -10, 600, W + 20, 130, {fill: C.sage, lw: 2.2, grain: 0.12});
  shape(ctx, r, rrPts(110, 34, 1060, 592, 66), {fill: '#9fb1ba', lw: 2.8, grain: 0.12});
  rect(ctx, r, 90, 604, 1100, 26, {fill: '#c9c1aa', lw: 2.2, grain: 0.06});
  cut(ctx, FOG_GLASS); line(ctx, r, [...FOG_GLASS, FOG_GLASS[0]], {lw: 2.8});
  paperGrain(ctx, r, W, H, 0.05);
  save(cv, OUT + 'bg3-window-frame.png');
  // fog sheet: milky, uneven, with droplets and a few runs
  const fog = canvas(W, H), f = fog.ctx;
  f.save(); f.beginPath(); FOG_GLASS.forEach((p, i) => i ? f.lineTo(...p) : f.moveTo(...p)); f.closePath(); f.clip();
  f.fillStyle = 'rgba(236,240,238,.80)'; f.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { f.save(); f.filter = 'blur(30px)'; f.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.15})`; f.beginPath(); f.arc(150 + r() * 980, 70 + r() * 520, 40 + r() * 80, 0, 6.3); f.fill(); f.restore(); }
  for (let i = 0; i < 420; i++) { const x = 150 + r() * 980, y = 70 + r() * 520, edge = Math.min(x - 150, 1130 - x, y - 70, 590 - y); if (edge > 70 && r() < 0.8) continue; const rad = 1.2 + r() * 3.5; f.fillStyle = 'rgba(160,178,186,.55)'; f.beginPath(); f.arc(x, y, rad, 0, 6.3); f.fill(); f.fillStyle = 'rgba(255,255,255,.9)'; f.beginPath(); f.arc(x - rad * 0.35, y - rad * 0.35, rad * 0.35, 0, 6.3); f.fill(); }
  for (let i = 0; i < 7; i++) { const x = 180 + r() * 920, y = 80 + r() * 200, l = 60 + r() * 160; f.strokeStyle = 'rgba(170,186,192,.6)'; f.lineWidth = 2.4; f.beginPath(); f.moveTo(x, y); f.bezierCurveTo(x + 3, y + l / 3, x - 3, y + l * 2 / 3, x + 1, y + l); f.stroke(); }
  f.restore();
  save(fog.cv, OUT + 'bg3-fog.png');
}

// ---------- 5. his small room ----------
function room() {
  const {cv, ctx} = canvas(W, H), r = rng(505);
  paper(ctx, r, W, H, '#d9dcd2');
  rect(ctx, r, -10, -10, W + 20, 520, {fill: '#c9d2cf', lw: 0.01, grain: 0.1, outlineAlpha: 0});
  // window: night turning to dawn, city lights
  shape(ctx, r, rrPts(90, 80, 300, 250, 10), {fill: '#9aa8b4', lw: 2.4, grain: 0.06});
  ctx.save(); ctx.beginPath(); rrPts(106, 96, 268, 218, 6).forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); ctx.clip();
  vgrad(ctx, 106, 96, 268, 218, [[0, C.night], [1, '#7b7f93']]);
  for (let i = 0; i < 7; i++) { const x = 100 + i * 42, h = 40 + r() * 80; rect(ctx, r, x, 314 - h, 36, h + 10, {fill: '#3b4660', lw: 1.2, grain: 0.04}); for (let k = 0; k < 3; k++) { ctx.fillStyle = '#f2d38e'; ctx.fillRect(x + 8 + r() * 18, 314 - h + 10 + r() * (h - 16), 5, 6); } }
  ellipse(ctx, r, 320, 140, 16, 16, {fill: '#f3e7c4', stroke: null, grain: 0});
  ctx.restore();
  line(ctx, r, [[240, 96], [240, 314]], {lw: 3}); line(ctx, r, [[106, 205], [374, 205]], {lw: 3});
  rect(ctx, r, 78, 326, 324, 14, {fill: C.cream, lw: 2, grain: 0.04});
  // calendar with crossed days + pinned sun drawing (callback)
  rect(ctx, r, 470, 110, 130, 150, {fill: C.white, lw: 2.2, grain: 0.04}); rect(ctx, r, 470, 110, 130, 30, {fill: C.rust, lw: 2.2, grain: 0.08});
  for (let i = 0; i < 20; i++) { const x = 482 + (i % 5) * 24, y = 152 + Math.floor(i / 5) * 24; if (i < 17) { line(ctx, r, [[x, y], [x + 12, y + 12]], {lw: 1.4, color: C.ink}); line(ctx, r, [[x + 12, y], [x, y + 12]], {lw: 1.4, color: C.ink}); } else ellipse(ctx, r, x + 6, y + 6, 9, 9, {lw: 1.8, color: C.rust, grain: 0}); }
  rect(ctx, r, 660, 120, 110, 90, {fill: C.cream, lw: 1.8, grain: 0.04});
  ctx.save(); ctx.translate(0, 0); import_sun(ctx, r, 715, 165); ctx.restore();
  ellipse(ctx, r, 715, 120, 5, 5, {fill: C.rust, lw: 1.2, grain: 0});
  // floor
  shape(ctx, r, [[-10, 500], [W + 10, 500], [W + 10, H + 10], [-10, H + 10]], {fill: C.wood, lw: 2.4, grain: 0.16});
  for (let y = 530; y < H; y += 36) line(ctx, r, [[-10, y], [W + 10, y + 3]], {lw: 1.2, color: C.woodDark, alpha: 0.6});
  // bed (left)
  rect(ctx, r, 40, 400, 330, 120, {fill: C.blueLight, lw: 2.4, grain: 0.12}); rect(ctx, r, 40, 380, 90, 40, {fill: C.white, lw: 2, grain: 0.04});
  rect(ctx, r, 24, 340, 20, 200, {fill: C.woodDark, lw: 2, grain: 0.1});
  // desk + lamp + letter (right)
  rect(ctx, r, 880, 380, 330, 22, {fill: C.wood, lw: 2.4, grain: 0.12});
  rect(ctx, r, 896, 402, 16, 150, {fill: C.woodDark, lw: 2, grain: 0.1}); rect(ctx, r, 1178, 402, 16, 150, {fill: C.woodDark, lw: 2, grain: 0.1});
  glow(ctx, 1150, 330, 170, '#f7dda2', 0.55);
  line(ctx, r, [[1130, 380], [1150, 320], [1120, 290]], {lw: 3}); shape(ctx, r, [[1090, 270], [1140, 282], [1124, 316], [1080, 300]], {fill: C.mustard, lw: 2.2, grain: 0.1});
  // envelope + opened letter on the desk
  shape(ctx, r, [[930, 376], [1010, 368], [1016, 378], [934, 384]], {fill: C.white, lw: 1.6, grain: 0.04});
  ctx.save(); ctx.translate(1000, 360); ctx.rotate(-0.08); rect(ctx, r, 0, 0, 90, 14, {fill: C.cream, lw: 1.6, grain: 0.03}); ctx.restore();
  ctx.save(); ctx.translate(1048, 338); ctx.rotate(-0.06); sign(ctx, 'TRANSFER ORDER', 0, 0, 13, C.rustDark); ctx.restore();
  line(ctx, r, [[1010, 352], [1084, 346]], {lw: 1.2, color: C.rustDark, alpha: 0.6});
  // suitcase (centre-right floor), with a tag
  rect(ctx, r, 640, 420, 180, 130, {fill: C.rust, lw: 2.6, grain: 0.14});
  rect(ctx, r, 640, 470, 180, 12, {fill: C.rustDark, lw: 1.8, grain: 0.06});
  shape(ctx, r, [[700, 420], [702, 398], [758, 398], [760, 420]], {fill: null, lw: 3});
  for (const x of [660, 800]) rect(ctx, r, x - 4, 550, 10, 8, {fill: C.ink, stroke: null, grain: 0});
  line(ctx, r, [[812, 432], [842, 452]], {lw: 1.4}); rect(ctx, r, 836, 446, 34, 22, {fill: C.cream, lw: 1.6, grain: 0.03});
  paperGrain(ctx, r, W, H, 0.05);
  save(cv, OUT + 'bg5-room.png');
}
function import_sun(ctx, r, x, y) { // small crayon sun pinned on the wall
  ellipse(ctx, r, x, y, 15, 15, {fill: C.mustard, lw: 2, grain: 0.1});
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; line(ctx, r, [[x + Math.cos(a) * 21, y + Math.sin(a) * 21], [x + Math.cos(a) * 30, y + Math.sin(a) * 30]], {lw: 2, color: C.mustard}); }
}

// ---------- 6. big terminal at night ----------
function terminal() {
  const {cv, ctx} = canvas(W, H), r = rng(606);
  vgrad(ctx, 0, 0, W, H, [[0, C.nightDeep], [0.55, C.night], [1, '#3a4258']]);
  ctx.fillStyle = '#f4ecd0'; for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.3 + r() * 0.5; ctx.beginPath(); ctx.arc(r() * W, r() * 230, 1 + r(), 0, 6.3); ctx.fill(); } ctx.globalAlpha = 1;
  // great arched roof (iron trusses)
  for (const [rad, lw, a] of [[760, 7, 1], [700, 3, 0.7], [640, 2, 0.5]]) line(ctx, r, ellipsePts(640, 560, rad, rad * 0.78, 60, Math.PI, Math.PI * 2), {lw, color: '#7f8aa0', alpha: a, step: 12});
  for (let i = 1; i < 14; i++) { const a = Math.PI + Math.PI * i / 14; line(ctx, r, [[640 + Math.cos(a) * 640, 560 + Math.sin(a) * 500], [640 + Math.cos(a) * 760, 560 + Math.sin(a) * 593]], {lw: 3, color: '#7f8aa0'}); }
  for (let y = 120; y < 420; y += 70) line(ctx, r, [[0, y + 60], [W, y + 60]], {lw: 0.01, alpha: 0});
  // city glow beyond arch
  for (let i = 0; i < 12; i++) { const x = 120 + i * 92, h = 40 + r() * 110; rect(ctx, r, x, 380 - h, 64, h, {fill: '#30405c', lw: 1.4, grain: 0.04, alpha: 0.9}); for (let k = 0; k < 4; k++) { ctx.fillStyle = '#f2d38e'; ctx.fillRect(x + 8 + r() * 44, 380 - h + 10 + r() * (h - 16), 5, 6); } }
  // big clock and departure board
  ellipse(ctx, r, 640, 120, 58, 58, {fill: '#f3ead2', lw: 3, grain: 0});
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(ctx, r, [[640 + Math.cos(a) * 46, 120 + Math.sin(a) * 46], [640 + Math.cos(a) * 52, 120 + Math.sin(a) * 52]], {lw: 2, amp: 0}); }
  line(ctx, r, [[640, 120], [640 + 26, 120 - 22]], {lw: 3.4, amp: 0}); line(ctx, r, [[640, 120], [640 - 12, 120 + 22]], {lw: 2.4, amp: 0});
  glow(ctx, 640, 120, 120, '#f6dfa8', 0.35);
  rect(ctx, r, 860, 170, 330, 150, {fill: '#24282f', lw: 2.6, grain: 0.06});
  sign(ctx, 'DEPARTURES', 1025, 192, 18, C.lamp);
  line(ctx, r, [[876, 208], [1174, 208]], {lw: 1.2, color: '#6b6f78'});
  [['21:40', 'NORTH', '4'], ['21:55', 'COAST', '7'], ['22:10', 'VALLEY', '2']].forEach(([t, d, p], i) => { const y = 232 + i * 30; sign(ctx, t, 880, y, 17, C.lamp, 'left'); sign(ctx, d, 960, y, 17, '#f3ead2', 'left'); sign(ctx, p, 1172, y, 17, C.lamp, 'right'); });
  // hanging lamps
  for (const x of [180, 420, 860, 1100]) { line(ctx, r, [[x, 0], [x, 160 + (x % 3) * 10]], {lw: 1.6, color: '#9aa3b4'}); glow(ctx, x, 175, 90, '#f6d38c', 0.55); shape(ctx, r, [[x - 18, 160], [x + 18, 160], [x + 10, 180], [x - 10, 180]], {fill: C.lamp, lw: 1.8, grain: 0}); }
  // track band + platform (same staging grammar as the dawn platform)
  rect(ctx, r, -10, 385, W + 20, 92, {fill: '#4c4f58', lw: 2, grain: 0.16});
  for (let x = 0; x < W; x += 34) line(ctx, r, [[x, 432], [x + 10, 470]], {lw: 5, color: '#2e2a26', alpha: 0.75});
  line(ctx, r, [[-10, 438], [W + 10, 436]], {lw: 4, color: '#8d8a86'}); line(ctx, r, [[-10, 462], [W + 10, 461]], {lw: 4, color: '#8d8a86'});
  shape(ctx, r, [[-10, 478], [W + 10, 478], [W + 10, H + 10], [-10, H + 10]], {fill: '#8f8676', lw: 2.4, grain: 0.14});
  rect(ctx, r, -10, 478, W + 20, 12, {fill: '#b9ae98', lw: 1.8, grain: 0.05});
  for (let x = 0; x < W; x += 40) rect(ctx, r, x, 497, 22, 8, {fill: C.mustard, stroke: null, grain: 0});
  for (const x of [180, 420, 860, 1100]) glow(ctx, x, 600, 150, '#f6d38c', 0.18);
  rect(ctx, r, 40, 300, 18, 180, {fill: '#59627a', lw: 2, grain: 0.06}); rect(ctx, r, 1222, 300, 18, 180, {fill: '#59627a', lw: 2, grain: 0.06});
  rect(ctx, r, 70, 520, 74, 34, {fill: C.cream, lw: 2, grain: 0.04}); sign(ctx, '4', 107, 538, 22);
  paperGrain(ctx, r, W, H, 0.04);
  save(cv, OUT + 'bg6-terminal.png');
}

// ---------- 7. long-distance interior (two window seats) ----------
export const LONG_WINDOW = rrPts(300, 112, 680, 172, 30);
function longInterior() {
  const {cv, ctx} = canvas(W, H), r = rng(707);
  paper(ctx, r, W, H, '#c9a27a');
  for (let x = 0; x < W; x += 64) line(ctx, r, [[x, 0], [x, 600]], {lw: 1.2, color: C.woodDark, alpha: 0.35});
  rect(ctx, r, -10, -10, W + 20, 70, {fill: C.woodDark, lw: 2.4, grain: 0.12});
  // luggage rack with his rust suitcase
  rect(ctx, r, 120, 60, 1040, 12, {fill: '#a9a59a', lw: 2, grain: 0.04});
  for (let x = 140; x < 1160; x += 30) line(ctx, r, [[x, 72], [x + 4, 92]], {lw: 1.4, color: '#7f7b72'});
  line(ctx, r, [[120, 92], [1160, 92]], {lw: 2.6, color: '#7f7b72'});
  rect(ctx, r, 360, 18, 150, 44, {fill: C.rust, lw: 2.2, grain: 0.12}); rect(ctx, r, 360, 34, 150, 8, {fill: C.rustDark, lw: 1.4, grain: 0.04});
  // window with curtains
  shape(ctx, r, rrPts(284, 98, 712, 202, 38), {fill: '#8f7660', lw: 2.6, grain: 0.1});
  cut(ctx, LONG_WINDOW); line(ctx, r, [...LONG_WINDOW, LONG_WINDOW[0]], {lw: 2.6});
  line(ctx, r, [[640, 112], [640, 348]], {lw: 0.01, alpha: 0});
  for (const [x, d] of [[250, 1], [1030, -1]]) shape(ctx, r, [[x, 92], [x + d * 70, 92], [x + d * 52, 200], [x + d * 70, 312], [x, 312], [x + d * 14, 200]], {fill: C.mustard, lw: 2.2, grain: 0.16});
  rect(ctx, r, 280, 288, 720, 14, {fill: C.cream, lw: 2, grain: 0.04});
  // reading lamps
  // two plush seats with headrest covers
  for (const [x, n] of [[480, '20'], [800, '21']]) {
    shape(ctx, r, rrPts(x - 120, 356, 240, 174, 30), {fill: C.maroon, lw: 2.6, grain: 0.16});
    rect(ctx, r, x - 70, 362, 140, 42, {fill: C.cream, lw: 2, grain: 0.04});
    rect(ctx, r, x - 130, 500, 260, 44, {fill: C.maroonDark, lw: 2.4, grain: 0.14});
    rect(ctx, r, x - 120, 544, 240, 56, {fill: '#5a262d', lw: 2.2, grain: 0.14});
    rect(ctx, r, x - 24, 314, 48, 30, {fill: '#d7b46a', lw: 2, grain: 0.05}); rect(ctx, r, x - 19, 318, 38, 22, {fill: '#f3ead2', lw: 1.2, grain: 0}); sign(ctx, n, x, 330, 16, n === '21' ? C.rustDark : C.ink);
  }
  rect(ctx, r, 618, 470, 44, 74, {fill: C.maroonDark, lw: 2.2, grain: 0.1});
  // floor carpet
  shape(ctx, r, [[-10, 600], [W + 10, 600], [W + 10, H + 10], [-10, H + 10]], {fill: '#7a5a48', lw: 2.4, grain: 0.18});
  for (let x = 20; x < W; x += 60) line(ctx, r, [[x, 620], [x + 20, 700]], {lw: 1.6, color: C.mustard, alpha: 0.35});
  paperGrain(ctx, r, W, H, 0.05);
  save(cv, OUT + 'bg7-long-interior.png');
}

platform(); localInterior(); views(); fogCloseup(); room(); terminal(); longInterior();
console.log('backgrounds ok');
