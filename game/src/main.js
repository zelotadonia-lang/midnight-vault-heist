// Boot and the main loop: a fixed 60 Hz step, screens, sound cues, and
// the two test modes the maker uses to verify the game in a browser:
//   ?selftest=1&seed=1  runs thirteen checks and reports PASS/FAIL in the
//                       page title and window.__selftest
//   ?shot=<name>&seed=1 stages one posed frame for a screenshot
// The self-test runs the autopilot at full speed (no rendering per step),
// so a headless browser can play the whole heist in under a second.

import { VIEW } from './config.js';
import { createWorld, stepWorld, blankInput, scoreNow } from './world.js';
import { buildAlarm, endLockdown, updateAlarm } from './alarm.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { runAutopilot, stageShot } from './shots.js';
import { gradeRun } from './grade.js';
import * as audio from './audio.js';

const BEST_KEY = 'midnight-vault-best';
const STEP = 1 / 60;

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Private mode or no storage: the score still shows this session.
  }
}

function params() {
  return new URLSearchParams(window.location.search);
}

// Drain the world's event queue into sounds.
function handleEvents(world) {
  for (const event of world.events) {
    if (event === 'loot') audio.playPickup();
    else if (event === 'sapphire') audio.playSapphire();
    else if (event === 'smoke') audio.playSmoke();
    else if (event === 'emp') audio.playEmp();
    else if (event === 'decoy') audio.playDecoy();
    else if (event === 'vent') audio.playVent();
    else if (event === 'crown') audio.playCrown();
    else if (event === 'lockdown') audio.playLockdown();
    else if (event === 'caught') audio.playCaught();
    else if (event === 'won') audio.playWin();
  }
  world.events.length = 0;
}

// ------------------------------------------------------------ self-test

