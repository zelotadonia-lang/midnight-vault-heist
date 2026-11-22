// The Holo-Decoy: Wren's third tool. Press 3 and a shimmering double
// of the thief stays where she stands for a few seconds. The nearest
// guard who is not already hunting walks over to look at it, which
// opens a window to slip past. One charge a run, so it is spent on the
// moment that matters, not on every corridor.

import { TOOLS } from './config.js';
import { dist } from './vision.js';

export function deployDecoy(world) {
  const thief = world.thief;
  if (thief.decoyCharges <= 0) return false;
  thief.decoyCharges -= 1;
  let lured = null;
  let bestD = TOOLS.decoyLureRange;
  for (const guard of world.guards) {
    if (guard.hunting || guard.alert >= 1) continue;
    const d = dist(guard.pos.x, guard.pos.y, thief.x, thief.y);
    if (d < bestD) {
      bestD = d;
      lured = guard.name;
    }
  }
  world.decoys.push({
    x: thief.x,
    y: thief.y,
    until: world.time + TOOLS.decoySeconds,
    lured,
  });
  world.events.push('decoy');
  return true;
}

// Drop decoys whose time is up. A decoy that expires leaves its guard
// standing where it walked to, and the guard goes back to its patrol.
export function updateDecoys(world) {
  world.decoys = world.decoys.filter((d) => world.time < d.until);
}

// The live decoy that has claimed this guard, if any.
export function decoyForGuard(world, guard) {
  for (const d of world.decoys) {
    if (d.lured === guard.name) return d;
  }
  return null;
}

export function drawDecoys(ctx, world) {
  const TAU = Math.PI * 2;
  for (const d of world.decoys) {
    const pulse = 0.5 + 0.5 * Math.sin(world.time * 6);
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.3 * pulse;
    ctx.strokeStyle = '#59d6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 13, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = 'rgba(89,214,255,0.25)';
    ctx.beginPath();
    ctx.arc(d.x, d.y, 13, 0, TAU);
    ctx.fill();
    // A flickering double: two short horizontal scan lines.
    ctx.fillStyle = '#bdefff';
    ctx.fillRect(d.x - 8, d.y - 4 + pulse * 4, 16, 2);
    ctx.fillRect(d.x - 6, d.y + 4 - pulse * 3, 12, 2);
    ctx.fillStyle = '#59d6ff';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DECOY', d.x, d.y - 22);
    ctx.restore();
  }
}
