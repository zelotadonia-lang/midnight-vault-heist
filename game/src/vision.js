// Sight: vision cones and line of sight. A watcher sees the thief only
// when all three hold: inside the cone, no wall between them, and no
// smoke in the way. Cameras and guards share these tests.

import { lineBlocked } from './level.js';

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Is the point (tx, ty) inside a cone rooted at (ox, oy), facing `angle`,
// with the given range and half-angle?
export function insideCone(ox, oy, angle, range, halfAngle, tx, ty) {
  const d = dist(ox, oy, tx, ty);
  if (d > range) return false;
  if (d < 4) return true;
  return Math.abs(angleDiff(angleTo(ox, oy, tx, ty), angle)) <= halfAngle;
}

// Does the segment (x1,y1)-(x2,y2) pass through a circle?
export function segmentHitsCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(x1, y1, cx, cy) <= r;
  let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return dist(px, py, cx, cy) <= r;
}

// Full sight test for one watcher. `smokes` is the list of live smoke
// clouds; the thief standing inside one is invisible, and a cloud between
// watcher and thief blocks the view as well.
export function canSee(walls, smokes, ox, oy, angle, range, halfAngle, tx, ty) {
  for (const s of smokes) {
    if (dist(tx, ty, s.x, s.y) <= s.r) return false;
    if (segmentHitsCircle(ox, oy, tx, ty, s.x, s.y, s.r)) return false;
  }
  if (!insideCone(ox, oy, angle, range, halfAngle, tx, ty)) return false;
  if (lineBlocked(walls, ox, oy, tx, ty)) return false;
  return true;
}
