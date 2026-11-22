// The gallery floor: one room the thief crosses, drawn from a single list of
// solids so movement and sight agree about what blocks them. The vault sits in
// its own antechamber, top right, behind one doorway; the exit is the service
// door, bottom right; the thief enters bottom left. Three lanes run between
// them: the case-lined left lane (slow, covered), the open centre floor
// (fast, exposed) and the pillar row on the right.
import { FIELD, HUD_HEIGHT } from './config.js';

export function createLevel() {
  // Solids block movement and sight: display cases, pillars and the vault
  // antechamber walls. Velvet ropes are decoration only and never block.
  const solids = [
    // Display cases, left lane.
    { x: 240, y: 240, w: 200, h: 60, kind: 'case', label: 'Jade Wing' },
    { x: 240, y: 470, w: 200, h: 60, kind: 'case', label: 'Bronze Wing' },
    // A tall case splitting the centre.
    { x: 560, y: 180, w: 60, h: 200, kind: 'case', label: 'Coin Vault' },
    // A long case across the lower centre.
    { x: 700, y: 470, w: 220, h: 60, kind: 'case', label: 'Textile Wing' },
    // Pillars, right lane.
    { x: 860, y: 220, w: 40, h: 40, kind: 'pillar' },
    { x: 860, y: 380, w: 40, h: 40, kind: 'pillar' },
    { x: 1020, y: 520, w: 40, h: 40, kind: 'pillar' },
    // Vault antechamber: left wall, and the bottom wall with one doorway.
    { x: 980, y: HUD_HEIGHT, w: 20, h: 248, kind: 'wall' },
    { x: 980, y: 300, w: 100, h: 20, kind: 'wall' },
    { x: 1180, y: 300, w: 100, h: 20, kind: 'wall' },
  ];

  const artifacts = [
    { id: 'idol', name: 'Gold Idol', x: 300, y: 580, taken: false },
    { id: 'mask', name: 'Jade Mask', x: 700, y: 130, taken: false },
    { id: 'pearl', name: 'Black Pearl', x: 540, y: 640, taken: false },
  ];

  const guards = [
    {
      name: 'Marco',
      waypoints: [
        { x: 200, y: 150 },
        { x: 500, y: 150 },
        { x: 500, y: 420 },
        { x: 200, y: 420 },
      ],
    },
    {
      name: 'Iris',
      waypoints: [
        { x: 700, y: 120 },
        { x: 940, y: 120 },
        { x: 940, y: 420 },
        { x: 700, y: 420 },
      ],
    },
    {
      name: 'Dario',
      waypoints: [
        { x: 150, y: 560 },
        { x: 600, y: 560 },
        { x: 600, y: 660 },
        { x: 150, y: 660 },
      ],
    },
  ];

  const cameras = [
    // Top wall, sweeping the centre floor.
    { x: 640, y: HUD_HEIGHT + 6, baseAngle: Math.PI / 2, phase: 0 },
    // Right wall, watching the vault doorway.
    { x: FIELD.width - 6, y: 420, baseAngle: Math.PI, phase: 2.4 },
  ];

  // Paintings are wall dressing; ropes mark the lanes without blocking.
  const paintings = [
    { x: 120, y: HUD_HEIGHT + 8, w: 90, h: 54, hue: 28 },
    { x: 420, y: HUD_HEIGHT + 8, w: 70, h: 54, hue: 200 },
    { x: 760, y: HUD_HEIGHT + 8, w: 90, h: 54, hue: 150 },
    { x: 880, y: HUD_HEIGHT + 8, w: 70, h: 54, hue: 280 },
  ];
  const ropes = [
    { x1: 240, y1: 320, x2: 440, y2: 320 },
    { x1: 700, y1: 550, x2: 920, y2: 550 },
  ];

  return {
    solids,
    artifacts,
    guards,
    cameras,
    paintings,
    ropes,
    start: { x: 80, y: 640 },
    vault: { x: 1215, y: 165 },
    exit: { x: 1215, y: 660 },
    bounds: { x: 0, y: HUD_HEIGHT, w: FIELD.width, h: FIELD.height - HUD_HEIGHT },
  };
}
