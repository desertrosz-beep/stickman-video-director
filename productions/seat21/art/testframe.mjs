// Test frame: HIM (seat 20) and HER (seat 21) seated side by side in the local train.
import fs from 'node:fs';
import {GlobalFonts, loadImage} from './canvas.mjs';
import {C, canvas, rng, figure, backpack} from './lib.mjs';
import {P} from './poses.mjs';
GlobalFonts.registerFromPath('/home/user/stickman-video-director/skills/directing-stickman-videos/assets/fonts/NotoSans.ttf', 'Cap');
const BG = new URL('../assets/bg/', import.meta.url).pathname;
const {cv, ctx} = canvas(1280, 720), r = rng(2121);
for (const [f, x] of [['view-monsoon-far.png', -300], ['view-monsoon-near.png', -480]]) ctx.drawImage(await loadImage(BG + f), x, -40, 2560, 720);
ctx.drawImage(await loadImage(BG + 'bg2-local-interior.png'), 0, 0, 1280, 720);
const k = 1.5, HY = 506;
function seated(who, x, pose, opts) { ctx.save(); ctx.translate(x, HY); ctx.scale(k, k); const j = figure(ctx, r, who, 0, 0, pose, opts); ctx.restore(); return j; }
seated('him', 560, {...P.sit, gaze: [5, 0], head: 0.08}, {backpack: false});
ctx.save(); ctx.translate(560, HY); ctx.scale(k, k); backpack(ctx, r, -19, 10, 0.82);
ctx.fillStyle = C.ink; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 19, -12, 3, 0, 6.3); ctx.fill(); } ctx.restore();
seated('her', 720, {...P.sitSmile, gaze: [-5, 0], head: -0.08, blush: true}, {});
// caption in the B2 runtime treatment (ivory label, dark sans)
ctx.font = '500 40px Cap'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
const t = 'Seat number twenty-one,', w = ctx.measureText(t).width;
ctx.fillStyle = 'rgba(249,246,235,.94)'; ctx.beginPath(); ctx.roundRect(640 - w / 2 - 22, 660 - 33, w + 44, 66, 9); ctx.fill();
ctx.fillStyle = '#38382f'; ctx.fillText(t, 640, 660);
fs.writeFileSync(new URL('../review/test-frame-seated.png', import.meta.url).pathname, cv.toBuffer('image/png'));
console.log('ok');
