// Wren, the thief: movement, sneaking, click-to-walk and the two tools.
// Movement is keyboard-first; a mouse click sets a destination the thief
// walks to until a key is pressed or the spot is reached.

import { THIEF, TOOLS } from './config.js';
import { slideMove } from './level.js';
import { dist } from './vision.js';
import { cameraIsDown } from './cameras.js';

export function buildThief() {
  return {
    x: THIEF.startX,
    y: THIEF.startY,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    clickTarget: null,
    smokeCharges: TOOLS.smokeCharges,
    empCharges: TOOLS.empCharges,
  };
}

// Keyboard vector from the held keys: -1, 0 or 1 on each axis.
export function keysVector(keys) {
  let x = 0;
  let y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    const len = Math.sqrt(2);
    x /= len;
    y /= len;
  }
  return { x, y };
}

export function updateThief(world, input, dt) {
  const thief = world.thief;
  const keys = input.keys || new Set();
  thief.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');

  // A fresh click sets a destination; any movement key cancels it.
  if (input.click) {
    thief.clickTarget = { x: input.click.x, y: input.click.y };
    input.click = null;
  }
  const kv = keysVector(keys);
  let mx = 0;
  let my = 0;
  if (kv.x !== 0 || kv.y !== 0) {
    thief.clickTarget = null;
    mx = kv.x;
    my = kv.y;
  } else if (thief.clickTarget) {
    const d = dist(thief.x, thief.y, thief.clickTarget.x, thief.clickTarget.y);
    if (d < 8) {
      thief.clickTarget = null;
    } else {
      mx = (thief.clickTarget.x - thief.x) / d;
      my = (thief.clickTarget.y - thief.y) / d;
    }
  }
  thief.moving = mx !== 0 || my !== 0;
  if (thief.moving) {
    thief.facing = Math.atan2(my, mx);
    const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
    const moved = slideMove(
      world.level.walls,
      thief.x,
      thief.y,
      THIEF.radius,
      mx * speed * dt,
      my * speed * dt,
    );
    thief.x = moved.x;
    thief.y = moved.y;
  }

  // Smoke pellet: a cloud at the thief's feet that blocks every eye.
  if (input.useSmoke && thief.smokeCharges > 0) {
    thief.smokeCharges -= 1;
    world.smokes.push({
      x: thief.x,
      y: thief.y,
      r: TOOLS.smokeRadius,
      until: world.time + TOOLS.smokeSeconds,
    });
    world.events.push('smoke');
  }
  input.useSmoke = false;

  // EMP pulse: every live camera nearby goes dark for a while.
  if (input.useEmp && thief.empCharges > 0) {
    thief.empCharges -= 1;
    let hit = 0;
    for (const cam of world.cameras) {
      if (cameraIsDown(cam, world.time)) continue;
      if (dist(thief.x, thief.y, cam.x, cam.y) <= TOOLS.empRadius) {
        cam.disabledUntil = world.time + TOOLS.empSeconds;
        cam.alert = 0;
        hit += 1;
      }
    }
    if (hit > 0) world.events.push('emp');
  }
  input.useEmp = false;
}
