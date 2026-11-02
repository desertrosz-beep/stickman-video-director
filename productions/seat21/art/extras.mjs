// Additional layers for the full film (all derived from approved art):
// blurred window views for fog close-ups, tunnel strip, long-train window close-up frame,
// fog overlay for the local-train windows, and pre-rendered completed doodles.
import fs from 'node:fs';
import {createCanvas, loadImage} from './canvas.mjs';
import {C, canvas, save, rng, shape, rect, line, paperGrain, glow, vgrad} from './lib.mjs';
const ROOT = new URL('../', import.meta.url).pathname, BG = ROOT + 'assets/bg/';
const W = 1280, H = 720;
export function rrPts(x, y, w, h, rad, n = 6) {
  const pts = [], c = [[x + w - rad, y + rad, -Math.PI / 2], [x + w - rad, y + h - rad, 0], [x + rad, y + h - rad, Math.PI / 2], [x + rad, y + rad, Math.PI]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= n; i++) { const a = a0 + Math.PI / 2 * i / n; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  return pts;
}
export const LOCAL_WINDOWS = [rrPts(130, 104, 470, 232, 26), rrPts(680, 104, 470, 232, 26)];
export const FOG_GLASS = rrPts(150, 70, 980, 520, 44);
const path = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); };

export async function blurredViews() {
  for (const s of ['monsoon', 'winter', 'spring', 'night']) {
    const out = BG + `view-${s}-blur.png`; if (fs.existsSync(out)) continue;
    const far = await loadImage(BG + `view-${s}-far.png`), near = await loadImage(BG + `view-${s}-near.png`);
    const cv = createCanvas(far.width, far.height), ctx = cv.getContext('2d');
    ctx.filter = 'blur(16px)'; ctx.drawImage(far, 0, 0); ctx.globalAlpha = 0.7; ctx.drawImage(near, 0, 0);
    fs.writeFileSync(out, cv.toBuffer('image/png'));
  }
}
export function tunnel() {
  const out = BG + 'view-tunnel.png'; if (fs.existsSync(out)) return;
  const {cv, ctx} = canvas(2560, H), r = rng(650);
  vgrad(ctx, 0, 0, 2560, H, [[0, '#2a2420'], [0.5, '#3a322b'], [1, '#221d1a']]);
  for (let x = 40; x < 2560; x += 160) line(ctx, r, [[x, 0], [x + 20, H]], {lw: 3, color: '#4c4239', alpha: 0.7});
  for (let x = 120; x < 2560; x += 400) { glow(ctx, x, 210, 60, '#f3c97a', 0.8); rect(ctx, r, x - 24, 204, 48, 12, {fill: '#f7dca0', lw: 1.6, grain: 0}); }
  paperGrain(ctx, r, 2560, H, 0.04);
  save(cv, out);
}
export function longWindowFrame() { // fog close-up frame for the long-distance train (wood + maroon)
  const out = BG + 'bg3-window-frame-long.png'; if (fs.existsSync(out)) return;
  const {cv, ctx} = canvas(W, H), r = rng(313);
  ctx.fillStyle = '#c9a27a'; ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 64) line(ctx, r, [[x, 0], [x, H]], {lw: 1.2, color: C.woodDark, alpha: 0.3});
  rect(ctx, r, -10, 610, W + 20, 120, {fill: C.maroon, lw: 2.2, grain: 0.14});
  shape(ctx, r, rrPts(110, 34, 1060, 592, 66), {fill: '#8f7660', lw: 2.8, grain: 0.12});
  rect(ctx, r, 90, 604, 1100, 26, {fill: C.cream, lw: 2.2, grain: 0.06});
  for (const [x, d] of [[70, 1], [1210, -1]]) shape(ctx, r, [[x, 20], [x + d * 80, 20], [x + d * 60, 300], [x + d * 80, 600], [x, 600]], {fill: C.mustard, lw: 2.2, grain: 0.16});
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; path(ctx, FOG_GLASS); ctx.fill(); ctx.restore();
  line(ctx, r, [...FOG_GLASS, FOG_GLASS[0]], {lw: 2.8});
  paperGrain(ctx, r, W, H, 0.05);
  save(cv, out);
}
export function localWindowFog() { // milky fog over both local windows, for wide shots
  const out = BG + 'local-window-fog.png'; if (fs.existsSync(out)) return;
  const {cv, ctx} = canvas(W, H), r = rng(330);
  for (const pts of LOCAL_WINDOWS) {
    ctx.save(); path(ctx, pts); ctx.clip();
    ctx.fillStyle = 'rgba(236,240,238,.74)'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) { ctx.save(); ctx.filter = 'blur(18px)'; ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(pts[0][0] - 400 + r() * 480, 110 + r() * 220, 30 + r() * 50, 0, 6.3); ctx.fill(); ctx.restore(); }
    for (let i = 0; i < 160; i++) { const x = 130 + r() * 1020, y = 104 + r() * 232; ctx.fillStyle = 'rgba(160,178,186,.5)'; ctx.beginPath(); ctx.arc(x, y, 0.8 + r() * 1.8, 0, 6.3); ctx.fill(); }
    ctx.restore();
  }
  save(cv, out);
}
// completed doodles as one transparent image (for shots with a moving camera)
export function doodleSprite(name, strokes) {
  const out = `assets/sprites/doodle-${name}.png`;
  const {cv, ctx} = canvas(W, H, 2);
  for (const s of strokes) { ctx.strokeStyle = s.color; ctx.lineWidth = s.lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); s.points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); }
  save(cv, ROOT + out);
  return out;
}
