// Dump selected frames through the bundled painter (exact runtime look) into review/frames.
import fs from 'node:fs';
const S = '/home/user/stickman-video-director/skills/directing-stickman-videos/scripts/';
const {loadProject} = await import(S + 'autopilot-core.mjs');
const {painter} = await import(S + 'autopilot-render.mjs');
const [file, secs, ...times] = process.argv.slice(2);
const p = loadProject(file, {seconds: Number(secs)});
const frame = await painter(p);
fs.mkdirSync('review/frames', {recursive: true});
for (const t of times) fs.writeFileSync(`review/frames/t${t}.png`, frame(Number(t)).toBuffer('image/png'));
console.log('frames ok');
