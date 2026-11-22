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
import { buildFx, spawnFxFromEvents, updateFx } from './effects.js';
import { buildBanter, updateBanter } from './banter.js';
import { buildHints, updateHints } from './hints.js';
import { updateDecoys } from './decoy.js';
import { buildVents } from './vents.js';
import { parBonusFor, quietBonusFor } from './partime.js';
import { dist } from './vision.js';

export function createWorld(seed = 1) {
  const level = buildLevel();
  const world = {
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
    decoys: [],
    vents: buildVents(),
    vaultCheckAt: 0,
    fx: buildFx(seed),
    banter: buildBanter(),
    hints: buildHints(),
    stats: { distance: 0, spotted: 0, toolsUsed: 0, lockdowns: 0, ventsUsed: 0 },
    events: [],
    score: 0,
    lootTaken: 0,
    sapphireTaken: false,
    caughtBy: null,
    wonAt: 0,
    best: 0,
  };
  // A run's seed shuffles the guards' rounds: seed 1 keeps the rounds
  // exactly as built, any other seed starts each guard further along
  // its own round, so no two seeds patrol alike.
  if (seed !== 1) {
    world.guards.forEach((guard, i) => {
      guard.target = (guard.target + seed + i) % guard.waypoints.length;
    });
  }
  return world;
}

export function hasSapphire(world) {
  return world.sapphireTaken;
}

export function scoreNow(world) {
  const elapsed = world.wonAt > 0 ? world.wonAt : world.time;
  const timeBonus = Math.max(0, SCORE.timeBase - Math.round(SCORE.timeRate * elapsed));
  // The par bonus only pays on a finished run; the quiet tier reads
  // the alarm peak, so an unseen run is worth more than a merely
  // quiet one.
  const parBonus = world.wonAt > 0 ? parBonusFor(elapsed) : 0;
  const quietBonus = quietBonusFor(world.alarm.peak);
  return world.score + timeBonus + parBonus + quietBonus;
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
      world.events.push(
        item.id === 'sapphire' ? 'sapphire' : item.id === 'crown' ? 'crown' : 'loot',
      );
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

  const seenBefore = world.guards.map((g) => g.seen);
  const px = world.thief.x;
  const py = world.thief.y;
  updateThief(world, input, dt);
  world.stats.distance += dist(px, py, world.thief.x, world.thief.y);
  for (const guard of world.guards) updateGuard(world, guard, dt);
  for (const camera of world.cameras) updateCamera(world, camera, dt);

  // Expire old smoke clouds and decoys.
  world.smokes = world.smokes.filter((s) => world.time < s.until);
  updateDecoys(world);

  let guardsSeeing = 0;
  let camerasSeeing = 0;
  for (const guard of world.guards) if (guard.seen) guardsSeeing += 1;
  for (const camera of world.cameras) if (camera.seen) camerasSeeing += 1;
  for (let i = 0; i < world.guards.length; i++) {
    if (!seenBefore[i] && world.guards[i].seen) world.stats.spotted += 1;
  }
  endLockdown(world);
  updateAlarm(world, { guards: guardsSeeing, cameras: camerasSeeing }, dt);
  if (world.events[world.events.length - 1] === 'lockdown') world.stats.lockdowns += 1;

  collectLoot(world);
  spawnFxFromEvents(world);
  updateFx(world, dt);
  updateBanter(world);
  updateHints(world);
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
    useDecoy: false,
    useVent: false,
  };
}
