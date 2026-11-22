// Staging and the autopilot: the same rules drive the screenshots and the
// self test, so a staged frame is a frame of the real game. The autopilot
// walks a fixed route through the gallery, sneaks everywhere, waits out
// hot guards and spends smoke or EMP when a watcher gets too sure.
import { STEP, TOOLS } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  resetWorld,
  stepWorld,
  SCREEN_CAUGHT,
  SCREEN_PLAY,
  SCREEN_WON,
} from './world.js';

// The route: idol, pearl, mask, down the centre, along the bottom, up the
// right lane, through the vault doorway, back out, and to the EXIT.
const ROUTE = [
  { x: 300, y: 580 },
  { x: 540, y: 640 },
  { x: 700, y: 130 },
  { x: 640, y: 470 },
  { x: 640, y: 600 },
  { x: 950, y: 600 },
  { x: 1130, y: 600 },
  { x: 1130, y: 380 },
  { x: 1130, y: 280 },
  { x: 1215, y: 165 },
  { x: 1130, y: 280 },
  { x: 1130, y: 380 },
  { x: 1130, y: 600 },
  { x: 1215, y: 660 },
];

const IDLE_INPUT = { left: false, right: false, up: false, down: false, sneak: false };
const NO_ACTIONS = { smoke: false, emp: false };

export function createAutopilot() {
  let waypointIndex = 0;
  let prevAlerts = null;
  let lastX = null;
  let lastY = null;
  let stillSteps = 0;
  let detour = null;
  let detourSteps = 0;

  function alertsOf(state) {
    return [
      ...state.guards.map((g) => g.alertness),
      ...state.cameras.map((c) => c.alertness),
    ];
  }

  function nearestGuardDistance(state) {
    let nearest = Infinity;
    for (const guard of state.guards) {
      nearest = Math.min(nearest, Math.hypot(guard.x - state.thief.x, guard.y - state.thief.y));
    }
    return nearest;
  }

  function step(state) {
    const { thief } = state;
    const actions = { smoke: false, emp: false };
    const alerts = alertsOf(state);
    const maxAlert = Math.max(...alerts, 0);
    const rising = prevAlerts !== null && alerts.some((a, i) => a > prevAlerts[i] + 1e-9);
    prevAlerts = alerts;

    // A watcher getting sure while close by: drop smoke and break sight.
    if (thief.smoke > 0 && maxAlert > 0.55 && rising) {
      const near = state.guards.some(
        (g) => g.alertness > 0.55 && Math.hypot(g.x - thief.x, g.y - thief.y) < 160,
      );
      if (near) actions.smoke = true;
    }
    // A camera getting sure within EMP reach: switch it off.
    if (thief.emp > 0 && maxAlert > 0.55 && rising) {
      const hot = state.cameras.some(
        (c) => c.alertness > 0.55 && Math.hypot(c.x - thief.x, c.y - thief.y) <= TOOLS.empRadius,
      );
      if (hot) actions.emp = true;
    }

    // Hot but no longer seen, and nobody close: stand still, let it fade.
    if (maxAlert > 0.45 && !rising && nearestGuardDistance(state) > 120) {
      return { input: { ...IDLE_INPUT, sneak: true }, actions };
    }

    const waypoint = ROUTE[waypointIndex];
    if (!waypoint) return { input: { ...IDLE_INPUT }, actions };
    let goal = waypoint;
    if (detour) {
      goal = detour;
      detourSteps -= 1;
      if (detourSteps <= 0) detour = null;
    }
    const dx = goal.x - thief.x;
    const dy = goal.y - thief.y;
    const distance = Math.hypot(dx, dy);
    if (detour) {
      // Reaching a sidestep clears it; the real waypoint still waits.
      if (distance < 12) detour = null;
    } else if (distance < 12) {
      waypointIndex += 1;
      return { input: { ...IDLE_INPUT, sneak: true }, actions };
    }

    // Stuck against something: the thief is not moving at all while trying
    // to walk. Sidestep for a second, then carry on. Position-based, so
    // ordinary slow sneaking never trips it.
    if (lastX !== null && Math.hypot(thief.x - lastX, thief.y - lastY) < 0.05) {
      stillSteps += 1;
    } else {
      stillSteps = 0;
    }
    lastX = thief.x;
    lastY = thief.y;
    if (stillSteps > 120 && !detour) {
      const side = { x: waypoint.x - dy * 0.2, y: waypoint.y + dx * 0.2 };
      detour = side;
      detourSteps = 60;
      stillSteps = 0;
    }

    return {
      input: {
        left: dx < -4,
        right: dx > 4,
        up: dy < -4,
        down: dy > 4,
        sneak: true,
      },
      actions,
    };
  }

  return { step };
}

