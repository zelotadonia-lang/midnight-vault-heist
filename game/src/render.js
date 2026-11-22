// Rendering: everything the player sees, drawn on one canvas. The room
// is drawn first (floor, vault tint, walls, loot, exit), then the moving
// pieces (cones, cameras, guards, thief, smoke), then the HUD bar and the
// screen overlays. No images, no fonts from the network: plain canvas
// shapes and the system font stack.

import { ALARM, COLORS, SCORE, THIEF, VIEW } from './config.js';
import { makeRng } from './random.js';
import { cameraIsDown } from './cameras.js';
import { scoreNow } from './world.js';
import { drawFx } from './effects.js';
import { drawDecoys } from './decoy.js';
import { drawBanter } from './banter.js';
import { drawHint } from './hints.js';
import { drawMinimap } from './minimap.js';
import { drawVents } from './vents.js';
import { SIDEVAULT_ROOM } from './sidevault.js';
import { PAR, parBonusFor, quietBonusFor } from './partime.js';
import { gradeRun } from './grade.js';

const TAU = Math.PI * 2;

function speckle(ctx, rng, x, y, w, h, count, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const px = x + rng() * w;
    const py = y + rng() * h;
    ctx.fillRect(px, py, 2, 2);
  }
}

function drawFloor(ctx, world) {
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Parquet tiles: alternating shades in a loose checker.
  const tile = 64;
  for (let ty = 0; ty < VIEW.height / tile; ty++) {
    for (let tx = 0; tx < VIEW.width / tile; tx++) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = COLORS.floorAlt;
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
  }
  // The vault room gets a warmer, gold-tinted floor.
  const v = world.level.vault;
  ctx.fillStyle = COLORS.vaultFloor;
  ctx.fillRect(v.x, v.y, v.w, v.h);
  // The side vault, south-east, gets the same warm tint, darker: the
  // room holds the crown, and the tint says so before the label does.
  ctx.fillStyle = 'rgba(42,36,23,0.85)';
  ctx.fillRect(SIDEVAULT_ROOM.x, SIDEVAULT_ROOM.y, SIDEVAULT_ROOM.w, SIDEVAULT_ROOM.h);
  // Seeded speckle so the floor reads as stone, not flat color.
  const rng = makeRng(world.seed * 7919 + 13);
  speckle(ctx, rng, 0, 0, VIEW.width, VIEW.height, 260, 'rgba(255,255,255,0.03)');
  speckle(ctx, rng, v.x, v.y, v.w, v.h, 60, 'rgba(232,182,76,0.08)');
  // Room labels, small and out of the way.
  ctx.fillStyle = 'rgba(154,160,180,0.5)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WEST GALLERY', 36, 74);
  ctx.fillText('CENTRAL HALL', 470, 74);
  ctx.fillText('VAULT ANTECHAMBER', 920, 74);
  ctx.fillText('EAST WING', 1000, 676);
}

function drawWalls(ctx, world) {
  for (const w of world.level.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallTrim;
    if (w.h <= 16) ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
    else ctx.fillRect(w.x + w.w - 3, w.y, 3, w.h);
  }
}

