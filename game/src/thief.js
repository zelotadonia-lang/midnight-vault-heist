// The thief: Wren. Walk with WASD or arrows, hold Shift to sneak, click to
// walk somewhere, grab loot by touching it, spend smoke (1) and EMP (2). The
// tools cost a charge, never money: the choice is when to spend them.
import { THIEF, TOOLS } from './config.js';
import { resolveCollision } from './vision.js';

export function createThief(start) {
  return {
    x: start.x,
    y: start.y,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    moveTarget: null,
    smoke: TOOLS.smokeCount,
    emp: TOOLS.empCount,
    hasVault: false,
    artifacts: 0,
  };
}

export function updateThief(thief, input, dt, solids) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;
  if (dx === 0 && dy === 0 && thief.moveTarget) {
    const tx = thief.moveTarget.x - thief.x;
    const ty = thief.moveTarget.y - thief.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 8) {
      thief.moveTarget = null;
    } else {
      dx = tx / dist;
      dy = ty / dist;
    }
  }
  const len = Math.hypot(dx, dy);
  thief.moving = len > 0;
  if (len > 0) {
    const speed = input.sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
    thief.x += (dx / len) * speed * dt;
    thief.y += (dy / len) * speed * dt;
    thief.facing = Math.atan2(dy, dx);
    resolveCollision(thief, THIEF.radius, solids);
  }
  thief.sneaking = Boolean(input.sneak) && thief.moving;
  return thief;
}

/** Drop a smoke cloud at the thief's feet, if any charges are left. */
export function useSmoke(thief, smokes) {
  if (thief.smoke <= 0) return null;
  thief.smoke -= 1;
  const cloud = { x: thief.x, y: thief.y, radius: TOOLS.smokeRadius, timer: TOOLS.smokeSeconds };
  smokes.push(cloud);
  return cloud;
}
