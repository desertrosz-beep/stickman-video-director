// Composite each environment the way it will be layered in the film, then tile a contact sheet.
import {GlobalFonts, loadImage, createCanvas} from './canvas.mjs';
GlobalFonts.registerFromPath('/home/user/stickman-video-director/skills/directing-stickman-videos/assets/fonts/Caveat.ttf', 'Hand');
const BG = new URL('../assets/bg/', import.meta.url).pathname, OUT = new URL('../review/', import.meta.url).pathname;
import fs from 'node:fs';
const img = f => loadImage(BG + f);
const Wp = 1920, Hp = 1080;
async function compose(name, layers) {
  const cv = createCanvas(Wp, Hp), ctx = cv.getContext('2d');
  for (const L of layers) {
    const im = await img(L.f); ctx.save(); if (L.blur) ctx.filter = `blur(${L.blur}px)`; ctx.globalAlpha = L.alpha ?? 1;
    const sx = L.sx ?? 0; ctx.drawImage(im, sx * 1.5, 0, Wp * (L.zoom ? 1 / L.zoom : 1), Hp * (L.zoom ? 1 / L.zoom : 1), (L.dx ?? 0) * 1.5, (L.dy ?? 0) * 1.5, Wp, Hp); ctx.restore();
  }
  fs.writeFileSync(OUT + `env-${name}.png`, cv.toBuffer('image/png')); return cv;
}
const view = (s, sx = 0, dy = 0) => [{f: `view-${s}-far.png`, sx, dy}, {f: `view-${s}-near.png`, sx: sx * 1.6, dy}];
const tiles = [
  ['1 · rainy dawn platform', await compose('1-platform', [{f: 'bg1-platform.png'}])],
  ['2 · local train (main set) + monsoon', await compose('2-local', [...view('monsoon', 300, -40), {f: 'bg2-local-interior.png'}])],
  ['3 · fogged window close-up', await compose('3-fog', [{f: 'view-monsoon-far.png', sx: 500, blur: 10}, {f: 'bg3-window-frame.png'}, {f: 'bg3-fog.png'}])],
  ['4a · view: monsoon', await compose('4a-monsoon', view('monsoon', 900))],
  ['4b · view: winter fog', await compose('4b-winter', view('winter', 600))],
  ['4c · view: spring', await compose('4c-spring', view('spring', 400))],
  ['5 · his room: letter + suitcase', await compose('5-room', [{f: 'bg5-room.png'}])],
  ['6 · terminal station at night', await compose('6-terminal', [{f: 'bg6-terminal.png'}])],
  ['7 · long-distance train + night', await compose('7-long', [...view('night', 300, -30), {f: 'bg7-long-interior.png'}])],
];
const tw = 620, th = 349, pad = 20, lab = 44;
const sheet = createCanvas(3 * tw + 4 * pad, 3 * (th + lab) + 3 * pad + 70), c = sheet.getContext('2d');
c.fillStyle = '#f4f0e5'; c.fillRect(0, 0, sheet.width, sheet.height);
c.font = '44px Hand'; c.fillStyle = '#3a3830'; c.textAlign = 'center'; c.fillText('Seat No. 21 — environments (no characters)', sheet.width / 2, 52);
tiles.forEach(([label, cv], i) => {
  const x = pad + (i % 3) * (tw + pad), y = 80 + Math.floor(i / 3) * (th + lab + pad);
  c.drawImage(cv, x, y, tw, th); c.strokeStyle = '#3a3830'; c.lineWidth = 2; c.strokeRect(x, y, tw, th);
  c.font = '30px Hand'; c.textAlign = 'left'; c.fillStyle = '#3a3830'; c.fillText(label, x + 4, y + th + 34);
});
fs.writeFileSync(OUT + 'contact-sheet.png', sheet.toBuffer('image/png'));
console.log('contact ok');
