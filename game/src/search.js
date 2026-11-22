// Guard memory: investigate, search, and the vault check.
//
// A guard is no longer a patrol loop with a panic switch. Every guard
// remembers the last place it saw Wren, and acts on it:
//
// - Suspicious (alert at half or more, eyes lost): walk to the last
//   seen spot and look around before going back to the round.
// - Hunting, trail gone cold for two seconds: drop to a search. Walk
//   to the last seen spot, stand and sweep the room for a few seconds,
//   then give up and patrol again.
// - Alarm at 60 or more: the nearest patrolling guard breaks off to
//   check the vault door, once per alarm spike, and stands watching it.
//
// A guard that spots Wren again drops all of this and hunts. A guard
// busy investigating a real sighting ignores the holo-decoy.

import { angleDiff, angleTo, dist } from './vision.js';
import { slideMove } from './level.js';

const VAULT_DOOR = { x: 1090, y: 256 };
const INVESTIGATE_ALERT = 0.5;
const HUNT_LOST_SECONDS = 2;
const SEARCH_SECONDS = 3;
const INVESTIGATE_SECONDS = 2.5;
const VAULT_CHECK_SECONDS = 5;
const VAULT_CHECK_COOLDOWN = 25;
const HIGH_ALARM = 60;

function turnToward(facing, goal, step) {
  const d = angleDiff(goal, facing);
  if (Math.abs(d) <= step) return goal;
  return facing + Math.sign(d) * step;
}

// Walk toward (x, y) at the guard's patrol speed. Returns true while
// still walking, false once arrived.
function walkTo(world, guard, x, y, dt) {
  const d = dist(guard.pos.x, guard.pos.y, x, y);
  if (d < 20) return false;
  const goal = angleTo(guard.pos.x, guard.pos.y, x, y);
  guard.facing = turnToward(guard.facing, goal, 5 * dt);
  const step = Math.min(guard.speed * dt, d);
  const moved = slideMove(
    world.level.walls,
    guard.pos.x,
    guard.pos.y,
    15,
    Math.cos(guard.facing) * step,
    Math.sin(guard.facing) * step,
  );
  guard.pos.x = moved.x;
  guard.pos.y = moved.y;
  return true;
}

// Stand and sweep the room: turn one way, then the other, on the clock
// so the same run always sweeps the same way.
function scanAround(guard, now, dt) {
  const dir = Math.floor(now / 1.5) % 2 === 0 ? 1 : -1;
  guard.facing += dir * 1.9 * dt;
}

function ensureMind(guard) {
  if (!guard.state) {
    guard.state = 'patrol';
    guard.lastSeen = null;
    guard.stateUntil = 0;
    guard.lostSince = 0;
  }
}

// The nearest patrolling guard to the vault door claims the vault
// check. Only one guard goes: the first caller this step sets the
// world's stamp, and the rest see it is fresh and stay on patrol.
function claimVaultCheck(world, guard) {
  if (world.alarm.level < HIGH_ALARM) return false;
  if (guard.state !== 'patrol' || guard.hunting) return false;
  const last = world.vaultCheckAt || -1e9;
  if (world.time - last < VAULT_CHECK_COOLDOWN) return false;
  for (const other of world.guards) {
    // A guard whose mind has not run yet this step has no state: it
    // is patrolling, like every guard starts.
    const otherState = other.state || 'patrol';
    if (other === guard || otherState !== 'patrol' || other.hunting) continue;
    if (dist(other.pos.x, other.pos.y, VAULT_DOOR.x, VAULT_DOOR.y) <
        dist(guard.pos.x, guard.pos.y, VAULT_DOOR.x, VAULT_DOOR.y)) {
      return false;
    }
  }
  world.vaultCheckAt = world.time;
  guard.state = 'vaultcheck';
  guard.stateUntil = world.time + VAULT_CHECK_SECONDS;
  return true;
}

// Run one step of the guard's memory. Returns true when this module
// moved the guard or held it in place this step, so the caller skips
// the patrol; false when the guard should hunt, follow a decoy, or
// patrol as before.
export function updateGuardMind(world, guard, dt) {
  ensureMind(guard);
  const now = world.time;

  if (guard.seen) {
    guard.lastSeen = { x: world.thief.x, y: world.thief.y };
    guard.lostSince = 0;
    if (guard.state === 'search' || guard.state === 'investigate') {
      guard.state = 'patrol';
    }
    return false;
  }

  // Full alert or lockdown means hunt, not think: leave it to the
  // hunt branch, except for a hunt whose trail has gone cold outside
  // a lockdown — that guard drops into a search instead.
  const lockdown = world.lockdownUntil > world.time;
  if (lockdown || guard.alert >= 1) {
    if (!lockdown && guard.hunting && !guard.seen) {
      if (!guard.lostSince) {
        guard.lostSince = now;
        return false;
      }
      if (now - guard.lostSince > HUNT_LOST_SECONDS) {
        guard.state = 'search';
        guard.stateUntil = now + SEARCH_SECONDS;
        guard.hunting = false;
        guard.alert = 0.6;
        guard.lostSince = 0;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  if (guard.state === 'search') {
    if (now >= guard.stateUntil) {
      guard.state = 'patrol';
      guard.alert = 0.3;
      return false;
    }
    if (guard.lastSeen && walkTo(world, guard, guard.lastSeen.x, guard.lastSeen.y, dt)) {
      return true;
    }
    scanAround(guard, now, dt);
    return true;
  }

  if (guard.state === 'investigate') {
    if (now >= guard.stateUntil) {
      guard.state = 'patrol';
      return false;
    }
    if (guard.lastSeen && walkTo(world, guard, guard.lastSeen.x, guard.lastSeen.y, dt)) {
      return true;
    }
    scanAround(guard, now, dt);
    return true;
  }

  if (guard.state === 'vaultcheck') {
    if (now >= guard.stateUntil) {
      guard.state = 'patrol';
      return false;
    }
    if (walkTo(world, guard, VAULT_DOOR.x, VAULT_DOOR.y, dt)) return true;
    guard.facing = turnToward(guard.facing, -Math.PI / 2, 5 * dt);
    return true;
  }

  // Suspicious and the trail is lost: go look where Wren was last seen.
  if (guard.alert >= INVESTIGATE_ALERT && guard.lastSeen) {
    guard.state = 'investigate';
    guard.stateUntil = now + INVESTIGATE_SECONDS;
    if (walkTo(world, guard, guard.lastSeen.x, guard.lastSeen.y, dt)) return true;
    scanAround(guard, now, dt);
    return true;
  }

  // High alarm: send the nearest guard to watch the vault door.
  if (claimVaultCheck(world, guard)) {
    if (walkTo(world, guard, VAULT_DOOR.x, VAULT_DOOR.y, dt)) return true;
    guard.facing = turnToward(guard.facing, -Math.PI / 2, 5 * dt);
    return true;
  }

  return false;
}
