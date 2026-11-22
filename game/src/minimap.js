// Minimap: the whole gallery shrunk into the corner, so the player can
// read the room at a glance — where the guards are, which loot is left,
// where the exit waits. It sits in the east wing below the vault room,
// on empty floor, so it never covers the sapphire, the thief, or a
// label. Drawn over the room, translucent so the floor shows through.

import { VIEW } from './config.js';

const X = 1096;
const Y = 250;
const W = 168;
const H = 94;

export function drawMinimap(ctx, world) {
  const sx = W / VIEW.width;
  const sy = H / VIEW.height;
  ctx.save();
  ctx.fillStyle = 'rgba(8,9,14,0.78)';
  ctx.fillRect(X, Y, W, H);
  ctx.strokeStyle = 'rgba(201,162,75,0.8)';
  ctx.lineWidth = 1;
  ctx.strokeRect(X + 0.5, Y + 0.5, W, H);

  const px = (x) => X + x * sx;
  const py = (y) => Y + y * sy;

  // Vault room tint, then walls.
  const v = world.level.vault;
  ctx.fillStyle = 'rgba(232,182,76,0.25)';
  ctx.fillRect(px(v.x), py(v.y), v.w * sx, v.h * sy);
  ctx.fillStyle = '#3a3f52';
  for (const w of world.level.walls) {
    ctx.fillRect(px(w.x), py(w.y), Math.max(1, w.w * sx), Math.max(1, w.h * sy));
  }

  // Exit, loot, smoke, cameras, guards, thief — in that order, so the
  // thief's dot always sits on top.
  const e = world.level.exit;
  ctx.fillStyle = '#35c759';
  ctx.beginPath();
  ctx.arc(px(e.x), py(e.y), 3.5, 0, Math.PI * 2);
  ctx.fill();

  for (const item of world.level.loot) {
    if (item.taken) continue;
    ctx.fillStyle = item.kind === 'sapphire' ? '#7fd4ff' : '#e8b64c';
    ctx.beginPath();
    ctx.arc(px(item.x), py(item.y), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of world.smokes) {
    ctx.fillStyle = 'rgba(200,200,210,0.5)';
    ctx.beginPath();
    ctx.arc(px(s.x), py(s.y), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cam of world.cameras) {
    ctx.fillStyle = '#e07b39';
    ctx.beginPath();
    ctx.arc(px(cam.x), py(cam.y), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Vent grates, cyan, so the shortcut reads on the map too.
  if (world.vents) {
    for (const g of world.vents.grates) {
      ctx.fillStyle = '#59d6ff';
      ctx.beginPath();
      ctx.arc(px(g.x), py(g.y), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const guard of world.guards) {
    ctx.fillStyle = guard.color;
    ctx.beginPath();
    ctx.arc(px(guard.pos.x), py(guard.pos.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = world.thief;
  ctx.fillStyle = '#f2efe6';
  ctx.beginPath();
  ctx.arc(px(t.x), py(t.y), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f2efe6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(px(t.x), py(t.y), 5.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(154,160,180,0.9)';
  ctx.font = '700 9px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', X + 5, Y + 11);
  ctx.restore();
}