function check(results, name, ok, detail = '') {
  results.push({ name, ok, detail });
  // eslint-disable-next-line no-console
  console.log(`SELFTEST ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function freshPlay(seed) {
  const world = createWorld(seed);
  world.screen = 'play';
  return world;
}

function stepFor(world, seconds, input = blankInput()) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) stepWorld(world, input, STEP);
}

export function runSelfTest(seed = 1) {
  const results = [];
  const dt = STEP;

  // 1. Standing still in the open, the alarm stays quiet.
  {
    const world = freshPlay(seed);
    stepFor(world, 5);
    check(results, 'idle-keeps-alarm-zero', world.alarm.level === 0, `alarm ${world.alarm.level}`);
  }

  // 2. A guard watching the thief raises alertness and the alarm.
  {
    const world = freshPlay(seed);
    world.thief.x = 600;
    world.thief.y = 120;
    stepFor(world, 3);
    const marco = world.guards[0];
    check(
      results,
      'guard-spots-thief',
      marco.alert > 0.7 && world.alarm.level > 10,
      `alert ${marco.alert.toFixed(2)} alarm ${world.alarm.level.toFixed(1)}`,
    );
  }

  // 3. Smoke blinds the guard and spends a charge.
  {
    const world = freshPlay(seed);
    world.thief.x = 600;
    world.thief.y = 120;
    const input = blankInput();
    input.useSmoke = true;
    stepWorld(world, input, dt);
    stepFor(world, 2);
    const marco = world.guards[0];
    check(
      results,
      'smoke-blinds-guard',
      marco.alert < 0.05 && world.thief.smokeCharges === 2,
      `alert ${marco.alert.toFixed(2)} charges ${world.thief.smokeCharges}`,
    );
  }

  // 4. EMP shuts the nearby camera down and the alarm stays down.
  {
    const world = freshPlay(seed);
    world.thief.x = 1150;
    world.thief.y = 380;
    const input = blankInput();
    input.useEmp = true;
    stepWorld(world, input, dt);
    stepFor(world, 2);
    const east = world.cameras[1];
    check(
      results,
      'emp-disables-camera',
      world.time < east.disabledUntil && world.thief.empCharges === 1 && world.alarm.level === 0,
      `disabled ${world.time < east.disabledUntil} charges ${world.thief.empCharges} alarm ${world.alarm.level}`,
    );
  }

  // 5. Alarm 100 locks the museum down for twelve seconds, then eases.
  // The timer is checked on the alarm module itself: in a live world a
  // lockdown sends every guard hunting, so a thief standing still gets
  // caught long before the twelve seconds are up, and that is the point.
  {
    const fake = {
      time: 0,
      alarm: buildAlarm(),
      lockdownUntil: 0,
      thief: { sneaking: false },
      events: [],
    };
    fake.alarm.level = 100;
    updateAlarm(fake, { guards: 0, cameras: 0 }, dt);
    const locked = fake.time < fake.lockdownUntil;
    for (let i = 0; i < Math.round(13 / dt); i++) {
      fake.time += dt;
      endLockdown(fake);
      updateAlarm(fake, { guards: 0, cameras: 0 }, dt);
    }
    check(
      results,
      'lockdown-twelve-seconds',
      locked && fake.lockdownUntil === 0 && fake.alarm.level < 100,
      `locked ${locked} alarm ${fake.alarm.level.toFixed(1)}`,
    );
  }

  // 6. A guard standing on the thief ends the run.
  {
    const world = freshPlay(seed);
    world.guards[0].pos.x = world.thief.x;
    world.guards[0].pos.y = world.thief.y;
    stepWorld(world, blankInput(), dt);
    check(
      results,
      'guard-catches-thief',
      world.screen === 'caught' && world.caughtBy === 'Marco',
      `screen ${world.screen} by ${world.caughtBy}`,
    );
  }

  // 7. The autopilot plays the whole heist and wins it.
  {
    const run = runAutopilot(seed, 150);
    const world = run.world;
    const finalScore = world.screen === 'won' ? scoreNow(world) : 0;
    check(
      results,
      'autopilot-wins-heist',
      run.won && world.lootTaken === 4 && world.sapphireTaken && finalScore >= 2833,
      `screen ${run.screen} loot ${world.lootTaken}/4 score ${finalScore} in ${run.seconds.toFixed(1)}s peak alarm ${Math.round(world.alarm.peak)}`,
    );
  }

  // 8. The decoy pulls the nearest guard toward it and spends a charge.
  // Marco patrols due east along y=120, so any move south toward the
  // decoy proves the lure, not the patrol.
  {
    const world = freshPlay(seed);
    world.thief.x = 600;
    world.thief.y = 200;
    const marco = world.guards[0];
    const input = blankInput();
    input.useDecoy = true;
    stepWorld(world, input, dt);
    stepFor(world, 2);
    check(
      results,
      'decoy-lures-guard',
      world.decoys.length === 1 &&
        world.decoys[0].lured === 'Marco' &&
        world.thief.decoyCharges === 0 &&
        marco.pos.y > 150,
      `decoys ${world.decoys.length} lured ${world.decoys[0] && world.decoys[0].lured} charges ${world.thief.decoyCharges} marco y ${marco.pos.y.toFixed(0)}`,
    );
  }

  // 9. A clean, complete, unseen run grades GHOST with three stars;
  // a run that ends caught grades BUSTED with none.
  {
    const ghost = {
      screen: 'won',
      lootTaken: 4,
      sapphireTaken: true,
      alarm: { peak: 8 },
      wonAt: 25,
      time: 25,
      stats: { spotted: 0, toolsUsed: 1, lockdowns: 0, distance: 3000 },
    };
    const busted = {
      screen: 'caught',
      lootTaken: 1,
      sapphireTaken: false,
      alarm: { peak: 72 },
      wonAt: 0,
      time: 31,
      stats: { spotted: 3, toolsUsed: 0, lockdowns: 0, distance: 1500 },
    };
    const g = gradeRun(ghost);
    const b = gradeRun(busted);
    check(
      results,
      'grade-ranks-runs',
      g.title === 'GHOST' && g.stars === 3 && b.title === 'BUSTED' && b.stars === 0,
      `ghost ${g.title}/${g.stars} busted ${b.title}/${b.stars}`,
    );
  }

  // 10. The vent crawl carries Wren unseen from the central hall to
  // the vault room, then rattles the grate on the way out: the alarm
  // peak jumps even though nobody saw her inside the duct.
  {
    const world = freshPlay(seed);
    world.thief.x = 840;
    world.thief.y = 90;
    const input = blankInput();
    input.useVent = true;
    stepWorld(world, input, dt);
    stepFor(world, 1);
    const hidden = world.thief.inVent;
    stepFor(world, 4);
    const dx = world.thief.x - 1000;
    const dy = world.thief.y - 90;
    check(
      results,
      'vent-crawl-crosses',
      hidden &&
        !world.thief.inVent &&
        Math.sqrt(dx * dx + dy * dy) < 20 &&
        world.stats.ventsUsed === 1 &&
        world.alarm.peak >= 10,
      `hidden ${hidden} at (${world.thief.x.toFixed(0)},${world.thief.y.toFixed(0)}) vents ${world.stats.ventsUsed} peak alarm ${Math.round(world.alarm.peak)}`,
    );
  }

  // 11. The Crown Jewels pay 500, and the vault camera inside the side
  // vault watches the thief who takes them.
  {
    const world = freshPlay(seed);
    world.thief.x = 1060;
    world.thief.y = 560;
    stepFor(world, 2);
    const crown = world.level.loot.find((l) => l.id === 'crown');
    const vaultCam = world.cameras[2];
    check(
      results,
      'crown-pays-and-camera-watches',
      crown.taken && world.score >= 500 && (vaultCam.alert > 0.2 || world.alarm.level > 5),
      `taken ${crown.taken} score ${world.score} cam alert ${vaultCam.alert.toFixed(2)} alarm ${world.alarm.level.toFixed(1)}`,
    );
  }

  // 12. A guard that saw Wren and lost her investigates the last seen
  // spot instead of going back to its round; at high alarm the
  // nearest guard breaks off to check the vault door.
  {
    const world = freshPlay(seed);
    world.thief.x = 600;
    world.thief.y = 120;
    stepFor(world, 1.5);
    world.thief.x = 200;
    world.thief.y = 600;
    stepFor(world, 1);
    const marco = world.guards[0];
    const loud = freshPlay(seed);
    loud.alarm.level = 70;
    stepFor(loud, 1);
    const dario = loud.guards[2];
    check(
      results,
      'guard-investigates-and-checks-vault',
      marco.state === 'investigate' &&
        marco.lastSeen !== null &&
        dario.state === 'vaultcheck',
      `marco ${marco.state} dario ${dario.state}`,
    );
  }

  // 13. Par time pays in tiers: a fast clean finish earns the fast
  // bonus and the ghost-quiet bonus; a slow loud one earns neither.
  {
    const fast = {
      score: 1750,
      wonAt: 25,
      time: 25,
      alarm: { peak: 8 },
      level: { loot: [{}, {}, {}, {}, {}] },
    };
    const slow = {
      score: 1750,
      wonAt: 60,
      time: 60,
      alarm: { peak: 60 },
      level: { loot: [{}, {}, {}, {}, {}] },
    };
    check(
      results,
      'par-bonus-tiers',
      scoreNow(fast) === 3150 && scoreNow(slow) === 1930,
      `fast ${scoreNow(fast)} slow ${scoreNow(slow)}`,
    );
  }

  const passed = results.filter((r) => r.ok).length;
  const summary = {
    passed,
    total: results.length,
    ok: passed === results.length,
    results,
  };
  window.__selftest = summary;
  document.title = `SELFTEST ${summary.ok ? 'PASS' : 'FAIL'} ${passed}/${results.length}`;
  // eslint-disable-next-line no-console
  console.log(`SELFTEST ${summary.ok ? 'PASS' : 'FAIL'} ${passed}/${results.length}`);
  return summary;
}

// ------------------------------------------------------------ boot

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const query = params();
  const seed = Number(query.get('seed') || '1') || 1;

  // Screenshot staging: pose the world, draw one frame, stop. The page
  // chrome hides so the capture is the game frame alone, 1280 by 720.
  const shot = query.get('shot');
  if (shot) {
    document.querySelectorAll('h1, p').forEach((el) => {
      el.style.display = 'none';
    });
    canvas.style.width = '1280px';
    canvas.style.height = '720px';
    canvas.style.border = 'none';
    canvas.style.borderRadius = '0';
    const world = stageShot(shot, seed);
    render(ctx, world);
    document.title = `SHOT READY ${shot}`;
    // eslint-disable-next-line no-console
    console.log(`SHOT READY ${shot}`);
    return;
  }

  // Self-test: run the checks, report, stop.
  if (query.get('selftest') === '1') {
    runSelfTest(seed);
    return;
  }

  const world = createWorld(seed);
  world.best = readBest();
  const input = createInput(canvas, (code) => {
    if (code === 'KeyM') audio.setMuted(!audio.isMuted());
    if (code === 'KeyP' || code === 'Escape') {
      if (world.screen === 'play') world.screen = 'paused';
      else if (world.screen === 'paused') world.screen = 'play';
    }
    if (code === 'Enter' || code === 'click') {
      if (world.screen === 'title') {
        world.screen = 'play';
        audio.startRoomTone();
      } else if (world.screen === 'won' || world.screen === 'caught') {
        const fresh = createWorld(seed);
        fresh.best = readBest();
        Object.assign(world, fresh);
        world.screen = 'play';
      } else if (world.screen === 'paused') {
        world.screen = 'play';
      }
    }
  });

  let last = performance.now();
  let acc = 0;
  let alarmBeepAt = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (world.screen === 'play') {
      acc += elapsed;
      while (acc >= STEP) {
        stepWorld(world, input, STEP);
        acc -= STEP;
      }
      handleEvents(world);
      if (world.screen === 'won') {
        const finalScore = scoreNow(world);
        if (finalScore > world.best) {
          world.best = finalScore;
          saveBest(finalScore);
        }
      }
      if (world.alarm.level >= 60 && now - alarmBeepAt > 700) {
        alarmBeepAt = now;
        audio.playAlarmTick();
      }
    }
    render(ctx, world);
  }
  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Keep the pieces importable for the Node harness.
export { createWorld, stepWorld, runAutopilot };
export { VIEW };