function drawExit(ctx, world) {
  const e = world.level.exit;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = 'rgba(53,199,89,0.18)';
  ctx.beginPath();
  ctx.arc(0, 0, e.radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = COLORS.exit;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, e.radius - 2, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = COLORS.exit;
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', 0, 6);
  ctx.restore();
}

function drawLoot(ctx, world) {
  for (const item of world.level.loot) {
    if (item.taken) continue;
    const { x, y } = item;
    // Pedestal.
    ctx.fillStyle = '#2c2f3d';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,75,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // A soft glow so loot reads from across the room.
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 34);
    glow.addColorStop(0, 'rgba(232,182,76,0.35)');
    glow.addColorStop(1, 'rgba(232,182,76,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 34, 0, TAU);
    ctx.fill();
    ctx.fillStyle = item.kind === 'sapphire' ? '#7fd4ff' : COLORS.loot;
    ctx.strokeStyle = '#fff8e0';
    ctx.lineWidth = 1.5;
    if (item.kind === 'sapphire') {
      ctx.beginPath();
      ctx.moveTo(x, y - 13);
      ctx.lineTo(x + 11, y);
      ctx.lineTo(x, y + 13);
      ctx.lineTo(x - 11, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.kind === 'idol') {
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x + 9, y + 10);
      ctx.lineTo(x - 9, y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.kind === 'mask') {
      ctx.fillStyle = '#4ecb71';
      ctx.fillRect(x - 11, y - 8, 22, 16);
      ctx.fillStyle = '#1b1d26';
      ctx.fillRect(x - 7, y - 3, 5, 4);
      ctx.fillRect(x + 2, y - 3, 5, 4);
    } else if (item.kind === 'crown') {
      // The Crown Jewels: a small gold crown, three points.
      ctx.beginPath();
      ctx.moveTo(x - 12, y + 8);
      ctx.lineTo(x - 12, y - 6);
      ctx.lineTo(x - 6, y + 2);
      ctx.lineTo(x, y - 9);
      ctx.lineTo(x + 6, y + 2);
      ctx.lineTo(x + 12, y - 6);
      ctx.lineTo(x + 12, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(x - 6, y - 2, 2, 0, TAU);
      ctx.arc(x, y - 4, 2, 0, TAU);
      ctx.arc(x + 6, y - 2, 2, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, TAU);
      ctx.fillStyle = '#2b2b33';
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(x - 3, y - 4, 3, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.name.toUpperCase(), x, y + 34);
  }
}

function drawCone(ctx, x, y, angle, range, halfAngle, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
}

function drawCameras(ctx, world) {
  for (const cam of world.cameras) {
    const down = cameraIsDown(cam, world.time);
    // A short stalk joins a camera to the wall it hangs from.
    if (cam.y < 80) {
      ctx.strokeStyle = COLORS.wall;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cam.x, 16);
      ctx.lineTo(cam.x, cam.y - 6);
      ctx.stroke();
    }
    if (!down) {
      drawCone(ctx, cam.x, cam.y, cam.angle, cam.range, 0.46, COLORS.cameraCone);
    }
    ctx.fillStyle = down ? '#5a5f70' : COLORS.camera;
    ctx.fillRect(cam.x - 9, cam.y - 7, 18, 14);
    ctx.fillStyle = down ? '#8a8f9e' : '#ffd9a8';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 10, cam.y + Math.sin(cam.angle) * 10, 3, 0, TAU);
    ctx.fill();
    if (down) {
      ctx.fillStyle = '#c9cdd8';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('OFFLINE', cam.x - 14, cam.y + 4);
    }
  }
}

function drawGuards(ctx, world) {
  for (const guard of world.guards) {
    const color = guard.alert > 0.6 ? COLORS.coneAlert : COLORS.cone;
    drawCone(ctx, guard.pos.x, guard.pos.y, guard.facing, 225, 0.51, color);
    // Body.
    ctx.fillStyle = guard.color;
    ctx.beginPath();
    ctx.arc(guard.pos.x, guard.pos.y, 15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.pos.x, guard.pos.y);
    ctx.lineTo(
      guard.pos.x + Math.cos(guard.facing) * 20,
      guard.pos.y + Math.sin(guard.facing) * 20,
    );
    ctx.stroke();
    // Name and alert pips.
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.name.toUpperCase(), guard.pos.x, guard.pos.y - 24);
    if (guard.alert > 0.05) {
      ctx.fillStyle = guard.alert > 0.6 ? '#e5484d' : '#e8b64c';
      ctx.fillRect(guard.pos.x - 14, guard.pos.y + 20, 28 * guard.alert, 4);
    }
    if (guard.hunting) {
      ctx.fillStyle = '#e5484d';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('!', guard.pos.x, guard.pos.y - 38);
    }
  }
}

function drawThief(ctx, world) {
  const t = world.thief;
  // Click destination marker.
  if (t.clickTarget) {
    ctx.strokeStyle = 'rgba(232,228,216,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.clickTarget.x, t.clickTarget.y, 8, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(t.clickTarget.x - 12, t.clickTarget.y);
    ctx.lineTo(t.clickTarget.x + 12, t.clickTarget.y);
    ctx.moveTo(t.clickTarget.x, t.clickTarget.y - 12);
    ctx.lineTo(t.clickTarget.x, t.clickTarget.y + 12);
    ctx.stroke();
  }
  // Hooded figure: dark cloak, pale face, direction tick.
  ctx.fillStyle = '#23232e';
  ctx.beginPath();
  ctx.arc(t.x, t.y, THIEF.radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = COLORS.thief;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(t.x + Math.cos(t.facing) * 5, t.y + Math.sin(t.facing) * 5, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(t.sneaking ? 'WREN · SNEAKING' : 'WREN', t.x, t.y - 22);
}

function drawSmoke(ctx, world) {
  for (const s of world.smokes) {
    const fade = Math.max(0, Math.min(1, (s.until - world.time) / 1.2));
    ctx.fillStyle = `rgba(200,200,210,${0.5 * fade})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(220,220,230,${0.4 * fade})`;
    ctx.beginPath();
    ctx.arc(s.x - 30, s.y + 18, s.r * 0.55, 0, TAU);
    ctx.arc(s.x + 34, s.y - 14, s.r * 0.5, 0, TAU);
    ctx.fill();
  }
}

function drawHud(ctx, world) {
  // Top bar.
  ctx.fillStyle = 'rgba(10,11,16,0.82)';
  ctx.fillRect(0, 0, VIEW.width, 44);
  ctx.fillStyle = COLORS.wallTrim;
  ctx.fillRect(0, 44, VIEW.width, 2);

  // Alarm meter.
  ctx.fillStyle = COLORS.dim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', 18, 28);
  const ax = 84;
  const aw = 260;
  ctx.fillStyle = '#2c2f3d';
  ctx.fillRect(ax, 14, aw, 18);
  const frac = world.alarm.level / 100;
  ctx.fillStyle =
    world.alarm.level >= 100 ? '#e5484d' : world.alarm.level >= 60 ? '#e07b39' : '#e8b64c';
  ctx.fillRect(ax, 14, aw * frac, 18);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax, 14, aw, 18);
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(`${Math.round(world.alarm.level)}`, ax + aw + 10, 28);
  if (world.time < world.lockdownUntil) {
    ctx.fillStyle = '#e5484d';
    ctx.fillText('LOCKDOWN', ax + aw + 56, 28);
  }

  // Score and loot.
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 15px system-ui, sans-serif';
  const shown = world.screen === 'won' ? scoreNow(world) : world.score;
  ctx.fillText(`SCORE ${shown}`, 640, 28);
  ctx.fillStyle = COLORS.loot;
  ctx.fillText(`LOOT ${world.lootTaken}/${world.level.loot.length}`, 800, 28);

  // Tools.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.text;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(
    `[1] SMOKE ×${world.thief.smokeCharges}  [2] EMP ×${world.thief.empCharges}  [3] DECOY ×${world.thief.decoyCharges}`,
    1090,
    28,
  );
  // Timer, with the par time beside it: the clock is part of the score.
  ctx.fillText(`${Math.floor(world.time)}s / PAR ${PAR.seconds}s`, 1252, 28);

  // Objective line at the bottom.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(242,239,230,0.85)';
  ctx.font = '600 13px system-ui, sans-serif';
  const goal = world.sapphireTaken
    ? 'Sapphire secured — reach the green EXIT'
    : 'Steal the Star Sapphire from the vault, top right';
  ctx.fillText(goal, 640, 706);
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,9,14,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const pw = 620;
  const ph = 110 + lines.length * 30;
  const px = (VIEW.width - pw) / 2;
  const py = (VIEW.height - ph) / 2;
  ctx.fillStyle = '#171923';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = accent;
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, py + 58);
  ctx.fillStyle = COLORS.text;
  ctx.font = '400 16px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW.width / 2, py + 100 + i * 30);
  });
}

