// The museum floor: walls, pillars, loot stands, the vault room and the
// exit door. Coordinates are canvas pixels on a 1280 by 720 room.
//
// Layout, west to east:
//   West gallery  — Gold Idol, thief's entrance at the bottom left.
//   Central hall  — Jade Mask on a pedestal, two pillars for cover.
//   East wing     — vault room (top, Star Sapphire behind a narrow door),
//                   Black Pearl in the south-east corner, EXIT bottom right.
// Doors are gaps in the walls: west-central at y 300..430, central-east at
// y 200..330, vault door at x 1040..1140 on the y 240 wall.

import { VIEW } from './config.js';

// Every wall is a solid rectangle {x, y, w, h}.
export function buildWalls() {
  return [
    // Outer shell.
    { x: 0, y: 0, w: 1280, h: 16 },
    { x: 0, y: 704, w: 1280, h: 16 },
    { x: 0, y: 0, w: 16, h: 720 },
    { x: 1264, y: 0, w: 16, h: 720 },
    // West / central divider, door gap y 300..430.
    { x: 400, y: 16, w: 16, h: 284 },
    { x: 400, y: 430, w: 16, h: 274 },
    // Central / east divider, door gap y 200..330.
    { x: 880, y: 16, w: 16, h: 184 },
    { x: 880, y: 330, w: 16, h: 374 },
    // Vault room wall at y 240, door gap x 1040..1140.
    { x: 896, y: 240, w: 144, h: 16 },
    { x: 1140, y: 240, w: 124, h: 16 },
    // Pillars in the central hall.
    { x: 600, y: 180, w: 36, h: 36 },
    { x: 700, y: 500, w: 36, h: 36 },
  ];
}

// Loot stands. The sapphire is the job: the exit only opens for a thief
// carrying it. The other three are worth points and nothing else.
export function buildLoot() {
  return [
    { id: 'idol', name: 'Gold Idol', x: 200, y: 140, value: 250, taken: false, kind: 'idol' },
    { id: 'mask', name: 'Jade Mask', x: 650, y: 360, value: 250, taken: false, kind: 'mask' },
    { id: 'pearl', name: 'Black Pearl', x: 1150, y: 560, value: 250, taken: false, kind: 'pearl' },
    { id: 'sapphire', name: 'Star Sapphire', x: 1120, y: 110, value: 1000, taken: false, kind: 'sapphire' },
  ];
}

export const EXIT = { x: 1220, y: 662, radius: 42 };

// The vault room, for the renderer to tint its floor gold.
export const VAULT_ROOM = { x: 896, y: 16, w: 368, h: 224 };

export function buildLevel() {
  return {
    width: VIEW.width,
    height: VIEW.height,
    walls: buildWalls(),
    loot: buildLoot(),
    exit: { ...EXIT },
    vault: { ...VAULT_ROOM },
  };
}

// True when a circle of radius r at (x, y) overlaps any wall.
export function circleHitsWall(walls, x, y, r) {
  for (const w of walls) {
    const nx = Math.max(w.x, Math.min(x, w.x + w.w));
    const ny = Math.max(w.y, Math.min(y, w.y + w.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// Move a circle by (dx, dy), sliding along walls: try x, then y, keeping
// whichever axis stays clear. Returns the new position.
export function slideMove(walls, x, y, r, dx, dy) {
  let nx = x;
  let ny = y;
  if (!circleHitsWall(walls, x + dx, y, r)) nx = x + dx;
  if (!circleHitsWall(walls, nx, y + dy, r)) ny = y + dy;
  return { x: nx, y: ny };
}

// True when the segment (x1,y1)-(x2,y2) touches rectangle r.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  // Slab test on each axis.
  for (const [p, d, lo, hi] of [
    [x1, dx, r.x, r.x + r.w],
    [y1, dy, r.y, r.y + r.h],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
    } else {
      let t0 = (lo - p) / d;
      let t1 = (hi - p) / d;
      if (t0 > t1) {
        const tmp = t0;
        t0 = t1;
        t1 = tmp;
      }
      tmin = Math.max(tmin, t0);
      tmax = Math.min(tmax, t1);
      if (tmin > tmax) return false;
    }
  }
  return true;
}

// True when any wall stands between the two points.
export function lineBlocked(walls, x1, y1, x2, y2) {
  for (const w of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return true;
  }
  return false;
}
