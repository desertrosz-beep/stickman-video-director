// Named poses for HIM and HER (shared by the character sheet and scene sprites).
export const P = {
  stand: {},
  standSmile: {mouth: 'smile'},
  walkR: {facing: 'right', armL: [-0.45, -0.2], armR: [0.5, 0.75], legL: [-0.38, -0.1], legR: [0.42, 0.05]},
  walkL: {facing: 'left', armL: [-0.5, -0.75], armR: [0.45, 0.2], legL: [-0.42, -0.05], legR: [0.38, 0.1]},
  // Seated on a bench, front view: hip on the cushion, thighs flat along the cushion,
  // knees bent at the seat edge, shins straight down to the floor, feet planted.
  sit: {legL: [-1.35, -0.04], legR: [1.35, 0.04], thighL: 20, thighR: 20, shin: 36, feet: true, armL: [-0.15, 0], armR: [0.15, 0]},
  sitSmile: {legL: [-1.35, -0.04], legR: [1.35, 0.04], thighL: 20, thighR: 20, shin: 36, feet: true, armL: [-0.15, 0], armR: [0.15, 0], mouth: 'smile'},
  sitBag: {legL: [-1.35, -0.04], legR: [1.35, 0.04], thighL: 20, thighR: 20, shin: 36, feet: true, armL: [-0.22, 0.12], armR: [0.22, -0.12]},
  wave: {armR: [2.0, 2.75], mouth: 'smile'},
  letter: {armR: [0.35, 2.45], head: 0.1, eyes: 'down', mouth: 'sad', gaze: [2, 3]},
  ticket: {armR: [1.0, 2.35], mouth: 'smile', eyes: 'closed', blush: true},
  carryBag: {armR: [0.35, 0.15], mouth: 'smile'},
  draw: {facing: 'right', armR: [1.85, 2.25], gaze: [2, -2]},
};
