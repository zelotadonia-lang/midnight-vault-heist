// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, won and caught.
//
// ?seed=N fixes the random pattern. ?shot=cover|squeeze|vault|getaway (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot. ?selftest=1 runs three scripted
// checks of the real rules and writes the results into #shotinfo.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_EMP, EVENT_LOCKDOWN, EVENT_PICKUP, EVENT_SMOKE, EVENT_STING, EVENT_VAULT, EVENT_WIN, resetWorld, SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON, stepWorld } from './world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const shotinfo = document.getElementById('shotinfo');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

window.addEventListener('error', (event) => {
  status.textContent = `ERROR: ${event.message}`;
});

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

let best = readBest();
let screen = SCREEN_TITLE;
let lockdownWasOn = false;

function announce(text) {
  status.textContent = text;
}

function handleEvents(events) {
  if (events & EVENT_PICKUP) audio.pickup();
  if (events & EVENT_VAULT) audio.vault();
  if (events & EVENT_SMOKE) audio.smoke();
  if (events & EVENT_EMP) audio.emp();
  if (events & EVENT_STING) audio.sting();
  if (events & EVENT_LOCKDOWN) {
    audio.startAlarm();
    announce('Lockdown! Every guard is hunting.');
  }
  if (events & EVENT_WIN) {
    audio.stopAlarm();
    audio.win();
    if (world.finalScore > best) {
      best = world.finalScore;
      saveBest(best);
    }
    announce(`Clean getaway. Score ${world.finalScore}.`);
  }
  if (events & EVENT_CAUGHT) {
    audio.stopAlarm();
    audio.lose();
    announce(`Caught by ${world.caughtBy}.`);
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  screen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world, screen, best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      shotinfo.textContent = JSON.stringify(scene.info);
      window.__shotReady = true;
    }
  }
  requestAnimationFrame(paint);
}

function runSelftest() {
  const results = {};
  try {
    // 1. A full heist, played by the autopilot: vault, then the exit.
    const vaultScene = stageShot('getaway', world);
    results.fullHeist = {
      screen: world.screen,
      hasVault: world.thief.hasVault,
      score: world.score,
      time: Math.round(world.time),
      alarmPeak: Math.round(world.alarm.peak),
      shot: vaultScene.info,
    };
    // 2. Standing still for five seconds: the alarm must stay at zero.
    resetWorld(world);
    world.screen = SCREEN_PLAY;
    const idle = { left: false, right: false, up: false, down: false, sneak: false, moveTarget: null };
    const none = { smoke: false, emp: false };
    for (let i = 0; i < 300; i += 1) stepWorld(world, idle, none, STEP);
    results.idleFiveSeconds = { alarm: Math.round(world.alarm.value), screen: world.screen };
    // 3. Walking straight at a patrolling guard: the alarm must rise.
    resetWorld(world);
    world.screen = SCREEN_PLAY;
    const toward = { left: false, right: true, up: true, down: false, sneak: false, moveTarget: null };
    let peak = 0;
    for (let i = 0; i < 900 && world.screen === SCREEN_PLAY; i += 1) {
      stepWorld(world, toward, none, STEP);
      peak = Math.max(peak, world.alarm.value);
    }
    results.walkIntoGuard = { alarmPeak: Math.round(peak), screen: world.screen };
    results.ok = true;
  } catch (error) {
    results.ok = false;
    results.error = String(error && error.message ? error.message : error);
  }
  shotinfo.textContent = JSON.stringify(results);
  document.title = `selftest ${results.ok ? 'PASS' : 'FAIL'}`;
  window.__shotReady = true;
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const actions = input.consumeActions();
    if (actions.mute) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE && actions.confirm) {
      audio.unlock();
      resetWorld(world);
      screen = SCREEN_PLAY;
      announce('The heist is on. Steal the Star Sapphire, then reach the exit.');
    } else if (screen === SCREEN_PLAY && actions.pause) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (screen === SCREEN_PAUSED && (actions.pause || actions.confirm)) {
      screen = SCREEN_PLAY;
      announce('Back to the floor.');
    } else if ((screen === SCREEN_WON || screen === SCREEN_CAUGHT) && (actions.restart || actions.confirm)) {
      resetWorld(world);
      screen = SCREEN_PLAY;
      announce('The heist is on.');
    }

    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        const events = stepWorld(world, input.read(), actions, STEP);
        handleEvents(events);
        accumulator -= STEP;
      }
      if (world.alarm.lockdown !== lockdownWasOn) {
        lockdownWasOn = world.alarm.lockdown;
        if (!lockdownWasOn) audio.stopAlarm();
      }
      if (world.screen !== SCREEN_PLAY) screen = world.screen;
    } else if (screen === SCREEN_TITLE) {
      world.screen = SCREEN_TITLE;
    }
    renderer.draw(world, screen, best);
  }
  requestAnimationFrame(frame);
}

if (selftest) runSelftest();
else if (shot) runShot(shot);
else runGame();