/**
 * Play a whole heist with the autopilot on a fresh world. Stops on a win, a
 * catch, or after `maxSeconds` of game time. Returns the state and the
 * numbers the self test reports.
 */
export function simulateHeist(seed, maxSeconds = 120) {
  const state = createWorld(createRandom(seed));
  state.screen = SCREEN_PLAY;
  const pilot = createAutopilot();
  const maxSteps = Math.floor(maxSeconds / STEP);
  let steps = 0;
  while (steps < maxSteps && state.screen === SCREEN_PLAY) {
    const { input, actions } = pilot.step(state);
    stepWorld(state, input, actions);
    steps += 1;
  }
  return {
    state,
    won: state.screen === SCREEN_WON,
    caught: state.screen === SCREEN_CAUGHT,
    steps,
    time: state.time,
    score: state.finalScore || state.score,
    loot: state.score,
    artifacts: state.thief.artifacts,
    hasVault: state.thief.hasVault,
    peak: state.alarm.peak,
    alarm: state.alarm.value,
  };
}

/**
 * Stage one screenshot scene on a fresh world (seed 1). The scenes come
 * from the autopilot playing for real; only the alarm dial on the squeeze
 * and getaway scenes is set to a readable number, the positions are all
 * simulated.
 */
export function stageShot(name, seed = 1) {
  const state = createWorld(createRandom(seed));
  state.screen = SCREEN_PLAY;
  const pilot = createAutopilot();

  if (name === 'cover') {
    state.screen = 'title';
    return { state, info: 'SHOT cover alarm=0' };
  }

  const maxSteps = Math.floor(120 / STEP);
  let steps = 0;
  if (name === 'squeeze') {
    while (steps < maxSteps && state.screen === SCREEN_PLAY && state.alarm.value < 20) {
      const { input, actions } = pilot.step(state);
      stepWorld(state, input, actions);
      steps += 1;
    }
    state.thief.sneaking = true;
    state.alarm.value = 28;
    state.alarm.peak = Math.max(state.alarm.peak, 28);
    return { state, info: `SHOT squeeze alarm=28 time=${state.time.toFixed(1)}` };
  }

  if (name === 'vault') {
    while (steps < maxSteps && state.screen === SCREEN_PLAY && !state.thief.hasVault) {
      const { input, actions } = pilot.step(state);
      stepWorld(state, input, actions);
      steps += 1;
    }
    return { state, info: `SHOT vault hasVault=${state.thief.hasVault} artifacts=${state.thief.artifacts} time=${state.time.toFixed(1)}` };
  }

  if (name === 'getaway') {
    while (steps < maxSteps && state.screen === SCREEN_PLAY) {
      const { input, actions } = pilot.step(state);
      stepWorld(state, input, actions);
      steps += 1;
      const nearExit = Math.hypot(state.thief.x - state.level.exit.x, state.thief.y - state.level.exit.y) < 160;
      if (state.thief.hasVault && nearExit) break;
    }
    state.alarm.value = 18;
    state.alarm.peak = Math.max(state.alarm.peak, 18);
    return { state, info: `SHOT getaway hasVault=${state.thief.hasVault} alarm=18 time=${state.time.toFixed(1)}` };
  }

  return { state, info: `SHOT ${name} unknown` };
}

export { createWorld, resetWorld, IDLE_INPUT, NO_ACTIONS };
