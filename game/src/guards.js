// Guards: three patrolling museum guards with fixed rounds. A guard
// walks its waypoints, turns to face where it walks, and its alertness
// climbs while the thief is inside its vision cone. At full alertness the
// guard knows where the thief is; during a lockdown every guard drops
// the patrol and hunts instead.

import { GUARD } from './config.js';
import { slideMove } from './level.js';
import { angleDiff, angleTo, canSee, dist } from './vision.js';
import { decoyForGuard } from './decoy.js';
import { updateGuardMind } from './search.js';

export function buildGuards() {
  return [
    {
      name: 'Marco',
      color: '#d64545',
      waypoints: [
        { x: 470, y: 120 },
        { x: 840, y: 120 },
      ],
      speed: 58,
      pos: { x: 470, y: 120 },
      target: 1,
      facing: 0,
      alert: 0,
      hunting: false,
    },
    {
      name: 'Iris',
      color: '#e07b39',
      waypoints: [
        { x: 520, y: 430 },
        { x: 810, y: 430 },
        { x: 810, y: 560 },
        { x: 520, y: 560 },
      ],
      speed: 52,
      pos: { x: 520, y: 430 },
      target: 1,
      facing: 0,
      alert: 0,
      hunting: false,
    },
    {
      name: 'Dario',
      color: '#c94f7c',
      waypoints: [
        { x: 950, y: 320 },
        { x: 950, y: 640 },
      ],
      speed: 62,
      pos: { x: 950, y: 320 },
      target: 1,
      facing: Math.PI / 2,
      alert: 0,
      hunting: false,
    },
  ];
}

// Turn `facing` toward `goal` by at most `step` radians.
function turnToward(facing, goal, step) {
  const d = angleDiff(goal, facing);
  if (Math.abs(d) <= step) return goal;
  return facing + Math.sign(d) * step;
}

// Does this guard have eyes on the thief right now?
export function guardSees(world, guard) {
  // Inside the vent duct Wren is out of every guard's sight.
  if (world.thief.inVent) return false;
  return canSee(
    world.level.walls,
    world.smokes,
    guard.pos.x,
    guard.pos.y,
    guard.facing,
    GUARD.sightRange,
    GUARD.sightHalfAngle,
    world.thief.x,
    world.thief.y,
  );
}

export function updateGuard(world, guard, dt) {
  const thief = world.thief;
  const seen = guardSees(world, guard);
  const rate = thief.sneaking ? GUARD.spotRateSneak : GUARD.spotRate;
  if (seen) guard.alert = Math.min(1, guard.alert + rate * dt);
  else guard.alert = Math.max(0, guard.alert - GUARD.calmRate * dt);
  guard.seen = seen;

  // Memory first: a guard that lost the trail investigates the last
  // seen spot, searches after a cold hunt, or checks the vault when
  // the alarm runs high. Handled here, it skips the patrol below.
  if (updateGuardMind(world, guard, dt)) return;

  const lockdown = world.lockdownUntil > world.time;
  if (lockdown || guard.alert >= 1) {
    // Hunt: walk straight at the thief, faster than a patrol.
    guard.hunting = true;
    const goal = angleTo(guard.pos.x, guard.pos.y, thief.x, thief.y);
    guard.facing = turnToward(guard.facing, goal, 6 * dt);
    const step = GUARD.huntSpeed * dt;
    const moved = slideMove(
      world.level.walls,
      guard.pos.x,
      guard.pos.y,
      GUARD.radius,
      Math.cos(guard.facing) * step,
      Math.sin(guard.facing) * step,
    );
    guard.pos.x = moved.x;
    guard.pos.y = moved.y;
    return;
  }

  // Patrol: walk to the current waypoint, then take the next one.
  // A live decoy that claimed this guard comes first: walk over and
  // stare at it until it fades, then go back to the round.
  const decoy = decoyForGuard(world, guard);
  if (decoy && !guard.hunting) {
    const d = dist(guard.pos.x, guard.pos.y, decoy.x, decoy.y);
    const goal = angleTo(guard.pos.x, guard.pos.y, decoy.x, decoy.y);
    guard.facing = turnToward(guard.facing, goal, 5 * dt);
    if (d > 24) {
      const step = Math.min(guard.speed * dt, d);
      const moved = slideMove(
        world.level.walls,
        guard.pos.x,
        guard.pos.y,
        GUARD.radius,
        Math.cos(guard.facing) * step,
        Math.sin(guard.facing) * step,
      );
      guard.pos.x = moved.x;
      guard.pos.y = moved.y;
    }
    return;
  }
  guard.hunting = false;
  const wp = guard.waypoints[guard.target];
  const d = dist(guard.pos.x, guard.pos.y, wp.x, wp.y);
  if (d < 6) {
    guard.target = (guard.target + 1) % guard.waypoints.length;
    return;
  }
  const goal = angleTo(guard.pos.x, guard.pos.y, wp.x, wp.y);
  guard.facing = turnToward(guard.facing, goal, 5 * dt);
  const step = Math.min(guard.speed * dt, d);
  const moved = slideMove(
    world.level.walls,
    guard.pos.x,
    guard.pos.y,
    GUARD.radius,
    Math.cos(guard.facing) * step,
    Math.sin(guard.facing) * step,
  );
  guard.pos.x = moved.x;
  guard.pos.y = moved.y;
}

// The nearest guard to a point, and how far away it is.
export function nearestGuard(guards, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const g of guards) {
    const d = dist(g.pos.x, g.pos.y, x, y);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return { guard: best, distance: bestD };
}
