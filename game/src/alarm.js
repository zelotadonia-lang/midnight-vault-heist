// The alarm meter: every watcher that can see the thief feeds it, it drains
// when nobody can, and at 100 the gallery locks down — every guard hunts at
// once until the lockdown burns out and the meter drops back.
import { ALARM } from './config.js';

export function createAlarm() {
  return { value: 0, lockdown: false, lockdownTimer: 0, peak: 0 };
}

export function updateAlarm(alarm, guards, cameras, dt) {
  let feed = 0;
  for (let i = 0; i < guards.length; i += 1) feed = Math.max(feed, guards[i].alertness);
  for (let i = 0; i < cameras.length; i += 1) {
    feed = Math.max(feed, cameras[i].alertness * ALARM.cameraWeight);
  }
  if (alarm.lockdown) {
    alarm.lockdownTimer -= dt;
    alarm.value = Math.max(ALARM.lockdownReset, alarm.value - 2 * dt);
    if (alarm.lockdownTimer <= 0) {
      alarm.lockdown = false;
      alarm.value = ALARM.lockdownReset;
    }
    return alarm;
  }
  if (feed > 0.05) alarm.value = Math.min(100, alarm.value + feed * ALARM.risePerSecond * dt);
  else alarm.value = Math.max(0, alarm.value - ALARM.decayPerSecond * dt);
  alarm.peak = Math.max(alarm.peak, alarm.value);
  if (alarm.value >= ALARM.lockdownAt) {
    alarm.lockdown = true;
    alarm.lockdownTimer = ALARM.lockdownSeconds;
  }
  return alarm;
}
