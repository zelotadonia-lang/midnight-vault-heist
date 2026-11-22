// Seeing: a sector test (range and angle) plus a line-of-sight test against the
// level's solids. Guards, cameras and the renderer's cones all ask the same
// questions, so what the player sees is what the game sees.
import { FIELD } from './config.js';

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** True when `point` lies inside the vision sector of an observer. */
export function inSector(observer, point, range, halfAngle) {
  const dx = point.x - observer.x;
  const dy = point.y - observer.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  const angle = Math.atan2(dy, dx);
  return Math.abs(angleDifference(angle, observer.facing)) <= halfAngle;
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Slab test: the segment enters the rect when all three slabs overlap.
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** True when nothing solid stands between `a` and `b`. */
export function hasLineOfSight(a, b, solids) {
  for (let i = 0; i < solids.length; i += 1) {
    if (segmentHitsRect(a.x, a.y, b.x, b.y, solids[i])) return false;
  }
  return true;
}

/** True when a point sits inside any smoke cloud. */
export function inSmoke(point, smokes) {
  for (let i = 0; i < smokes.length; i += 1) {
    if (Math.hypot(point.x - smokes[i].x, point.y - smokes[i].y) < smokes[i].radius) return true;
  }
  return false;
}

/** Can the observer see the thief right now? */
export function canSee(observer, thief, range, halfAngle, solids, smokes) {
  if (inSmoke(thief, smokes) || inSmoke(observer, smokes)) return false;
  if (!inSector(observer, thief, range, halfAngle)) return false;
  return hasLineOfSight(observer, thief, solids);
}

/** Keep a circle inside the play bounds and out of the solids. */
export function resolveCollision(pos, radius, solids) {
  const bounds = { x: 8, y: 72 + 8, w: FIELD.width - 16, h: FIELD.height - 72 - 16 };
  pos.x = Math.min(bounds.x + bounds.w - radius, Math.max(bounds.x + radius, pos.x));
  pos.y = Math.min(bounds.y + bounds.h - radius, Math.max(bounds.y + radius, pos.y));
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    const nearestX = Math.min(s.x + s.w, Math.max(s.x, pos.x));
    const nearestY = Math.min(s.y + s.h, Math.max(s.y, pos.y));
    const dx = pos.x - nearestX;
    const dy = pos.y - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radius * radius) continue;
    if (distSq < 1e-9) {
      // Centre inside the solid: push out along the shortest side.
      const left = pos.x - s.x;
      const right = s.x + s.w - pos.x;
      const top = pos.y - s.y;
      const bottom = s.y + s.h - pos.y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) pos.x = s.x - radius;
      else if (m === right) pos.x = s.x + s.w + radius;
      else if (m === top) pos.y = s.y - radius;
      else pos.y = s.y + s.h + radius;
      continue;
    }
    const dist = Math.sqrt(distSq);
    pos.x = nearestX + (dx / dist) * radius;
    pos.y = nearestY + (dy / dist) * radius;
  }
  return pos;
}
