// Prop sprites: seat plaques (separate layer so they always sit above HIM=20 and HER=21).
import {GlobalFonts} from './canvas.mjs';
import {canvas, save, rng, plaque} from './lib.mjs';
GlobalFonts.registerFromPath('/home/user/stickman-video-director/skills/directing-stickman-videos/assets/fonts/NotoSans.ttf', 'Sign');
const OUT = new URL('../assets/props/', import.meta.url).pathname;
for (const n of ['20', '21']) { const {cv, ctx} = canvas(64, 48, 2); plaque(ctx, rng(Number(n)), 32, 2, n); save(cv, OUT + `plaque-${n}.png`); }
console.log('props ok');