function drawTitle(ctx, world) {
  panel(
    ctx,
    'THE MIDNIGHT VAULT',
    [
      'Wren slips into the museum after closing. Take the Star Sapphire,',
      'pocket the three artifacts if you dare, and leave by the green EXIT.',
      '',
      'WASD or arrows to move · Click to walk · Shift to sneak',
      '1 smoke pellet · 2 EMP pulse · 3 holo-decoy · E vent crawl',
      'Guards remember where they saw you,',
      'a loud alarm sends one to check the vault',
      'The Crown Jewels wait in the side vault, watched by their own camera',
      'Beat par 45s for a bonus · a clean run earns a grade',
      '',
      'Click or press Enter to begin',
    ],
    COLORS.loot,
  );
  if (world.best > 0) {
    ctx.fillStyle = COLORS.loot;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Best getaway: ${world.best}`, VIEW.width / 2, VIEW.height / 2 + 190);
  }
}

function drawPaused(ctx) {
  panel(ctx, 'PAUSED', ['The guards wait. The vault does not.', '', 'Press P or click to keep going'], COLORS.dim);
}

function drawWon(ctx, world) {
  const elapsed = Math.round(world.wonAt);
  const timeBonus = Math.max(0, SCORE.timeBase - SCORE.timeRate * elapsed);
  const par = parBonusFor(elapsed);
  const quiet = quietBonusFor(world.alarm.peak);
  const grade = gradeRun(world);
  panel(
    ctx,
    'CLEAN GETAWAY',
    [
      `Loot ${world.score}  ·  time bonus ${timeBonus}  ·  par bonus ${par}  ·  quiet bonus ${quiet}`,
      `Final score ${scoreNow(world)} in ${elapsed}s — peak alarm ${Math.round(world.alarm.peak)}`,
      '',
      ...grade.lines,
      '',
      `Best getaway: ${Math.max(world.best, scoreNow(world))}`,
      '',
      'Press Enter to play again',
    ],
    COLORS.exit,
  );
}

function drawCaught(ctx, world) {
  const grade = gradeRun(world);
  panel(
    ctx,
    'CAUGHT',
    [
      `${world.caughtBy} caught Wren in the gallery.`,
      `Score ${world.score} · loot ${world.lootTaken}/${world.level.loot.length} · alarm peaked at ${Math.round(world.alarm.peak)}`,
      '',
      ...grade.lines,
      '',
      'Press Enter to try again',
    ],
    '#e5484d',
  );
}

export function render(ctx, world) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawFloor(ctx, world);
  drawWalls(ctx, world);
  drawVents(ctx, world);
  drawExit(ctx, world);
  drawLoot(ctx, world);
  drawCameras(ctx, world);
  drawGuards(ctx, world);
  drawSmoke(ctx, world);
  drawDecoys(ctx, world);
  drawFx(ctx, world);
  drawThief(ctx, world);
  drawBanter(ctx, world);
  drawHud(ctx, world);
  drawMinimap(ctx, world);
  drawHint(ctx, world);
  if (world.screen === 'title') drawTitle(ctx, world);
  else if (world.screen === 'paused') drawPaused(ctx);
  else if (world.screen === 'won') drawWon(ctx, world);
  else if (world.screen === 'caught') drawCaught(ctx, world);
}
