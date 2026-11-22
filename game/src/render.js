// Painting: everything the player sees. The floor, the cones, the people and
// the HUD are drawn from the world state and nothing else, so a screenshot
// staged from the real rules is a frame of the real game.
import { CAMERA, FIELD, GUARD, HUD_HEIGHT, THIEF } from './config.js';

const TITLE_FONT = '700 44px Georgia, serif';
const HEADING_FONT = '700 20px Georgia, serif';
const BODY_FONT = '15px system-ui, sans-serif';
const SMALL_FONT = '12px system-ui, sans-serif';
const HUD_FONT = '700 15px system-ui, sans-serif';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  function transform() {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  }

  function drawCone(x, y, facing, range, halfAngle, color, edgeColor) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
    ctx.closePath();
    const gradient = ctx.createRadialGradient(x, y, 10, x, y, range);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(facing - halfAngle) * range, y + Math.sin(facing - halfAngle) * range);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(facing + halfAngle) * range, y + Math.sin(facing + halfAngle) * range);
    ctx.stroke();
  }

  function drawFloor(state) {
    ctx.fillStyle = '#17151f';
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, FIELD.height - HUD_HEIGHT);
    const tile = 80;
    for (let ty = HUD_HEIGHT; ty < FIELD.height; ty += tile) {
      for (let tx = 0; tx < FIELD.width; tx += tile) {
        const odd = ((tx / tile + ty / tile) % 2 + 2) % 2 === 0;
        ctx.fillStyle = odd ? '#1b1826' : '#191623';
        ctx.fillRect(tx, ty, tile, tile);
      }
    }
    // Warm pools of light under the ceiling lamps.
    for (const [lx, ly] of [[320, 200], [640, 420], [960, 200], [480, 620], [1080, 560]]) {
      const glow = ctx.createRadialGradient(lx, ly, 10, lx, ly, 190);
      glow.addColorStop(0, 'rgba(255, 214, 130, 0.10)');
      glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 190, ly - 190, 380, 380);
    }
    // Wall shadow along the top of the play area.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, HUD_HEIGHT, FIELD.width, 6);
  }

  function drawDressing(level) {
    for (const p of level.paintings) {
      ctx.fillStyle = '#3a2f1d';
      ctx.fillRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
      ctx.fillStyle = `hsl(${p.hue}, 42%, 42%)`;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // A simple scene inside the frame: a sun and a horizon.
      ctx.fillStyle = `hsl(${(p.hue + 40) % 360}, 60%, 68%)`;
      ctx.beginPath();
      ctx.arc(p.x + p.w * 0.7, p.y + p.h * 0.32, Math.min(p.w, p.h) * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsl(${p.hue}, 38%, 26%)`;
      ctx.fillRect(p.x, p.y + p.h * 0.62, p.w, p.h * 0.38);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(p.x, p.y, p.w, 10);
    }
    ctx.strokeStyle = '#8c2f39';
    ctx.lineWidth = 3;
    for (const r of level.ropes) {
      ctx.beginPath();
      ctx.moveTo(r.x1, r.y1);
      ctx.quadraticCurveTo((r.x1 + r.x2) / 2, Math.max(r.y1, r.y2) + 14, r.x2, r.y2);
      ctx.stroke();
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(r.x1, r.y1, 4, 0, Math.PI * 2);
      ctx.arc(r.x2, r.y2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSolid(s) {
    if (s.kind === 'pillar') {
      ctx.fillStyle = '#2c2838';
      ctx.fillRect(s.x - 3, s.y - 3, s.w + 6, s.h + 6);
      ctx.fillStyle = '#4a4360';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(s.x, s.y, 6, s.h);
      return;
    }
    if (s.kind === 'wall') {
      ctx.fillStyle = '#241f2e';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#3a3247';
      ctx.fillRect(s.x, s.y, s.w, 4);
      return;
    }
    // Display case: dark plinth, glass top, a glint, and its wing label.
    ctx.fillStyle = '#241d16';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = '#17130e';
    ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
    ctx.fillStyle = 'rgba(150, 200, 255, 0.13)';
    ctx.fillRect(s.x + 6, s.y + 6, s.w - 12, (s.h - 12) / 2);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    if (s.label && s.w >= 100) {
      ctx.fillStyle = '#c9a227';
      ctx.font = SMALL_FONT;
      ctx.textAlign = 'center';
      ctx.fillText(s.label, s.x + s.w / 2, s.y + s.h - 8);
    }
  }

  function drawVault(level, thief) {
    const v = level.vault;
    const glow = ctx.createRadialGradient(v.x, v.y, 4, v.x, v.y, 90);
    glow.addColorStop(0, 'rgba(120, 200, 255, 0.35)');
    glow.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(v.x - 90, v.y - 90, 180, 180);
    ctx.fillStyle = '#2c2438';
    ctx.fillRect(v.x - 26, v.y - 16, 52, 32);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(v.x - 26, v.y - 16, 52, 5);
    if (!thief.hasVault) {
      ctx.fillStyle = '#7fd4ff';
      ctx.beginPath();
      ctx.moveTo(v.x, v.y - 26);
      ctx.lineTo(v.x + 13, v.y - 8);
      ctx.lineTo(v.x, v.y + 8);
      ctx.lineTo(v.x - 13, v.y - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eaf7ff';
      ctx.beginPath();
      ctx.moveTo(v.x, v.y - 26);
      ctx.lineTo(v.x + 6, v.y - 8);
      ctx.lineTo(v.x, v.y - 2);
      ctx.lineTo(v.x - 6, v.y - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#bfe9ff';
      ctx.font = SMALL_FONT;
      ctx.textAlign = 'center';
      ctx.fillText('STAR SAPPHIRE', v.x, v.y - 34);
    }
  }

  function drawDoors(level) {
    const e = level.exit;
    ctx.fillStyle = '#123524';
    ctx.fillRect(e.x - 34, e.y - 10, 68, 20);
    ctx.fillStyle = '#2fbf71';
    ctx.font = HUD_FONT;
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', e.x, e.y + 5);
    const s = level.start;
    ctx.fillStyle = '#241f2e';
    ctx.fillRect(s.x - 30, s.y - 10, 60, 20);
    ctx.fillStyle = '#8d86a3';
    ctx.font = SMALL_FONT;
    ctx.fillText('SERVICE', s.x, s.y + 4);
  }

  function drawArtifacts(level) {
    for (const a of level.artifacts) {
      if (a.taken) continue;
      ctx.fillStyle = '#2c2438';
      ctx.beginPath();
      ctx.arc(a.x, a.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.arc(a.x, a.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#17151f';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(a.id === 'idol' ? 'I' : a.id === 'mask' ? 'M' : 'P', a.x, a.y + 5);
      ctx.fillStyle = '#d8c98a';
      ctx.font = SMALL_FONT;
      ctx.fillText(a.name, a.x, a.y - 22);
    }
  }

  function drawSmoke(smokes) {
    for (const s of smokes) {
      const alpha = Math.min(0.75, 0.35 + (s.timer / 6) * 0.4);
      ctx.fillStyle = `rgba(180, 180, 190, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(220, 220, 230, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(s.x - s.radius * 0.3, s.y - s.radius * 0.2, s.radius * 0.55, 0, Math.PI * 2);
      ctx.arc(s.x + s.radius * 0.35, s.y + s.radius * 0.25, s.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGuards(guards) {
    for (const g of guards) {
      const hot = g.alertness > 0.5;
      const color = hot ? 'rgba(255, 70, 55, 0.34)' : 'rgba(255, 205, 80, 0.30)';
      const edge = hot ? 'rgba(255, 70, 55, 0.75)' : 'rgba(255, 205, 80, 0.55)';
      drawCone(g.x, g.y, g.facing, GUARD.visionRange, GUARD.visionHalfAngle, color, edge);
    }
    for (const g of guards) {
      ctx.fillStyle = '#2e3a55';
      ctx.beginPath();
      ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = g.alertness > 0.5 ? '#ff4637' : '#7d8db0';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Cap brim shows the facing.
      ctx.strokeStyle = '#d8deea';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.facing) * (GUARD.radius + 6), g.y + Math.sin(g.facing) * (GUARD.radius + 6));
      ctx.stroke();
      // Alertness arc above the head.
      if (g.alertness > 0.05) {
        ctx.strokeStyle = g.alertness > 0.5 ? '#ff4637' : '#ffcd50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, GUARD.radius + 7, -Math.PI / 2, -Math.PI / 2 + g.alertness * Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#aeb8cc';
      ctx.font = SMALL_FONT;
      ctx.textAlign = 'center';
      ctx.fillText(g.name, g.x, g.y + GUARD.radius + 15);
      if (g.spotTimer > 0) {
        ctx.fillStyle = '#ff4637';
        ctx.font = HUD_FONT;
        ctx.fillText('SPOTTED!', g.x, g.y - GUARD.radius - 12);
      }
    }
  }

  function drawCameras(cameras) {
    for (const c of cameras) {
      if (c.disabledTimer <= 0) {
        drawCone(c.x, c.y, c.facing, CAMERA.visionRange, CAMERA.visionHalfAngle, 'rgba(255, 205, 80, 0.26)', 'rgba(255, 205, 80, 0.5)');
      }
    }
    for (const c of cameras) {
      const off = c.disabledTimer > 0;
      ctx.fillStyle = off ? '#3a3a3a' : '#20242e';
      ctx.fillRect(c.x - 9, c.y - 7, 18, 14);
      ctx.fillStyle = off ? '#555' : c.alertness > 0.5 ? '#ff4637' : '#ffcd50';
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(c.facing) * 10, c.y + Math.sin(c.facing) * 10, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (off) {
        ctx.fillStyle = '#9a9a9a';
        ctx.font = SMALL_FONT;
        ctx.textAlign = 'left';
        ctx.fillText('OFFLINE', c.x - 60, c.y - 12);
      }
    }
  }

  function drawThief(thief) {
    const r = thief.sneaking ? THIEF.radius - 3 : THIEF.radius;
    if (thief.sneaking) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(200, 200, 220, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(thief.x, thief.y, THIEF.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#101018';
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8e4d8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Mask stripe and the direction the thief faces.
    ctx.strokeStyle = '#7fd4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(thief.x, thief.y);
    ctx.lineTo(thief.x + Math.cos(thief.facing) * (r + 5), thief.y + Math.sin(thief.facing) * (r + 5));
    ctx.stroke();
    ctx.fillStyle = '#e8e4d8';
    ctx.font = SMALL_FONT;
    ctx.textAlign = 'center';
    ctx.fillText('WREN', thief.x, thief.y + r + 14);
  }

  function drawHud(state) {
    ctx.fillStyle = '#0e0c14';
    ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
    ctx.strokeStyle = '#2c2838';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, HUD_HEIGHT - 1);
    ctx.lineTo(FIELD.width, HUD_HEIGHT - 1);
    ctx.stroke();

    ctx.fillStyle = '#e8e4d8';
    ctx.font = HEADING_FONT;
    ctx.textAlign = 'left';
    ctx.fillText('THE MIDNIGHT VAULT', 16, 26);
    const objective = state.thief.hasVault
      ? 'Sapphire secured — get to the EXIT!'
      : 'Steal the Star Sapphire, then reach the EXIT';
    ctx.fillStyle = '#a49ec0';
    ctx.font = BODY_FONT;
    ctx.fillText(objective, 16, 52);

    // Alarm meter.
    const barX = 470;
    const barW = 320;
    const barY = 22;
    ctx.fillStyle = '#a49ec0';
    ctx.font = HUD_FONT;
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', barX, barY - 6);
    ctx.fillStyle = '#241f2e';
    ctx.fillRect(barX, barY, barW, 16);
    const ratio = state.alarm.value / 100;
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, '#2fbf71');
    grad.addColorStop(0.55, '#ffcd50');
    grad.addColorStop(1, '#ff4637');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, Math.max(0, barW * ratio), 16);
    ctx.strokeStyle = state.alarm.lockdown ? '#ff4637' : '#4a4360';
    ctx.lineWidth = state.alarm.lockdown ? 3 : 1.5;
    ctx.strokeRect(barX, barY, barW, 16);
    ctx.fillStyle = state.alarm.value > 60 ? '#ff8a7a' : '#d8d4e8';
    ctx.font = BODY_FONT;
    ctx.fillText(`${Math.round(state.alarm.value)}`, barX + barW + 10, barY + 13);
    if (state.alarm.lockdown) {
      ctx.fillStyle = '#ff4637';
      ctx.font = HUD_FONT;
      ctx.fillText('LOCKDOWN', barX + barW + 48, barY + 13);
    }

    // Score, time, loot and tools on the right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8e4d8';
    ctx.font = HUD_FONT;
    const minutes = Math.floor(state.time / 60);
    const seconds = Math.floor(state.time % 60).toString().padStart(2, '0');
    ctx.fillText(`SCORE ${state.score}`, 1264, 26);
    ctx.fillStyle = '#a49ec0';
    ctx.font = BODY_FONT;
    ctx.fillText(`${minutes}:${seconds}`, 1264, 52);
    ctx.fillText(
      `◆ ${state.thief.artifacts}/3   Smoke ×${state.thief.smoke}   EMP ×${state.thief.emp}`,
      1080,
      26,
    );
    ctx.textAlign = 'left';
  }

  function drawOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 7, 12, 0.82)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = accent;
    ctx.font = TITLE_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, 250);
    ctx.fillStyle = '#d8d4e8';
    ctx.font = BODY_FONT;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, 300 + i * 28);
    });
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best) {
    transform();
    ctx.clearRect(-50, -50, FIELD.width + 100, FIELD.height + 100);
    ctx.fillStyle = '#0b0a12';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawFloor(state);
    drawDressing(state.level);
    drawCameras(state.cameras);
    drawGuards(state.guards);
    drawSmoke(state.smokes);
    for (const s of state.solids) drawSolid(s);
    drawVault(state.level, state.thief);
    drawDoors(state.level);
    drawArtifacts(state.level);
    drawThief(state.thief);
    drawHud(state);

    if (screen === 'title') {
      drawOverlay('THE MIDNIGHT VAULT', [
        'The Star Sapphire sleeps in the gallery vault. Three guards walk the floor,',
        'two cameras sweep the room, and one alarm stands between you and the door.',
        '',
        'Move: WASD or arrows — hold Shift to sneak — click to walk somewhere',
        '1: smoke pellet (blocks sight)    2: EMP pulse (kills cameras nearby)',
        'Grab the sapphire, take what else you can carry, and reach the EXIT.',
        '',
        'Press Enter to begin.',
        best > 0 ? `Best getaway so far: ${best}` : 'No getaway yet. Make this one clean.',
      ], '#e8c85a');
    } else if (screen === 'paused') {
      drawOverlay('PAUSED', ['The guards hold their posts. The cameras keep sweeping.', '', 'Press P to keep moving.'], '#d8d4e8');
    } else if (screen === 'won') {
      const b = state.breakdown;
      drawOverlay('CLEAN GETAWAY', [
        `The Star Sapphire is yours. Score: ${state.finalScore}`,
        '',
        `Loot ${b.loot}  ·  Time bonus ${b.timeBonus}  ·  Quiet bonus ${b.cleanBonus}`,
        `Time ${Math.floor(state.time / 60)}:${Math.floor(state.time % 60).toString().padStart(2, '0')}  ·  Peak alarm ${Math.round(state.alarm.peak)}`,
        '',
        'Press R to run it again — faster, quieter.',
      ], '#2fbf71');
    } else if (screen === 'caught') {
      drawOverlay('CAUGHT', [
        `${state.caughtBy} got a hand on you under the gallery lights.`,
        `Score ${state.score} — the sapphire stays in its case tonight.`,
        '',
        'Press R to try the gallery again.',
      ], '#ff4637');
    }
  }

  return { draw };
}
