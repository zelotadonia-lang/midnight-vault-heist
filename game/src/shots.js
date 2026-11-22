// The autopilot and the screenshot staging.
//
// The autopilot plays the heist the way a careful player would: it walks
// a fixed route through the gallery, sneaks when a guard is looking its
// way, pops smoke when a guard has eyes on it, and fires the EMP before
// the east camera can watch the Black Pearl and the exit. It drives the
// game through the same input the player uses (click targets, Shift,
// tool keys), so a win by the autopilot is a win a player can repeat.
//
// Shot staging puts the world into a fixed pose for one screenshot. The
// poses are set directly, never played, so every capture matches.

import { createWorld, stepWorld } from './world.js';
import { circleHitsWall } from './level.js';
import { angleDiff, angleTo, dist } from './vision.js';

// The route, in order: entrance, idol, west door, mask, east door,
// vault, sapphire, back out, pearl, exit.
export const ROUTE = [
  { x: 64, y: 140 },
  { x: 200, y: 140 },
  { x: 64, y: 365 },
  { x: 400, y: 365 },
  { x: 500, y: 365 },
  { x: 650, y: 360 },
  { x: 700, y: 285 },
  { x: 880, y: 285 },
  { x: 985, y: 285 },
  { x: 1090, y: 285 },
  { x: 1090, y: 200 },
  { x: 1120, y: 110 },
  { x: 1090, y: 200 },
  { x: 1090, y: 285 },
  { x: 1150, y: 420 },
  { x: 1150, y: 560 },
  { x: 1220, y: 662 },
];

// The waypoint where the vault run starts: arriving here, the autopilot
// fires the EMP so the east camera is dark for the pearl and the exit.
const EMP_WAYPOINT = 9;

export function createAutopilot() {
  return {
    wp: 0,
    checkX: 0,
    checkY: 0,
    checkStep: 0,
    steps: 0,
    detourUntil: 0,
    detourSide: 1,
    empFired: false,
  };
}

// Is a guard close and looking roughly toward the thief?
function guardPressuring(world) {
  const thief = world.thief;
  for (const guard of world.guards) {
    const d = dist(guard.pos.x, guard.pos.y, thief.x, thief.y);
    if (d > 260) continue;
    if (guard.alert > 0.25) return true;
    const toward = angleTo(guard.pos.x, guard.pos.y, thief.x, thief.y);
    if (Math.abs(angleDiff(toward, guard.facing)) < 0.9) return true;
  }
  return false;
}

// Fill `input` for one step of the autopilot. Returns false once the
// heist is over (won or caught); the caller stops stepping then.
export function autopilotInput(world, auto, input) {
  if (world.screen !== 'play') return false;
  const thief = world.thief;
  const now = world.time;

  // Tools first: smoke when a guard sees us up close, EMP when a camera
  // sees us, and the planned EMP before the vault run.
  for (const guard of world.guards) {
    if (guard.seen && thief.smokeCharges > 0) {
      const d = dist(guard.pos.x, guard.pos.y, thief.x, thief.y);
      if (d < 190) input.useSmoke = true;
    }
  }
  for (const cam of world.cameras) {
    if (cam.seen && thief.empCharges > 0) {
      if (dist(thief.x, thief.y, cam.x, cam.y) < 285) input.useEmp = true;
    }
  }
  if (!auto.empFired && auto.wp >= EMP_WAYPOINT && thief.empCharges > 0) {
    const east = world.cameras[1];
    if (east && now >= east.disabledUntil) {
      input.useEmp = true;
      auto.empFired = true;
    }
  }

  // Sneak when a guard is pressuring us; walk otherwise.
  input.keys = new Set();
  if (guardPressuring(world)) input.keys.add('ShiftLeft');

  // Pick the current waypoint, advancing when we arrive. The click is
  // re-issued every step outside a detour, so a stale sidestep can never
  // pin the thief against a wall.
  let target = ROUTE[auto.wp];
  if (!target) return false;
  if (dist(thief.x, thief.y, target.x, target.y) < 12) {
    auto.wp += 1;
    target = ROUTE[auto.wp];
    if (!target) return false;
  }
  const inDetour = now < auto.detourUntil;
  if (!inDetour) input.click = { x: target.x, y: target.y };

  // Stuck watch: compare the position now with where we were a second
  // and a half ago. A thief walking at full speed covers far more than
  // eight pixels in that time, so less means a wall is holding us.
  auto.steps += 1;
  if (auto.steps - auto.checkStep >= 90) {
    const moved = dist(thief.x, thief.y, auto.checkX, auto.checkY);
    auto.checkX = thief.x;
    auto.checkY = thief.y;
    auto.checkStep = auto.steps;
    if (moved < 8 && now >= auto.detourUntil) {
      const dx = target.x - thief.x;
      const dy = target.y - thief.y;
      const len = Math.hypot(dx, dy) || 1;
      // Try each side of the route until the sidestep point is clear of
      // walls; a point inside a wall is no detour at all.
      for (const side of [auto.detourSide, -auto.detourSide]) {
        const px = thief.x + (-dy / len) * 70 * side;
        const py = thief.y + (dx / len) * 70 * side;
        if (!circleHitsWall(world.level.walls, px, py, 14)) {
          auto.detourSide = -side;
          auto.detourUntil = now + 1.2;
          input.click = { x: px, y: py };
          break;
        }
      }
    }
  }
  return true;
}

