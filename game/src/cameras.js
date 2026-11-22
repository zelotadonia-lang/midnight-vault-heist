// Wall cameras: fixed mounts that sweep their cones back and forth.
// A camera that spots the thief feeds the alarm fast. An EMP pulse shuts
// a camera down for a few seconds; while it is down it sees nothing.

import { CAMERA } from './config.js';
import { SIDEVAULT_CAMERA } from './sidevault.js';
import { canSee, dist } from './vision.js';

export function buildCameras() {
  const cams = [
    {
      name: 'North camera',
      x: 640,
      y: 52,
      baseAngle: Math.PI / 2,
      sweep: 1.05,
      period: 6,
      phase: 0,
      range: 225,
      disabledUntil: 0,
      alert: 0,
      angle: Math.PI / 2,
      seen: false,
    },
    {
      name: 'East camera',
      x: 1258,
      y: 380,
      baseAngle: Math.PI,
      sweep: 0.95,
      period: 7,
      phase: 1.3,
      range: CAMERA.range,
      disabledUntil: 0,
      alert: 0,
      angle: Math.PI,
      seen: false,
    },
  ];
  // A third eye inside the side vault, watching the Crown Jewels.
  cams.push({ ...SIDEVAULT_CAMERA });
  return cams;
}

export function cameraIsDown(camera, time) {
  return time < camera.disabledUntil;
}

export function cameraSees(world, camera) {
  if (cameraIsDown(camera, world.time)) return false;
  // Inside the vent duct Wren is out of every camera's sight.
  if (world.thief.inVent) return false;
  return canSee(
    world.level.walls,
    world.smokes,
    camera.x,
    camera.y,
    camera.angle,
    camera.range,
    CAMERA.halfAngle,
    world.thief.x,
    world.thief.y,
  );
}

export function updateCamera(world, camera, dt) {
  camera.angle =
    camera.baseAngle +
    camera.sweep * Math.sin((2 * Math.PI * world.time) / camera.period + camera.phase);
  const seen = cameraSees(world, camera);
  if (seen) camera.alert = Math.min(1, camera.alert + CAMERA.spotRate * dt);
  else camera.alert = Math.max(0, camera.alert - CAMERA.calmRate * dt);
  camera.seen = seen;
}

// The nearest live camera to a point, and how far away it is.
export function nearestCamera(cameras, time, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const c of cameras) {
    if (cameraIsDown(c, time)) continue;
    const d = dist(c.x, c.y, x, y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return { camera: best, distance: bestD };
}
