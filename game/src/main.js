// Boot, the fixed-step loop, the screens, and the two special modes:
// ?shot=<name> stages one frame for a screenshot, ?selftest=1 runs the
// checks synchronously and prints them where --dump-dom can read them.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  resetWorld,
  stepWorld,
  EVENT_CAUGHT,
  EVENT_EMP,
  EVENT_LOCKDOWN,
  EVENT_PICKUP,
  EVENT_SMOKE,
  EVENT_STING,
  EVENT_VAULT,
  EVENT_WIN,
  SCREEN_CAUGHT,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WON,
} from './world.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { simulateHeist, stageShot, IDLE_INPUT, NO_ACTIONS } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? '1') || 1;
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';

const canvas = document.getElementById('game');
const statusLine = document.getElementById('status');
const shotInfo = document.getElementById('shotinfo');

let best = 0;
try {
  best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
} catch {
  best = 0;
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // A browser that blocks storage still plays; the best score just resets.
  }
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function playEvents(events, state, audio) {
  if (events & EVENT_PICKUP) audio.pickup();
  if (events & EVENT_VAULT) {
    audio.vault();
    announce('Star Sapphire secured. Get to the EXIT.');
  }
  if (events & EVENT_STING) audio.sting();
  if (events & EVENT_SMOKE) audio.smoke();
  if (events & EVENT_EMP) audio.emp();
  if (events & EVENT_LOCKDOWN) announce('Lockdown. Every guard is hunting.');
  if (events & EVENT_WIN) {
    audio.win();
    audio.stopAlarm();
    if (state.finalScore > best) {
      best = state.finalScore;
      saveBest();
    }
    announce(`Clean getaway. Score ${state.finalScore}.`);
  }
  if (events & EVENT_CAUGHT) {
    audio.lose();
    audio.stopAlarm();
    announce(`${state.caughtBy} caught you. The sapphire stays in its case.`);
  }
}

/** The checks ?selftest=1 runs in the browser. Each returns a line. */
function runSelfTest() {
  const lines = [];
  const check = (name, pass, detail) => lines.push(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);

  // 1. The autopilot wins the whole heist.
  {
    const outcome = simulateHeist(seed);
    check(
      'autopilot-wins',
      outcome.won && outcome.hasVault && outcome.artifacts === 3,
      `won=${outcome.won} vault=${outcome.hasVault} artifacts=${outcome.artifacts}/3 score=${outcome.score} time=${outcome.time.toFixed(1)}s peak=${Math.round(outcome.peak)}`,
    );
  }

  // 2. Standing still for 5 seconds raises no alarm.
  {
    const state = createWorld(createRandom(seed));
    state.screen = SCREEN_PLAY;
    for (let i = 0; i < 300; i += 1) stepWorld(state, IDLE_INPUT, NO_ACTIONS);
    check('idle-quiet', state.alarm.value === 0, `alarm=${state.alarm.value}`);
  }

  // 3. Walking into a guard's cone raises the alarm.
  {
    const state = createWorld(createRandom(seed));
    state.screen = SCREEN_PLAY;
    const marco = state.guards[0];
    marco.x = 300; marco.y = 150; marco.facing = 0; marco.alertness = 0;
    state.thief.x = 400; state.thief.y = 150;
    // Marco first walks west to his waypoint, turns, then walks east toward
    // the thief: three seconds covers the turn and the sighting.
    for (let i = 0; i < 180; i += 1) stepWorld(state, IDLE_INPUT, NO_ACTIONS);
    check('guard-raises-alarm', marco.alertness >= 0.99 && state.alarm.value > 5, `alarm=${state.alarm.value.toFixed(1)} alertness=${marco.alertness.toFixed(2)}`);
  }

  // 4. Smoke blocks a guard's sight.
  {
    const state = createWorld(createRandom(seed));
    state.screen = SCREEN_PLAY;
    const marco = state.guards[0];
    marco.x = 300; marco.y = 150; marco.facing = 0; marco.alertness = 0;
    state.thief.x = 380; state.thief.y = 150;
    stepWorld(state, IDLE_INPUT, { smoke: true, emp: false });
    for (let i = 0; i < 120; i += 1) stepWorld(state, IDLE_INPUT, NO_ACTIONS);
    check('smoke-blocks-sight', marco.alertness < 0.15 && state.thief.smoke === 2, `alertness=${marco.alertness.toFixed(2)} smokeLeft=${state.thief.smoke}`);
  }

  // 5. An EMP pulse switches a camera off.
  {
    const state = createWorld(createRandom(seed));
    state.screen = SCREEN_PLAY;
    // Under the top camera, off every patrol route: the EMP hits the camera
    // and no guard wanders by to feed the alarm.
    state.thief.x = 640; state.thief.y = 300;
    stepWorld(state, IDLE_INPUT, { smoke: false, emp: true });
    for (let i = 0; i < 120; i += 1) stepWorld(state, IDLE_INPUT, NO_ACTIONS);
    const camera = state.cameras[0];
    check('emp-disables-camera', camera.disabledTimer > 0 && state.alarm.value === 0, `disabled=${camera.disabledTimer.toFixed(1)}s alarm=${state.alarm.value}`);
  }

  // 6. Alarm 100 trips a 12-second lockdown.
  {
    const state = createWorld(createRandom(seed));
    state.screen = SCREEN_PLAY;
    const marco = state.guards[0];
    marco.x = 300; marco.y = 150; marco.facing = 0;
    state.thief.x = 400; state.thief.y = 150;
    state.alarm.value = 99.5;
    // Same patrol turn as the sighting test: three seconds for the guard to
    // come around and the alarm to cross 100.
    for (let i = 0; i < 180; i += 1) stepWorld(state, IDLE_INPUT, NO_ACTIONS);
    check('lockdown-at-100', state.alarm.lockdown && state.alarm.lockdownTimer > 0, `lockdown=${state.alarm.lockdown} timer=${state.alarm.lockdownTimer.toFixed(1)}s`);
  }

  // 7. A sure guard standing on the thief catches them.
  {
    const state = createWorld(createRandom(seed));
    state.screen = SCREEN_PLAY;
    const marco = state.guards[0];
    marco.x = state.thief.x; marco.y = state.thief.y;
    marco.alertness = 1;
    for (let i = 0; i < 40; i += 1) stepWorld(state, IDLE_INPUT, NO_ACTIONS);
    check('catch-on-contact', state.screen === SCREEN_CAUGHT, `screen=${state.screen} caughtBy=${state.caughtBy}`);
  }

  return lines;
}

