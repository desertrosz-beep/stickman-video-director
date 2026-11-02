import {GlobalFonts} from './canvas.mjs';
import {C, canvas, save, rng, figure, paperGrain, handText, line, rect, ticket, letter, backpack, shape, lapBag} from './lib.mjs';
import {P} from './poses.mjs';
GlobalFonts.registerFromPath('/home/user/stickman-video-director/skills/directing-stickman-videos/assets/fonts/Caveat.ttf', 'Hand');
const OUT = new URL('../review/', import.meta.url).pathname;

const {cv, ctx} = canvas(1280, 720);
const r = rng(21);
ctx.fillStyle = C.paper; ctx.fillRect(0, 0, 1280, 720);
paperGrain(ctx, r, 1280, 720, 0.06);
handText(ctx, 'Seat No. 21 — cast', 640, 40, {size: 40, align: 'center'});
line(ctx, r, [[520, 64], [760, 62]], {lw: 2, color: C.rust});

const cols = [130, 300, 470, 640, 810, 990, 1160];
const LABELS = {him: ['front: straps only', 'side: bag on back', 'seated (bag on lap)', 'bag in hand', 'letter', 'drawing on glass'], her: ['front', 'side / walking', 'seated', 'waving', 'ticket 21', 'drawing on glass']};
function seat(x, hipY, floorY) { // backrest, cushion top, front face; hip sits on the cushion, knees at its edge
  const top = hipY - 26, edge = hipY + 16;
  rect(ctx, r, x - 60, top - 60, 120, 60, {fill: C.teal, lw: 2, grain: 0.1});
  shape(ctx, r, [[x - 60, top], [x + 60, top], [x + 66, edge], [x - 66, edge]], {fill: '#86aba5', lw: 2, grain: 0.1});
  rect(ctx, r, x - 64, edge, 128, floorY - edge - 6, {fill: C.tealDark, lw: 2, grain: 0.12});
  line(ctx, r, [[x - 84, floorY], [x + 84, floorY]], {lw: 1.6, color: C.inkSoft});
}
function row(who, y, name, note) {
  handText(ctx, name, 40, y - 150, {size: 44, color: who === 'him' ? C.navy : C.rustDark});
  note.split(' · ').forEach((t, i) => handText(ctx, t, 40, y - 110 + i * 26, {size: 22, color: C.greyDark}));
  const xs = [300, 450, 610, 760, 900, 1080];
  // standing
  figure(ctx, r, who, xs[0], y, P.stand);
  figure(ctx, r, who, xs[1], y, P.walkR);
  seat(xs[2], y + 23, y + 73); figure(ctx, r, who, xs[2], y + 23, who === 'her' ? P.sitSmile : P.sitBag, who === 'him' ? {backpack: false, beforeArms: lapBag(ctx, r)} : {});
  if (who === 'him') { const j = figure(ctx, r, who, xs[3], y, P.carryBag, {backpack: false}); backpack(ctx, r, j.handR[0] - 19.5, j.handR[1] + 50, 0.85); }
  else figure(ctx, r, who, xs[3], y, P.wave);
  if (who === 'him') { const j = figure(ctx, r, who, xs[4], y, P.letter); letter(ctx, r, j.handR[0] - 6, j.handR[1] - 40, 0.8, 0.08); }
  else { const j = figure(ctx, r, who, xs[4], y, P.ticket); ticket(ctx, r, j.handR[0] - 8, j.handR[1] - 30, 0.9); }
  // drawing on glass: pane + doodle
  rect(ctx, r, xs[5] + 46, y - 140, 110, 150, {fill: 'rgba(214,226,230,.85)', lw: 2.2, grain: 0});
  figure(ctx, r, who, xs[5], y, P.draw);
  ctx.save(); ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(xs[5] + 104, y - 92, 14, 0, 6.3); ctx.stroke(); ctx.restore();
  xs.forEach((x, i) => handText(ctx, LABELS[who][i], x, y + 98, {size: 20, color: C.greyDark, align: 'center'}));
}
row('him', 300, 'HIM', 'round head · brown flat cap · thin black glasses · plain navy shirt · navy backpack');
row('her', 600, 'HER', 'round head · dark hair, side-swept fringe · short ponytail, rust tie · plain yellow kurta · golden-yellow scarf');
save(cv, OUT + 'character-sheet.png');
console.log('ok');
