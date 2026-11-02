// Test frames in the local train: Verse 1 (apart) and Chorus onward (side by side).
// HIM always sits under plaque 20, HER always under plaque 21.
import fs from 'node:fs';
import {GlobalFonts, loadImage} from './canvas.mjs';
import {C, canvas, rng, figure, lapBag} from './lib.mjs';
import {P} from './poses.mjs';
GlobalFonts.registerFromPath('/home/user/stickman-video-director/skills/directing-stickman-videos/assets/fonts/NotoSans.ttf', 'Cap');
const BG = new URL('../assets/bg/', import.meta.url).pathname, PR = new URL('../assets/props/', import.meta.url).pathname;
export const SEATS = {apart: {him: 380, her: 900}, together: {him: 560, her: 720}};
export const K = 1.5, HIP_Y = 536; // design scale of seated cast; hip on the cushion, knees at its front edge
async function frame(name, layout, caption, faces) {
  const {cv, ctx} = canvas(1280, 720), r = rng(2121);
  for (const [f, x] of [['view-monsoon-far.png', -300], ['view-monsoon-near.png', -480]]) ctx.drawImage(await loadImage(BG + f), x, -40, 2560, 720);
  ctx.drawImage(await loadImage(BG + 'bg2-local-interior.png'), 0, 0, 1280, 720);
  const xs = SEATS[layout];
  for (const [who, n] of [['him', '20'], ['her', '21']]) ctx.drawImage(await loadImage(PR + `plaque-${n}.png`), xs[who] - 32, 96, 64, 48);
  const sit = (who, pose, opts) => { ctx.save(); ctx.translate(xs[who], HIP_Y); ctx.scale(K, K); figure(ctx, r, who, 0, 0, pose, opts); ctx.restore(); };
  sit('him', {...P.sitBag, ...faces.him}, {backpack: false, beforeArms: lapBag(ctx, r)});
  sit('her', {...P.sitSmile, ...faces.her}, {});
  ctx.font = '500 40px Cap'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(caption).width;
  ctx.fillStyle = 'rgba(249,246,235,.94)'; ctx.beginPath(); ctx.roundRect(640 - w / 2 - 22, 660 - 33, w + 44, 66, 9); ctx.fill();
  ctx.fillStyle = '#38382f'; ctx.fillText(caption, 640, 660);
  fs.writeFileSync(new URL(`../review/test-frame-${name}.png`, import.meta.url).pathname, cv.toBuffer('image/png'));
}
await frame('apart', 'apart', 'We never say a single word,', {him: {gaze: [4, 0], head: 0.05}, her: {gaze: [-4, 0], head: -0.05, mouth: 'line'}});
await frame('together', 'together', 'Seat number twenty-one,', {him: {gaze: [5, 0], head: 0.08, mouth: 'smile'}, her: {gaze: [-5, 0], head: -0.08, blush: true}});
console.log('ok');
