// The world: one state object and one step function. The screens are
// title, play, paused, won and caught; only play advances the simulation.
// Everything the renderer draws comes from here, and nothing here touches
// the DOM.
import { SCORE, STEP, THIEF } from './config.js';
import { createLevel } from './level.js';
import { createGuards, updateGuards } from './guards.js';
import { createCameras, empBurst, updateCameras } from './cameras.js';
import { createThief, updateThief, useSmoke } from './thief.js';
import { createAlarm, updateAlarm } from './alarm.js';

export const EVENT_PICKUP = 1;
export const EVENT_VAULT = 2;
export const EVENT_WIN = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_LOCKDOWN = 16;
export const EVENT_STING = 32;
export const EVENT_SMOKE = 64;
export const EVENT_EMP = 128;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WON = 'won';
export const SCREEN_CAUGHT = 'caught';

export function createWorld(random) {
  const level = createLevel();
  const state = {
    random,
    level,
    solids: level.solids,
    thief: createThief(level.start),
    guards: createGuards(level.guards),
    cameras: createCameras(level.cameras),
    alarm: createAlarm(),
    smokes: [],
    screen: SCREEN_TITLE,
    time: 0,
    score: 0,
    finalScore: 0,
    breakdown: null,
    caughtBy: null,
    lockdownAnnounced: false,
  };
  return state;
}

export function resetWorld(state) {
  const fresh = createWorld(state.random);
  Object.keys(fresh).forEach((key) => {
    state[key] = fresh[key];
  });
  state.screen = SCREEN_PLAY;
}

function lootScore(state) {
  return state.thief.artifacts * SCORE.artifact + (state.thief.hasVault ? SCORE.vault : 0);
}

function scoreBreakdown(state) {
  const timeBonus = Math.max(0, Math.round(SCORE.timeBonusMax - Math.max(0, state.time - 60) * 5));
  const cleanBonus = state.alarm.peak < SCORE.cleanAlarmBelow ? SCORE.cleanBonus : 0;
  return {
    loot: lootScore(state),
    timeBonus,
    cleanBonus,
    total: lootScore(state) + timeBonus + cleanBonus,
  };
}

/**
 * Advance the play simulation one fixed step. `input` is the held keys,
 * `actions` the edge-triggered ones (smoke, emp). Returns an event bitmask
 * for sounds and announcements.
 */
export function stepWorld(state, input, actions, dt = STEP) {
  if (state.screen !== SCREEN_PLAY) return 0;
  let events = 0;
  const { thief, guards, cameras, alarm, level } = state;
  state.time += dt;

  if (actions.smoke) {
    const cloud = useSmoke(thief, state.smokes);
    if (cloud) events |= EVENT_SMOKE;
  }
  if (actions.emp && thief.emp > 0) {
    thief.emp -= 1;
    empBurst(cameras, thief);
    events |= EVENT_EMP;
  }

  updateThief(thief, input, dt, state.solids);
  updateCameras(cameras, state, dt);
  const wasLockdown = alarm.lockdown;
  updateAlarm(alarm, guards, cameras, dt);
  if (alarm.lockdown && !wasLockdown) events |= EVENT_LOCKDOWN;

  const alertnessBefore = guards.map((g) => g.alertness);
  const caught = updateGuards(guards, state, dt);
  for (let i = 0; i < guards.length; i += 1) {
    if (alertnessBefore[i] <= 0.62 && guards[i].alertness > 0.62) events |= EVENT_STING;
  }
  if (caught) {
    state.screen = SCREEN_CAUGHT;
    state.caughtBy = guards.find((g) => g.caught)?.name ?? 'a guard';
    return events | EVENT_CAUGHT;
  }

  for (let i = 0; i < state.smokes.length; i += 1) state.smokes[i].timer -= dt;
  state.smokes = state.smokes.filter((s) => s.timer > 0);

  for (const artifact of level.artifacts) {
    if (!artifact.taken && Math.hypot(thief.x - artifact.x, thief.y - artifact.y) < THIEF.grabRadius) {
      artifact.taken = true;
      thief.artifacts += 1;
      state.score = lootScore(state);
      events |= EVENT_PICKUP;
    }
  }

  if (!thief.hasVault && Math.hypot(thief.x - level.vault.x, thief.y - level.vault.y) < THIEF.grabRadius) {
    thief.hasVault = true;
    state.score = lootScore(state);
    events |= EVENT_VAULT;
  }

  if (thief.hasVault && Math.hypot(thief.x - level.exit.x, thief.y - level.exit.y) < THIEF.exitRadius) {
    state.screen = SCREEN_WON;
    state.breakdown = scoreBreakdown(state);
    state.finalScore = state.breakdown.total;
    return events | EVENT_WIN;
  }

  state.score = lootScore(state);
  return events;
}
