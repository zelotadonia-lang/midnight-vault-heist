// The screenshot scenes behind ?shot=cover|squeeze|vault|getaway. Each one plays
// the real rules forward from a fresh world for a fixed time or until an
// objective is reached, steered by a simple autopilot: it walks toward the
// next objective and steps around the vision cones it can see. The frame is
// what a short game really looks like, and the same seed always gives the
// same frame.
import { CAMERA, GUARD, STEP, THIEF } from './config.js';
import { canSee, inSector } from './vision.js';
import { resetWorld, SCREEN_PLAY, stepWorld } from './world.js';

const DIRECTIONS = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];

function circleHitsSolid(x, y, radius, solids) {
  for (let i = 0; i < solids.length; i += 1) {
    const s = solids[i];
    const nx = Math.min(s.x + s.w, Math.max(s.x, x));
    const ny = Math.min(s.y + s.h, Math.max(s.y, y));
    if ((x - nx) ** 2 + (y - ny) ** 2 < radius * radius) return true;
  }
  return false;
}

function seenFrom(pos, state) {
  const probe = { x: pos.x, y: pos.y };
  for (const g of state.guards) {
    if (canSee(g, probe, GUARD.visionRange, GUARD.visionHalfAngle, state.solids, state.smokes)) return true;
  }
  for (const c of state.cameras) {
    if (c.disabledTimer > 0) continue;
    if (canSee(c, probe, CAMERA.visionRange, CAMERA.visionHalfAngle, state.solids, state.smokes)) return true;
  }
  return false;
}

function nearCone(pos, state) {
  const probe = { x: pos.x, y: pos.y };
  for (const g of state.guards) {
    if (inSector(g, probe, GUARD.visionRange * 1.2, GUARD.visionHalfAngle)) return true;
  }
  for (const c of state.cameras) {
    if (c.disabledTimer > 0) continue;
    if (inSector(c, probe, CAMERA.visionRange * 1.2, CAMERA.visionHalfAngle)) return true;
  }
  return false;
}

function nextObjective(state) {
  const thief = state.thief;
  let best = null;
  let bestDist = Infinity;
  for (const a of state.level.artifacts) {
    if (a.taken) continue;
    const d = Math.hypot(a.x - thief.x, a.y - thief.y);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  if (best) return best;
  if (!thief.hasVault) return state.level.vault;
  return state.level.exit;
}

/** One autopilot step: the keys and actions for this frame. */
function autopilot(state, pilot) {
  const thief = state.thief;
  const objective = nextObjective(state);
  const speed = THIEF.walkSpeed;
  const horizon = 0.4;
  let bestDir = null;
  let bestCost = Infinity;
  for (const [dx, dy] of DIRECTIONS) {
    const len = Math.hypot(dx, dy);
    const px = thief.x + (dx / len) * speed * horizon;
    const py = thief.y + (dy / len) * speed * horizon;
    if (px < 20 || px > 1260 || py < 90 || py > 700) continue;
    if (circleHitsSolid(px, py, THIEF.radius, state.solids)) continue;
    const dist = Math.hypot(objective.x - px, objective.y - py);
    let cost = dist;
    if (seenFrom({ x: px, y: py }, state)) cost += 1200;
    else if (nearCone({ x: px, y: py }, state)) cost += 150;
    for (const g of state.guards) {
      if (Math.hypot(g.x - px, g.y - py) < 70) cost += 800;
    }
    if (cost < bestCost) {
      bestCost = cost;
      bestDir = [dx / len, dy / len];
    }
  }

  // Stuck against a case: step sideways for a second, then try again.
  const distNow = Math.hypot(objective.x - thief.x, objective.y - thief.y);
  if (pilot.detour > 0) {
    pilot.detour -= 1;
    bestDir = pilot.detourDir;
  } else if (distNow > pilot.lastDist - 2) {
    pilot.stall += 1;
    if (pilot.stall > 150) {
      pilot.stall = 0;
      pilot.detour = 60;
      const toward = Math.atan2(objective.y - thief.y, objective.x - thief.x);
      pilot.detourDir = [Math.cos(toward + Math.PI / 2), Math.sin(toward + Math.PI / 2)];
      bestDir = pilot.detourDir;
    }
  } else {
    pilot.stall = 0;
  }
  pilot.lastDist = distNow;

  const input = { left: false, right: false, up: false, down: false, sneak: false, moveTarget: null };
  if (bestDir) {
    input.right = bestDir[0] > 0.3;
    input.left = bestDir[0] < -0.3;
    input.down = bestDir[1] > 0.3;
    input.up = bestDir[1] < -0.3;
    input.sneak = nearCone(thief, state) || seenFrom(thief, state);
  }
  const actions = { smoke: false, emp: false };
  if (seenFrom(thief, state) && thief.smoke > 0 && state.time - pilot.lastSmoke > 8) {
    actions.smoke = true;
    pilot.lastSmoke = state.time;
  }
  return { input, actions };
}

/**
 * Set `world` to the named scene and return the screen to draw and a small
 * info object the screenshot run can read back.
 */
export function stageShot(name, world) {
  resetWorld(world);
  world.screen = SCREEN_PLAY;
  const pilot = { lastDist: Infinity, stall: 0, detour: 0, detourDir: [0, 0], lastSmoke: -99 };

  function run(seconds, until) {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) {
      if (until && until(world)) break;
      const { input, actions } = autopilot(world, pilot);
      stepWorld(world, input, actions, STEP);
      if (world.screen !== SCREEN_PLAY) break;
    }
  }

  if (name === 'squeeze') run(60, (w) => w.alarm.value >= 28);
  else if (name === 'vault') run(150, (w) => w.thief.hasVault);
  else if (name === 'getaway') run(180, (w) => w.screen !== SCREEN_PLAY);
  else run(6); // cover: the opening, a few seconds in

  return {
    screen: SCREEN_PLAY,
    info: {
      shot: name,
      screen: world.screen,
      thief: { x: Math.round(world.thief.x), y: Math.round(world.thief.y) },
      alarm: Math.round(world.alarm.value),
      score: world.score,
      hasVault: world.thief.hasVault,
      artifacts: world.thief.artifacts,
      time: Math.round(world.time * 10) / 10,
    },
  };
}