// Run the autopilot on a fresh world until it wins, loses, or the clock
// runs out. Returns the world and a short summary.
export function runAutopilot(seed = 1, maxSeconds = 150) {
  const world = createWorld(seed);
  world.screen = 'play';
  const auto = createAutopilot();
  const input = { keys: new Set(), click: null, useSmoke: false, useEmp: false };
  const dt = 1 / 60;
  let steps = 0;
  const maxSteps = Math.floor(maxSeconds / dt);
  while (world.screen === 'play' && steps < maxSteps) {
    autopilotInput(world, auto, input);
    stepWorld(world, input, dt);
    steps += 1;
  }
  return {
    world,
    steps,
    seconds: steps * dt,
    won: world.screen === 'won',
    screen: world.screen,
    score: world.score,
  };
}

// ---------------------------------------------------------------- shots

function poseGuard(guard, x, y, facing, alert = 0) {
  guard.pos.x = x;
  guard.pos.y = y;
  guard.facing = facing;
  guard.alert = alert;
  guard.hunting = false;
  guard.seen = false;
}

function takeLoot(world, id) {
  const item = world.level.loot.find((l) => l.id === id);
  if (item && !item.taken) {
    item.taken = true;
    world.score += item.value;
    world.lootTaken += 1;
    if (id === 'sapphire') world.sapphireTaken = true;
  }
}

// Put a fresh world into the pose for one named screenshot.
export function stageShot(name, seed = 1) {
  const world = createWorld(seed);
  const [marco, iris, dario] = world.guards;
  const [north, east] = world.cameras;

  if (name === 'cover') {
    world.screen = 'title';
    world.time = 6;
    poseGuard(marco, 650, 120, 0);
    poseGuard(iris, 700, 430, 0);
    poseGuard(dario, 950, 480, Math.PI / 2);
    north.angle = Math.PI / 2 + 0.5;
    east.angle = Math.PI - 0.4;
  } else if (name === 'squeeze') {
    world.screen = 'play';
    world.time = 24;
    world.thief.x = 700;
    world.thief.y = 300;
    world.thief.sneaking = true;
    world.thief.facing = Math.PI / 2;
    world.alarm.level = 28;
    world.alarm.peak = 28;
    takeLoot(world, 'idol');
    takeLoot(world, 'mask');
    poseGuard(marco, 600, 120, 0, 0.5);
    poseGuard(iris, 700, 430, 0, 0.3);
    poseGuard(dario, 950, 500, Math.PI / 2);
    north.angle = Math.PI / 2 + 0.9;
    east.angle = Math.PI - 0.2;
  } else if (name === 'vault') {
    world.screen = 'play';
    world.time = 31;
    world.thief.x = 1120;
    world.thief.y = 110;
    world.thief.facing = -Math.PI / 2;
    world.alarm.level = 1;
    world.alarm.peak = 12;
    takeLoot(world, 'idol');
    takeLoot(world, 'mask');
    takeLoot(world, 'pearl');
    takeLoot(world, 'sapphire');
    poseGuard(marco, 520, 120, 0);
    poseGuard(iris, 810, 500, Math.PI / 2);
    poseGuard(dario, 950, 360, Math.PI / 2);
    north.angle = Math.PI / 2 - 0.7;
    east.angle = Math.PI + 0.5;
  } else if (name === 'getaway') {
    world.screen = 'play';
    world.time = 38;
    world.thief.x = 1195;
    world.thief.y = 640;
    world.thief.facing = Math.PI / 4;
    world.alarm.level = 18;
    world.alarm.peak = 34;
    world.thief.empCharges = 0;
    east.disabledUntil = world.time + 5;
    takeLoot(world, 'idol');
    takeLoot(world, 'mask');
    takeLoot(world, 'pearl');
    takeLoot(world, 'sapphire');
    poseGuard(marco, 500, 120, 0);
    poseGuard(iris, 600, 560, Math.PI);
    poseGuard(dario, 950, 600, -Math.PI / 2);
    north.angle = Math.PI / 2 + 0.3;
    east.angle = Math.PI;
  } else {
    throw new Error(`unknown shot: ${name}`);
  }
  return world;
}

export const SHOT_NAMES = ['cover', 'squeeze', 'vault', 'getaway'];
