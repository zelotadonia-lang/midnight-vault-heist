// The world: one object holding the whole heist, and one step function
// that advances it. No DOM, no audio, no canvas here, so the same code
// runs in the browser and in a plain Node test harness.
//
// Screens: 'title' | 'play' | 'paused' | 'won' | 'caught'. The step
// function only simulates while the screen is 'play'.

import { ALARM, SCORE, THIEF } from './config.js';
import { buildLevel } from './level.js';
import { buildGuards, updateGuard } from './guards.js';
import { buildCameras, updateCamera } from './cameras.js';
import { buildThief, updateThief } from './thief.js';
import { buildAlarm, endLockdown, updateAlarm } from './alarm.js';
import { dist } from './vision.js';

export function createWorld(seed = 1) {
  const level = buildLevel();
  return {
    seed,
    time: 0,
    screen: 'title',
    level,
    thief: buildThief(),
    guards: buildGuards(),
    cameras: buildCameras(),
    alarm: buildAlarm(),
    lockdownUntil: 0,
    smokes: [],
    events: [],
    score: 0,
    lootTaken: 0,
    sapphireTaken: false,
    caughtBy: null,
    wonAt: 0,
    best: 0,
  };
}

export function hasSapphire(world) {
  return world.sapphireTaken;
}

export function scoreNow(world) {
  const elapsed = world.wonAt > 0 ? world.wonAt : world.time;
  const timeBonus = Math.max(0, SCORE.timeBase - Math.round(SCORE.timeRate * elapsed));
  const quietBonus = world.alarm.peak < ALARM.quietCeiling ? SCORE.quietBonus : 0;
  return world.score + timeBonus + quietBonus;
}

function collectLoot(world) {
  const thief = world.thief;
  for (const item of world.level.loot) {
    if (item.taken) continue;
    if (dist(thief.x, thief.y, item.x, item.y) <= THIEF.pickupRadius) {
      item.taken = true;
      world.score += item.value;
      world.lootTaken += 1;
      if (item.id === 'sapphire') world.sapphireTaken = true;
      world.events.push(item.id === 'sapphire' ? 'sapphire' : 'loot');
    }
  }
}

function checkCaught(world) {
  for (const guard of world.guards) {
    if (dist(guard.pos.x, guard.pos.y, world.thief.x, world.thief.y) <= 27) {
      world.screen = 'caught';
      world.caughtBy = guard.name;
      world.events.push('caught');
      return true;
    }
  }
  return false;
}

function checkWon(world) {
  const exit = world.level.exit;
  if (!world.sapphireTaken) return false;
  if (dist(world.thief.x, world.thief.y, exit.x, exit.y) > exit.radius) return false;
  world.screen = 'won';
  world.wonAt = world.time;
  world.events.push('won');
  return true;
}

export function stepWorld(world, input, dt) {
  if (world.screen !== 'play') return;
  world.time += dt;

  updateThief(world, input, dt);
  for (const guard of world.guards) updateGuard(world, guard, dt);
  for (const camera of world.cameras) updateCamera(world, camera, dt);

  // Expire old smoke clouds.
  world.smokes = world.smokes.filter((s) => world.time < s.until);

  let guardsSeeing = 0;
  let camerasSeeing = 0;
  for (const guard of world.guards) if (guard.seen) guardsSeeing += 1;
  for (const camera of world.cameras) if (camera.seen) camerasSeeing += 1;
  endLockdown(world);
  updateAlarm(world, { guards: guardsSeeing, cameras: camerasSeeing }, dt);

  collectLoot(world);
  if (checkCaught(world)) return;
  checkWon(world);
}

// A fresh input object: keys held, one-shot tool presses, one click.
export function blankInput() {
  return {
    keys: new Set(),
    click: null,
    useSmoke: false,
    useEmp: false,
  };
}
