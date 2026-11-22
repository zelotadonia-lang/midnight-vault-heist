// The vent crawl: a second route into the vault.
//
// A pair of grates joins the central hall to the vault room through
// the ceiling duct. Press E beside a grate and Wren crawls through:
// no guard or camera can see her inside the duct, and the crawl skips
// the whole east wing and Dario's round. The price is noise. Climbing
// out rattles the grate, the alarm jumps, and any guard close enough
// hears it and comes to look. A fast route, not a free one.

import { VENT } from './config.js';
import { dist } from './vision.js';

// The duct runs along the top of the room: in at the central-hall
// grate, across above the divider wall, out at the vault-room grate.
export function buildVents() {
  return {
    grates: [
      { id: 'A', x: 840, y: 90 },
      { id: 'B', x: 1000, y: 90 },
    ],
    path: [
      { x: 840, y: 90 },
      { x: 840, y: 55 },
      { x: 1000, y: 55 },
      { x: 1000, y: 90 },
    ],
  };
}

// The grate within reach of (x, y), if any.
export function nearestGrate(vents, x, y) {
  for (const g of vents.grates) {
    if (dist(x, y, g.x, g.y) <= VENT.grateRadius) return g;
  }
  return null;
}

// Step into the duct from a grate. The crawl always runs the whole
// duct to the other grate; there is no turning back halfway.
export function enterVent(world, grate) {
  const thief = world.thief;
  if (thief.vent) return false;
  const other = world.vents.grates.find((g) => g.id !== grate.id);
  const forward = grate.id === 'A';
  const points = forward ? [...world.vents.path] : [...world.vents.path].reverse();
  thief.x = grate.x;
  thief.y = grate.y;
  thief.clickTarget = null;
  thief.vent = { points, i: 1, from: grate.id, to: other.id };
  thief.inVent = true;
  thief.moving = true;
  return true;
}

// Climb out at the far grate. The grate rattles: the alarm jumps and
// every guard close enough hears it, remembers the spot, and comes
// to look. Returns true when the crawl finished this step.
function exitVent(world) {
  const thief = world.thief;
  const grate = world.vents.grates.find((g) => g.id === thief.vent.to);
  thief.vent = null;
  thief.inVent = false;
  thief.moving = false;
  world.stats.ventsUsed = (world.stats.ventsUsed || 0) + 1;
  world.alarm.level = Math.min(100, world.alarm.level + VENT.noiseAlarm);
  if (world.alarm.level > world.alarm.peak) world.alarm.peak = world.alarm.level;
  for (const guard of world.guards) {
    if (dist(guard.pos.x, guard.pos.y, grate.x, grate.y) <= VENT.noiseRadius) {
      guard.alert = Math.min(1, guard.alert + VENT.heardAlert);
      guard.lastSeen = { x: grate.x, y: grate.y };
    }
  }
  world.events.push('vent');
  return true;
}

// Advance the crawl one step. Returns true while the thief is inside
// the duct (or just climbed out), so the caller skips normal movement.
export function updateVent(world, dt) {
  const thief = world.thief;
  if (!thief.vent) return false;
  const vent = thief.vent;
  const target = vent.points[vent.i];
  const d = dist(thief.x, thief.y, target.x, target.y);
  const step = VENT.crawlSpeed * dt;
  if (d <= step) {
    thief.x = target.x;
    thief.y = target.y;
    vent.i += 1;
    if (vent.i >= vent.points.length) return exitVent(world);
  } else {
    thief.x += ((target.x - thief.x) / d) * step;
    thief.y += ((target.y - thief.y) / d) * step;
    thief.facing = Math.atan2(target.y - thief.y, target.x - thief.x);
  }
  return true;
}

export function drawVents(ctx, world) {
  const TAU = Math.PI * 2;
  const vents = world.vents;
  if (!vents) return;
  // The duct itself, a faint dashed line along the ceiling, so the
  // player can read where the shortcut goes before trying it.
  ctx.save();
  ctx.strokeStyle = 'rgba(89,214,255,0.30)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(vents.path[0].x, vents.path[0].y);
  for (let i = 1; i < vents.path.length; i++) ctx.lineTo(vents.path[i].x, vents.path[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const g of vents.grates) {
    ctx.fillStyle = '#14161f';
    ctx.beginPath();
    ctx.arc(g.x, g.y, 15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#59d6ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(89,214,255,0.8)';
    ctx.lineWidth = 2;
    for (const off of [-6, 0, 6]) {
      ctx.beginPath();
      ctx.moveTo(g.x - 9, g.y + off);
      ctx.lineTo(g.x + 9, g.y + off);
      ctx.stroke();
    }
    ctx.fillStyle = '#59d6ff';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VENT · E', g.x, g.y + 28);
  }
  if (world.thief.inVent) {
    ctx.fillStyle = '#59d6ff';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IN VENT', world.thief.x, world.thief.y - 22);
  }
  ctx.restore();
}