const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);

if (selftest) {
  const lines = runSelfTest();
  const passed = lines.filter((line) => line.startsWith('PASS')).length;
  const summary = `SELFTEST ${passed}/${lines.length} ${passed === lines.length ? 'PASS' : 'FAIL'}`;
  document.title = summary;
  if (shotInfo) shotInfo.textContent = [summary, ...lines].join('\n');
  const outcome = simulateHeist(seed);
  renderer.draw(outcome.state, outcome.state.screen, best);
} else if (shot) {
  // One frozen, deterministic frame for the screenshot.
  const staged = stageShot(shot, seed);
  renderer.draw(staged.state, staged.state.screen, best);
  if (shotInfo) shotInfo.textContent = staged.info;
  document.title = `The Midnight Vault — ${shot}`;
} else {
  // The real game: a fixed 60 Hz step, decoupled from the frame rate.
  const state = createWorld(createRandom(seed));
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    const actions = input.consumeActions();
    if (actions.confirm && state.screen === SCREEN_TITLE) {
      audio.unlock();
      resetWorld(state);
      announce('The gallery is dark. Steal the Star Sapphire, then reach the EXIT.');
    }
    if (actions.confirm && (state.screen === SCREEN_WON || state.screen === SCREEN_CAUGHT)) {
      resetWorld(state);
    }
    if (actions.pause) {
      if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSED;
      else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
    }
    if (actions.restart && (state.screen === SCREEN_WON || state.screen === SCREEN_CAUGHT || state.screen === SCREEN_PAUSED)) {
      resetWorld(state);
    }
    if (actions.mute) audio.toggleMute();
    if (state.screen === SCREEN_PLAY) {
      const held = input.read();
      if (held.left || held.right || held.up || held.down) input.clearMoveTarget();
      accumulator += elapsed;
      // Tools are edge-triggered: they ride on the first step of the frame.
      let firstStep = true;
      while (accumulator >= STEP) {
        const toolActions = firstStep
          ? { smoke: actions.smoke, emp: actions.emp }
          : { smoke: false, emp: false };
        const events = stepWorld(state, held, toolActions);
        playEvents(events, state, audio);
        accumulator -= STEP;
        firstStep = false;
      }
      if (state.alarm.value > 80) audio.startAlarm();
      else audio.stopAlarm();
    }
    renderer.draw(state, state.screen, best);
  }
  renderer.draw(state, state.screen, best);
  requestAnimationFrame(frame);
}
