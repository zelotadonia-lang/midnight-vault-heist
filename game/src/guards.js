// Guards: they walk their patrol loop, look where they walk, and remember
// what they saw. A guard that spots the thief stops patrolling and closes
// in; one that loses the thief walks to the last place it was seen, looks
// around, then goes back to its route. In a lockdown they all hunt at once.
import { GUARD } from './config.js';
import { canSee, resolveCollision } from './vision.js';

export function createGuards(definitions) {
  return definitions.map((def) => ({
    name: def.name,
    waypoints: def.waypoints,
    waypointIndex: 0,
    x: def.waypoints[0].x,
    y: def.waypoints[0].y,
    facing: 0,
    alertness: 0,
    mode: 'patrol',
    lastSeen: null,
    lookTimer: 0,
    spotTimer: 0,
    caught: false,
  }));
}

function walkToward(guard, target, speed, dt, solids) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return true;
  const step = Math.min(distance, speed * dt);
  guard.x += (dx / distance) * step;
  guard.y += (dy / distance) * step;
  guard.facing = Math.atan2(dy, dx);
  resolveCollision(guard, GUARD.radius, solids);
  return distance - step < 6;
}

export function updateGuards(guards, state, dt) {
  const { thief, solids, smokes, lockdown } = state;
  for (const guard of guards) {
    const sees = canSee(guard, thief, GUARD.visionRange, GUARD.visionHalfAngle, solids, smokes);
    const sneak = thief.sneaking ? 0.45 : 1;
    if (sees) {
      const distance = Math.hypot(thief.x - guard.x, thief.y - guard.y);
      const closeness = 1 - distance / GUARD.visionRange;
      guard.alertness = Math.min(1, guard.alertness + (0.55 + closeness * 1.5) * sneak * dt);
      guard.lastSeen = { x: thief.x, y: thief.y };
    } else {
      guard.alertness = Math.max(0, guard.alertness - 0.22 * dt);
    }

    if (guard.alertness > 0.62) guard.mode = 'chase';
    else if (guard.mode === 'chase' && guard.alertness < 0.25) guard.mode = 'search';
    else if (guard.mode === 'search' && guard.alertness <= 0.02) guard.mode = 'patrol';

    if (lockdown) guard.mode = guard.alertness > 0.3 ? 'chase' : 'search';

    if (guard.mode === 'patrol') {
      const target = guard.waypoints[guard.waypointIndex];
      if (walkToward(guard, target, GUARD.patrolSpeed, dt, solids)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      }
    } else if (guard.mode === 'chase' && guard.lastSeen) {
      walkToward(guard, guard.lastSeen, GUARD.chaseSpeed, dt, solids);
    } else if (guard.mode === 'search' && guard.lastSeen) {
      if (walkToward(guard, guard.lastSeen, GUARD.patrolSpeed * 1.25, dt, solids)) {
        guard.lookTimer += dt;
        guard.facing += dt * 1.4;
        if (guard.lookTimer > 2.2) {
          guard.lookTimer = 0;
          guard.lastSeen = null;
          guard.mode = 'patrol';
        }
      }
    }

    // The fair caught moment: a guard close enough and sure enough raises
    // the alarm for a beat before the grab, so breaking sight saves you.
    const close = Math.hypot(thief.x - guard.x, thief.y - guard.y) < GUARD.catchRadius;
    if (close && guard.alertness > 0.62 && state.screen === 'play') {
      guard.spotTimer += dt;
      if (guard.spotTimer >= GUARD.spotGrace) guard.caught = true;
    } else {
      guard.spotTimer = 0;
    }
  }
  return guards.some((g) => g.caught);
}
