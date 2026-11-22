// The alarm meter: 0 to 100, fed by every watcher that has eyes on the
// thief, draining slowly when nobody does. At 100 the museum locks down
// for twelve seconds and every guard hunts. Sneaking halves the rate at
// which the meter climbs.

import { ALARM } from './config.js';

export function buildAlarm() {
  return {
    level: 0,
    peak: 0,
    lockdownUntil: 0,
  };
}

// `seenBy` counts watchers currently seeing the thief, split by kind, so
// the meter climbs faster under a camera than under one guard.
export function updateAlarm(world, seenBy, dt) {
  const alarm = world.alarm;
  const lockdown = world.time < world.lockdownUntil;
  if (lockdown) {
    alarm.level = ALARM.max;
    return;
  }
  // The meter may already sit at the top (a test or a hard shove sets it
  // there): hitting 100 is the lockdown, not a number to decay from.
  if (alarm.level >= ALARM.max) {
    world.lockdownUntil = world.time + ALARM.lockdownSeconds;
    alarm.level = ALARM.max;
    world.events.push('lockdown');
    return;
  }
  const thief = world.thief;
  let rise = 0;
  if (seenBy.guards > 0) {
    rise += seenBy.guards * (thief.sneaking ? ALARM.guardRateSneak : ALARM.guardRate);
  }
  if (seenBy.cameras > 0) {
    rise += seenBy.cameras * ALARM.cameraRate;
  }
  if (rise > 0) alarm.level = Math.min(ALARM.max, alarm.level + rise * dt);
  else alarm.level = Math.max(0, alarm.level - ALARM.decayRate * dt);
  if (alarm.level > alarm.peak) alarm.peak = alarm.level;

  if (alarm.level >= ALARM.max) {
    world.lockdownUntil = world.time + ALARM.lockdownSeconds;
    alarm.level = ALARM.max;
    world.events.push('lockdown');
  }
}

// Called once the lockdown clock runs out: the meter falls back, it does
// not reset to zero, so a loud crew stays loud.
export function endLockdown(world) {
  if (world.lockdownUntil > 0 && world.time >= world.lockdownUntil) {
    world.lockdownUntil = 0;
    world.alarm.level = ALARM.lockdownFallback;
    world.events.push('lockdown-over');
  }
}
