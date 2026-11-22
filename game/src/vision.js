// Seeing: a sector test (range plus angle) and a line-of-sight test
// against the level's solids. Guards, cameras and the drawn cones all ask
// these same questions, so what the player sees is what the game sees.
import { FIELD } from './config.js';

function wrapAngle(angle) {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= 2 * Math.PI;
  while (wrapped < -Math.PI) wrapped += 2 * Math.PI;
  return wrapped;
}

/** True when `point` sits inside the vision sector of an observer. */
export function inSector(observer, point, range, halfAngle) {
  const dx = point.x - observer.x;
  const dy = point.y - observer.y;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return false;
  if (distance < 1) return true;
  const bearing = Math.atan2(dy, dx);
  return Math.abs(wrapAngle(bearing - observer.facing)) <= halfAngle;
}

function segmentCrossesRect(x1, y1, x2, y2, rect) {
  // Slab test: the segment enters the rect when every slab overlaps.
  const dx = x2 - x1;
  const dy = y2 - y1;
  let enter = 0;
  let leave = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    enter = Math.max(enter, t1);
    leave = Math.min(leave, t2);
    if (enter > leave) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    enter = Math.max(enter, t1);
    leave = Math.min(leave, t2);
    if (enter > leave) return false;
  }
  return true;
}

/** True when no solid stands between `a` and `b`. */
export function hasLineOfSight(a, b, solids) {
  for (const solid of solids) {
    if (segmentCrossesRect(a.x, a.y, b.x, b.y, solid)) return false;
  }
  return true;
}

/** True when a point sits inside any smoke cloud. */
export function inSmoke(point, smokes) {
  for (const cloud of smokes) {
    if (Math.hypot(point.x - cloud.x, point.y - cloud.y) < cloud.radius) return true;
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
  const minX = 8 + radius;
  const maxX = FIELD.width - 8 - radius;
  const minY = 72 + 8 + radius;
  const maxY = FIELD.height - 8 - radius;
  pos.x = Math.min(maxX, Math.max(minX, pos.x));
  pos.y = Math.min(maxY, Math.max(minY, pos.y));
  for (const solid of solids) {
    const nearX = Math.min(solid.x + solid.w, Math.max(solid.x, pos.x));
    const nearY = Math.min(solid.y + solid.h, Math.max(solid.y, pos.y));
    const dx = pos.x - nearX;
    const dy = pos.y - nearY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radius * radius) continue;
    if (distSq < 1e-9) {
      // Centre inside the solid: leave along the shortest side.
      const toLeft = pos.x - solid.x;
      const toRight = solid.x + solid.w - pos.x;
      const toTop = pos.y - solid.y;
      const toBottom = solid.y + solid.h - pos.y;
      const shortest = Math.min(toLeft, toRight, toTop, toBottom);
      if (shortest === toLeft) pos.x = solid.x - radius;
      else if (shortest === toRight) pos.x = solid.x + solid.w + radius;
      else if (shortest === toTop) pos.y = solid.y - radius;
      else pos.y = solid.y + solid.h + radius;
      continue;
    }
    const dist = Math.sqrt(distSq);
    pos.x = nearX + (dx / dist) * radius;
    pos.y = nearY + (dy / dist) * radius;
  }
  return pos;
}
