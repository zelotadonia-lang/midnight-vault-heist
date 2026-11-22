// Cameras: fixed to the walls, sweeping their cones back and forth. A camera
// never grabs the thief itself; it feeds the alarm. An EMP pulse takes the
// cameras near the thief offline for a while, and the room says so.
import { CAMERA, TOOLS } from './config.js';
import { canSee } from './vision.js';

export function createCameras(definitions) {
  return definitions.map((def) => ({
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    phase: def.phase,
    facing: def.baseAngle,
    alertness: 0,
    disabledTimer: 0,
  }));
}

export function updateCameras(cameras, state, dt) {
  const { thief, solids, smokes } = state;
  for (let i = 0; i < cameras.length; i += 1) {
    const camera = cameras[i];
    if (camera.disabledTimer > 0) {
      camera.disabledTimer -= dt;
      camera.alertness = Math.max(0, camera.alertness - 0.4 * dt);
      continue;
    }
    camera.phase += dt;
    const sweep = Math.sin((camera.phase * 2 * Math.PI) / CAMERA.sweepSeconds);
    camera.facing = camera.baseAngle + sweep * CAMERA.sweepHalfAngle;
    const sees = canSee(camera, thief, CAMERA.visionRange, CAMERA.visionHalfAngle, solids, smokes);
    if (sees) {
      const dist = Math.hypot(thief.x - camera.x, thief.y - camera.y);
      const closeness = 1 - dist / CAMERA.visionRange;
      const sneak = thief.sneaking ? 0.45 : 1;
      camera.alertness = Math.min(1, camera.alertness + (0.5 + closeness * 1.3) * sneak * dt);
    } else {
      camera.alertness = Math.max(0, camera.alertness - 0.25 * dt);
    }
  }
}

/** Switch off every camera within EMP range of the thief. */
export function empBurst(cameras, thief) {
  let hit = 0;
  for (let i = 0; i < cameras.length; i += 1) {
    if (Math.hypot(cameras[i].x - thief.x, cameras[i].y - thief.y) <= TOOLS.empRadius) {
      cameras[i].disabledTimer = CAMERA.disabledSeconds;
      hit += 1;
    }
  }
  return hit;
}
